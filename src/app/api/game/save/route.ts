import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, gameState } = body

    if (!walletAddress || !gameState) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Save game state
    const { error: gameError } = await supabase
      .from('game_states')
      .upsert({
        wallet_address: walletAddress,
        crude_oil: gameState.crude_oil,
        refined_oil: gameState.refined_oil,
        petrodollars: gameState.petrodollars,
        grid_size: gameState.grid_size,
        grid_data: gameState.grid_data,
        production_rate: gameState.production_rate,
        storage_capacity: gameState.storage_capacity,
        refinery_rate: gameState.refinery_rate,
        last_tick_at: gameState.last_tick_at,
        version: gameState.version,
        updated_at: new Date().toISOString(),
      })

    if (gameError) {
      console.error('Save game state error:', gameError)
      return NextResponse.json({ error: 'Failed to save game state' }, { status: 500 })
    }

    // Update player lifetime stats
    const { error: playerError } = await supabase
      .from('players')
      .update({
        last_seen_at: new Date().toISOString(),
        prestige_level: gameState.prestige_level,
        prestige_multiplier: gameState.prestige_multiplier,
        lifetime_barrels: gameState.lifetime_barrels,
        lifetime_petrodollars: gameState.lifetime_petrodollars,
      })
      .eq('wallet_address', walletAddress)

    if (playerError) {
      console.error('Save player error:', playerError)
    }

    // Save upgrades
    if (gameState.upgrades) {
      for (const [upgradeType, level] of Object.entries(gameState.upgrades)) {
        if ((level as number) > 0) {
          await supabase.from('upgrades').upsert({
            wallet_address: walletAddress,
            upgrade_type: upgradeType,
            level: level,
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
