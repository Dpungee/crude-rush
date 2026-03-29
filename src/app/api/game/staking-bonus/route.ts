import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { STAKING_PROGRAM_ID } from '@/lib/solana'

/**
 * GET /api/game/staking-bonus
 * Returns the staking production multiplier for the authenticated player.
 * Result is cached server-side for 5 minutes.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  // Staking requires both Supabase (for cache) and the staking program
  if (!isSupabaseConfigured() || !STAKING_PROGRAM_ID) {
    return NextResponse.json({ stakedAmount: '0', multiplier: 1.0, cachedAt: null })
  }

  try {
    // Dynamic import to avoid evaluating staking.ts at build time when Supabase isn't set
    const { getStakingInfo } = await import('@/lib/staking')
    const info = await getStakingInfo(walletAddress)

    return NextResponse.json({
      stakedAmount: info.stakedAmount.toString(),
      multiplier: info.multiplier,
      cachedAt: info.cachedAt,
    })
  } catch (err) {
    console.error('[staking-bonus] Error:', err)
    // Non-fatal — return neutral multiplier so game still loads
    return NextResponse.json({ stakedAmount: '0', multiplier: 1.0, cachedAt: null })
  }
}
