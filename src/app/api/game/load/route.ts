import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: Request) {
  // Require valid JWT — wallet address comes from the token, not the request body
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const supabase = getServiceSupabase()

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const { data: gameState, error: gameError } = await supabase
      .from('game_states')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (gameError || !gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 })
    }

    // Load upgrades and merge into a map
    const { data: upgrades } = await supabase
      .from('upgrades')
      .select('*')
      .eq('wallet_address', walletAddress)

    const upgradeMap: Record<string, number> = {}
    if (upgrades) {
      for (const u of upgrades) {
        upgradeMap[u.upgrade_type] = u.level
      }
    }

    const { data: missions } = await supabase
      .from('missions')
      .select('*')
      .eq('wallet_address', walletAddress)

    return NextResponse.json({
      player: {
        walletAddress: player.wallet_address,
        displayName: player.display_name,
        loginStreak: player.login_streak,
        lastLoginDate: player.last_login_date,
        prestigeLevel: player.prestige_level,
        prestigeMultiplier: player.prestige_multiplier,
        lifetimeBarrels: player.lifetime_barrels,
        lifetimePetrodollars: player.lifetime_petrodollars,
      },
      gameState: {
        ...gameState,
        prestige_level: player.prestige_level,
        prestige_multiplier: player.prestige_multiplier,
        lifetime_barrels: player.lifetime_barrels,
        lifetime_petrodollars: player.lifetime_petrodollars,
        upgrades: upgradeMap,
      },
      missions: missions || [],
    })
  } catch (error) {
    console.error('Load error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
