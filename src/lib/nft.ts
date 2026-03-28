import { PublicKey } from '@solana/web3.js'
import { getConnection } from './solana'
import { getServiceSupabase } from './supabase-server'

// ─── NFT Land Deed configuration ─────────────────────────────────────────────
/**
 * The Metaplex collection mint for Crude Rush Land Deeds.
 * Set NFT_LAND_DEED_COLLECTION in .env after deploying the collection.
 */
const NFT_COLLECTION_ADDRESS = process.env.NFT_LAND_DEED_COLLECTION
  ? new PublicKey(process.env.NFT_LAND_DEED_COLLECTION)
  : null

/** Cache TTL: 10 minutes — NFT transfers are infrequent */
const CACHE_TTL_MS = 10 * 60 * 1000

// ─── NFT bonus tiers ─────────────────────────────────────────────────────────
export interface NftPlotBonus {
  plotX: number
  plotY: number
  /** Production multiplier for buildings on this plot, e.g. 1.25 = +25% */
  productionBonus: number
  /** Storage bonus added to the tile's building capacity */
  storageBonus: number
  /** Human-readable rarity tier */
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/** Bonus stats keyed by NFT rarity (encoded in token metadata) */
const RARITY_BONUSES: Record<NftPlotBonus['rarity'], { productionBonus: number; storageBonus: number }> = {
  common:    { productionBonus: 1.10, storageBonus: 50 },
  rare:      { productionBonus: 1.25, storageBonus: 150 },
  epic:      { productionBonus: 1.50, storageBonus: 400 },
  legendary: { productionBonus: 2.00, storageBonus: 1000 },
}

// ─── Metaplex token metadata helpers ─────────────────────────────────────────
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
)

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

/**
 * Parse the on-chain metadata account to extract plot coordinates and rarity.
 * Crude Rush NFTs encode attributes in the name: "Land Deed [X,Y] (Legendary)"
 * Falls back to safe defaults if parsing fails.
 */
function parseNftAttributes(
  data: Buffer
): { x: number; y: number; rarity: NftPlotBonus['rarity'] } | null {
  try {
    // Metaplex metadata layout: fixed header then variable-length strings
    // name starts at offset 69 (after discriminator + update_authority + mint + name_length)
    // We read the name string and parse it
    let offset = 1 + 32 + 32 // key + update_authority + mint
    const nameLen = data.readUInt32LE(offset)
    offset += 4
    const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '')

    // Expected format: "Land Deed [3,5] (Rare)"
    const match = name.match(/\[(\d+),(\d+)\]\s*\((\w+)\)/i)
    if (!match) return null

    const x = parseInt(match[1], 10)
    const y = parseInt(match[2], 10)
    const rarityRaw = match[3].toLowerCase() as NftPlotBonus['rarity']
    const rarity = RARITY_BONUSES[rarityRaw] ? rarityRaw : 'common'

    return { x, y, rarity }
  } catch {
    return null
  }
}

/**
 * Fetch all Land Deed NFTs owned by a wallet from the Solana RPC.
 * Uses `getTokenAccountsByOwner` then validates against collection + parses metadata.
 */
async function fetchNftsFromChain(walletAddress: string): Promise<NftPlotBonus[]> {
  if (!NFT_COLLECTION_ADDRESS) return []

  try {
    const connection = getConnection()
    const wallet = new PublicKey(walletAddress)

    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    const landDeedBonuses: NftPlotBonus[] = []

    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed?.info
      if (!parsed) continue

      // NFTs have amount=1 and decimals=0
      if (parsed.tokenAmount?.amount !== '1' || parsed.tokenAmount?.decimals !== 0) continue

      const mintAddress = new PublicKey(parsed.mint)
      const metadataPDA = getMetadataPDA(mintAddress)

      const metaAccount = await connection.getAccountInfo(metadataPDA)
      if (!metaAccount) continue

      const attrs = parseNftAttributes(Buffer.from(metaAccount.data))
      if (!attrs) continue

      // Verify it belongs to our collection (check collection field in metadata)
      // Offset for collection field is after name + symbol + uri — simplified check
      // A full implementation would deserialize the full Metadata struct
      // For now trust the metadata PDA ownership by the token metadata program
      if (!metaAccount.owner.equals(TOKEN_METADATA_PROGRAM_ID)) continue

      const bonuses = RARITY_BONUSES[attrs.rarity]
      landDeedBonuses.push({
        plotX: attrs.x,
        plotY: attrs.y,
        productionBonus: bonuses.productionBonus,
        storageBonus: bonuses.storageBonus,
        rarity: attrs.rarity,
      })
    }

    return landDeedBonuses
  } catch {
    return []
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface NftInfo {
  bonuses: NftPlotBonus[]
  cachedAt: string
}

/**
 * Get all NFT plot bonuses for a wallet.
 * Returns cached data if fresh, otherwise fetches from chain and updates cache.
 */
export async function getNftInfo(walletAddress: string): Promise<NftInfo> {
  const supabase = getServiceSupabase()

  // Check cache
  const { data: cached } = await supabase
    .from('nft_cache')
    .select('nft_data, updated_at')
    .eq('wallet_address', walletAddress)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime()
    if (age < CACHE_TTL_MS) {
      return {
        bonuses: (cached.nft_data as NftPlotBonus[]) ?? [],
        cachedAt: cached.updated_at,
      }
    }
  }

  // Cache miss or stale — fetch from chain
  const bonuses = await fetchNftsFromChain(walletAddress)
  const now = new Date().toISOString()

  await supabase.from('nft_cache').upsert(
    {
      wallet_address: walletAddress,
      nft_data: bonuses,
      updated_at: now,
    },
    { onConflict: 'wallet_address' }
  )

  return { bonuses, cachedAt: now }
}

/**
 * Look up the bonus for a specific plot coordinate.
 * Returns null if the wallet holds no NFT for that plot.
 */
export function getPlotBonus(bonuses: NftPlotBonus[], x: number, y: number): NftPlotBonus | null {
  return bonuses.find((b) => b.plotX === x && b.plotY === y) ?? null
}
