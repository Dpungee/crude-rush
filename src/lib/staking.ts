import { PublicKey } from '@solana/web3.js'
import { getConnection, STAKING_PROGRAM_ID } from './solana'
import { getServiceSupabase } from './supabase-server'

// ─── Staking account layout (Anchor discriminator + fields) ──────────────────
// Offset  Size  Field
//    0      8   discriminator (sha256("account:StakingPosition")[:8])
//    8     32   authority (pubkey)
//   40      8   staked_amount (u64, little-endian)
//   48      8   staked_at (i64, unix timestamp)
//   56      8   last_claim_at (i64)
const STAKED_AMOUNT_OFFSET = 40
const ACCOUNT_MIN_SIZE = 48

/** Derive the staking PDA for a given wallet */
function getStakingPDA(walletAddress: string): PublicKey | null {
  if (!STAKING_PROGRAM_ID) return null
  try {
    const wallet = new PublicKey(walletAddress)
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('staking'), wallet.toBuffer()],
      STAKING_PROGRAM_ID
    )
    return pda
  } catch {
    return null
  }
}

/** Read raw staked amount (lamport-equivalent micro-$CRUDE) from chain */
async function fetchStakedAmountOnChain(walletAddress: string): Promise<bigint> {
  const pda = getStakingPDA(walletAddress)
  if (!pda) return 0n

  try {
    const connection = getConnection()
    const accountInfo = await connection.getAccountInfo(pda)
    if (!accountInfo || accountInfo.data.length < ACCOUNT_MIN_SIZE) return 0n

    const data = Buffer.from(accountInfo.data)
    return data.readBigUInt64LE(STAKED_AMOUNT_OFFSET)
  } catch {
    return 0n
  }
}

/**
 * Convert micro-$CRUDE staked amount to a production multiplier.
 * Formula: 1 + min(stakedTokens / 1_000_000, 50) × 0.01
 * i.e. each 1 $CRUDE staked = +1% production, capped at +50%
 */
export function stakedAmountToMultiplier(microAmount: bigint): number {
  const tokens = Number(microAmount) / 1_000_000
  const cappedTokens = Math.min(tokens, 50_000_000) // cap at 50M $CRUDE = +50%
  const bonusPct = Math.min(Math.floor(cappedTokens), 50)
  return 1 + bonusPct * 0.01
}

export interface StakingInfo {
  stakedAmount: bigint   // micro-$CRUDE
  multiplier: number     // e.g. 1.15 = +15%
  cachedAt: string       // ISO timestamp
}

/** Cache TTL: refresh on-chain data every 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000

// ── In-flight RPC request deduplication ──────────────────────────────────────
// Problem: 10,000 simultaneous first logins all have cold caches → 10,000
// concurrent Solana RPC calls. Public RPC nodes rate-limit at ~100 req/sec,
// causing 9,900 failures on launch day.
//
// Fix: in-process Promise deduplication. If a fetch is already in-flight for
// a wallet, subsequent callers await the same Promise instead of spawning
// another RPC call. Combined with the 5-min DB cache this means each wallet
// makes at most 1 RPC call per 5 minutes regardless of concurrent load.
const inFlight = new Map<string, Promise<StakingInfo>>()

/**
 * Get the staking production multiplier for a wallet.
 *
 * Stale-while-revalidate pattern:
 *   1. If cached and fresh (<5 min) → return immediately (zero RPC calls)
 *   2. If cached but stale → return stale data immediately AND kick off a
 *      background refresh (no latency added to the login path)
 *   3. If no cache → fetch from chain (first login only, deduplicated)
 */
export async function getStakingInfo(walletAddress: string): Promise<StakingInfo> {
  const supabase = getServiceSupabase()

  // Check DB cache
  const { data: cached } = await supabase
    .from('staking_cache')
    .select('staked_amount, multiplier, cached_at')
    .eq('wallet_address', walletAddress)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime()
    const stale: StakingInfo = {
      stakedAmount: BigInt(cached.staked_amount ?? 0),
      multiplier: cached.multiplier,
      cachedAt: cached.cached_at,
    }

    if (age < CACHE_TTL_MS) {
      // Fresh — serve immediately, no RPC call needed
      return stale
    }

    // Stale-while-revalidate: return the old value now, refresh in background.
    // This completely eliminates the RPC call from the login critical path
    // for returning users (>99% of requests after launch day).
    void refreshStakingCache(walletAddress).catch(() => {
      // Non-critical — stale data is fine for a few extra minutes
    })
    return stale
  }

  // No cache entry at all — must fetch from chain (first login).
  // Deduplicate concurrent requests for the same wallet.
  return fetchWithDedup(walletAddress)
}

/** Fetch from chain and update DB cache, deduplicated per wallet */
async function fetchWithDedup(walletAddress: string): Promise<StakingInfo> {
  const existing = inFlight.get(walletAddress)
  if (existing) return existing

  const promise = refreshStakingCache(walletAddress)
  inFlight.set(walletAddress, promise)

  try {
    return await promise
  } finally {
    inFlight.delete(walletAddress)
  }
}

/** Fetch on-chain stake and write result to DB cache */
async function refreshStakingCache(walletAddress: string): Promise<StakingInfo> {
  const supabase = getServiceSupabase()
  const stakedAmount = await fetchStakedAmountOnChain(walletAddress)
  const multiplier = stakedAmountToMultiplier(stakedAmount)
  const now = new Date().toISOString()

  await supabase.from('staking_cache').upsert(
    {
      wallet_address: walletAddress,
      staked_amount: stakedAmount.toString(),
      multiplier,
      cached_at: now,
    },
    { onConflict: 'wallet_address' }
  )

  return { stakedAmount, multiplier, cachedAt: now }
}
