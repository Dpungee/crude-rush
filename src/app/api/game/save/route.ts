import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'

// Barrel milestones that award $CRUDE tokens (in micro-$CRUDE, 1e6 = 1 token)
const BARREL_MILESTONES: { threshold: number; reward: number }[] = [
  { threshold: 100,       reward:    500_000 },  //  0.5 $CRUDE
  { threshold: 1_000,     reward:  2_000_000 },  //  2 $CRUDE
  { threshold: 10_000,    reward: 10_000_000 },  // 10 $CRUDE
  { threshold: 100_000,   reward: 50_000_000 },  // 50 $CRUDE
  { threshold: 1_000_000, reward: 200_000_000 }, // 200 $CRUDE
]

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const { gameState } = await request.json()
    if (!gameState) {
      return NextResponse.json({ error: 'Missing gameState' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Load previous state for delta validation
    const { data: prevState } = await supabase
      .from('game_states')
      .select('version, production_rate, crude_oil, storage_capacity, last_tick_at')
      .eq('wallet_address', walletAddress)
      .single()

    if (prevState) {
      const elapsedSec =
        (new Date(gameState.last_tick_at).getTime() -
          new Date(prevState.last_tick_at).getTime()) /
        1000

      const maxOilGain = prevState.production_rate * elapsedSec * 1.15
      if (
        gameState.crude_oil >
        prevState.crude_oil + maxOilGain + prevState.storage_capacity
      ) {
        console.warn(`[anti-cheat] oil delta too large for ${walletAddress}`)
        return NextResponse.json({ error: 'Invalid game state delta' }, { status: 400 })
      }

      if (gameState.version <= prevState.version) {
        return NextResponse.json({ error: 'Stale version' }, { status: 409 })
      }
    }

    // Upsert game state
    await supabase.from('game_states').upsert({
      wallet_address: walletAddress,
      crude_oil: gameState.crude_oil,
      refined_oil: gameState.refined_oil,
      petrodollars: gameState.petrodollars,
      plots_data: gameState.plots_data,
      unlocked_tile_count: gameState.unlocked_tile_count,
      production_rate: gameState.production_rate,
      storage_capacity: gameState.storage_capacity,
      refinery_rate: gameState.refinery_rate,
      last_tick_at: gameState.last_tick_at,
      version: gameState.version,
      updated_at: new Date().toISOString(),
    })

    // Update player lifetime stats
    await supabase
      .from('players')
      .update({
        last_seen_at: new Date().toISOString(),
        prestige_level: gameState.prestige_level,
        prestige_multiplier: gameState.prestige_multiplier,
        lifetime_barrels: gameState.lifetime_barrels,
        lifetime_petrodollars: gameState.lifetime_petrodollars,
      })
      .eq('wallet_address', walletAddress)

    // Save upgrades
    if (gameState.upgrades) {
      for (const [upgradeType, level] of Object.entries(gameState.upgrades)) {
        if ((level as number) > 0) {
          await supabase.from('upgrades').upsert({
            wallet_address: walletAddress,
            upgrade_type: upgradeType,
            level,
          })
        }
      }
    }

    // Credit $CRUDE token milestone rewards (idempotent via reference_id)
    for (const m of BARREL_MILESTONES) {
      if ((gameState.lifetime_barrels ?? 0) >= m.threshold) {
        const refId = `barrel_milestone_${m.threshold}`
        const { data: exists } = await supabase
          .from('token_ledger')
          .select('id')
          .eq('wallet_address', walletAddress)
          .eq('reference_id', refId)
          .single()

        if (!exists) {
          await supabase.from('token_ledger').insert({
            wallet_address: walletAddress,
            event_type: 'barrel_milestone',
            amount: m.reward,
            reference_id: refId,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
