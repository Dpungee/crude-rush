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

/**
 * Get the staking production multiplier for a wallet.
 * Returns cached data if fresh, otherwise fetches from chain and updates cache.
 */
export async function getStakingInfo(walletAddress: string): Promise<StakingInfo> {
  const supabase = getServiceSupabase()

  // Check cache
  const { data: cached } = await supabase
    .from('staking_cache')
    .select('staked_amount, multiplier, updated_at')
    .eq('wallet_address', walletAddress)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime()
    if (age < CACHE_TTL_MS) {
      return {
        stakedAmount: BigInt(cached.staked_amount),
        multiplier: cached.multiplier,
        cachedAt: cached.updated_at,
      }
    }
  }

  // Cache miss or stale — fetch from chain
  const stakedAmount = await fetchStakedAmountOnChain(walletAddress)
  const multiplier = stakedAmountToMultiplier(stakedAmount)
  const now = new Date().toISOString()

  await supabase.from('staking_cache').upsert(
    {
      wallet_address: walletAddress,
      staked_amount: stakedAmount.toString(),
      multiplier,
      updated_at: now,
    },
    { onConflict: 'wallet_address' }
  )

  return { stakedAmount, multiplier, cachedAt: now }
}
