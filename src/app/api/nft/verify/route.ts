import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getNftInfo } from '@/lib/nft'

/**
 * GET /api/nft/verify
 * Returns all NFT land deed bonuses for the authenticated player.
 *
 * Response:
 *   { bonuses: NftPlotBonus[], cachedAt: string }
 *
 * Each bonus:
 *   { plotX, plotY, productionBonus, storageBonus, rarity }
 *
 * Result is cached server-side for 10 minutes.
 * If the player holds no Land Deed NFTs, bonuses is an empty array.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const info = await getNftInfo(walletAddress)
    return NextResponse.json(info)
  } catch (err) {
    console.error('[nft/verify] Error:', err)
    // Non-fatal — return empty bonuses so game still loads
    return NextResponse.json({ bonuses: [], cachedAt: null })
  }
}

/**
 * POST /api/nft/verify
 * Force-refresh the NFT cache for the authenticated player.
 * Use after the player confirms they've purchased/received a new Land Deed.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const supabase = (await import('@/lib/supabase-server')).getServiceSupabase()
    // Invalidate cache by deleting the row — next GET will re-fetch from chain
    await supabase.from('nft_cache').delete().eq('wallet_address', walletAddress)

    const info = await getNftInfo(walletAddress)
    return NextResponse.json({ ...info, refreshed: true })
  } catch (err) {
    console.error('[nft/verify POST] Error:', err)
    return NextResponse.json({ error: 'Failed to refresh NFT cache' }, { status: 500 })
  }
}
