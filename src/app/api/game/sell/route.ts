import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { generateMarketSnapshot } from '@/engine/market'

/**
 * POST /api/game/sell
 *
 * Server-authoritative sell action. The server:
 *   1. Reads current game state from DB
 *   2. Calculates sell price using server-side market snapshot
 *   3. Deducts oil, adds petrodollars
 *   4. Persists updated state
 *
 * Body: { type: 'crude' | 'refined' }
 *
 * The client should call this instead of modifying state locally.
 * Returns the updated resource values so the client can sync.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }

  try {
    const { type } = await request.json()
    if (type !== 'crude' && type !== 'refined') {
      return NextResponse.json({ error: 'Invalid sell type' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Load current game state
    const { data: gs, error: loadErr } = await supabase
      .from('game_states')
      .select('crude_oil, refined_oil, petrodollars, lifetime_petrodollars')
      .eq('wallet_address', walletAddress)
      .single()

    if (loadErr || !gs) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 })
    }

    // Load player for streak
    const { data: player } = await supabase
      .from('players')
      .select('login_streak')
      .eq('wallet_address', walletAddress)
      .single()

    const loginStreak = player?.login_streak ?? 0
    const streakMult = 1 + Math.min(loginStreak * 0.01, 0.30)

    // Server-side market price (deterministic, no client input)
    const market = generateMarketSnapshot()

    // TODO: load milestone cash bonus from DB when tracked
    const milestoneCashBonus = 1.0

    let earned = 0
    let updateFields: Record<string, number> = {}

    if (type === 'crude') {
      const amount = gs.crude_oil ?? 0
      if (amount < 1) {
        return NextResponse.json({ error: 'No crude oil to sell' }, { status: 400 })
      }
      const effectiveRate = 1 * market.crudeMult * streakMult * milestoneCashBonus
      earned = Math.floor(amount * effectiveRate)
      updateFields = {
        crude_oil: 0,
        petrodollars: (gs.petrodollars ?? 0) + earned,
        lifetime_petrodollars: (gs.lifetime_petrodollars ?? 0) + earned,
      }
    } else {
      const amount = gs.refined_oil ?? 0
      if (amount < 1) {
        return NextResponse.json({ error: 'No refined oil to sell' }, { status: 400 })
      }
      const effectiveRate = 4 * market.refinedMult * streakMult * milestoneCashBonus
      earned = Math.floor(amount * effectiveRate)
      updateFields = {
        refined_oil: 0,
        petrodollars: (gs.petrodollars ?? 0) + earned,
        lifetime_petrodollars: (gs.lifetime_petrodollars ?? 0) + earned,
      }
    }

    // Persist
    const { error: updateErr } = await supabase
      .from('game_states')
      .update(updateFields)
      .eq('wallet_address', walletAddress)

    if (updateErr) {
      console.error('[sell] DB update failed:', updateErr.message)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      earned,
      marketMult: type === 'crude' ? market.crudeMult : market.refinedMult,
      crudeOil: type === 'crude' ? 0 : gs.crude_oil,
      refinedOil: type === 'refined' ? 0 : gs.refined_oil,
      petrodollars: updateFields.petrodollars,
    })
  } catch (err) {
    console.error('[sell] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
