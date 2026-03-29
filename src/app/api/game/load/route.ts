import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { calculateOfflineIncome } from '@/engine/offline'
import { recalculateDerivedStats } from '@/engine/production'
import type { GameState, UpgradeType } from '@/engine/types'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    // ── Dev mode ──────────────────────────────────────────────────────────
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'No saved game' }, { status: 404 })
    }

    const supabase = getServiceSupabase()

    // Fetch player and game state in parallel
    const [{ data: player, error: playerError }, { data: gameState, error: gameError }] =
      await Promise.all([
        supabase.from('players').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('game_states').select('*').eq('wallet_address', walletAddress).single(),
      ])

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    if (gameError || !gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 })
    }

    const { data: missions } = await supabase
      .from('missions')
      .select('*')
      .eq('wallet_address', walletAddress)

    // ── Server-side offline income calculation ────────────────────────────
    // Done HERE (not client-side) for two reasons:
    //   1. Atomically saved back to DB → prevents double-counting if the client
    //      disconnects before its next periodic save.
    //   2. A compromised client cannot manipulate the offline income amount.
    const upgrades: Record<UpgradeType, number> = gameState.upgrades_data ?? {
      extraction_speed: 0,
      storage_expansion: 0,
      refinery_efficiency: 0,
      auto_sell: 0,
      offline_duration: 0,
    }
    const prestigeMultiplier: number = player.prestige_multiplier ?? 1.0

    // Recalculate derived stats from the stored plots + upgrades so the offline
    // engine uses correct rates even if the DB value is slightly stale.
    const derived = recalculateDerivedStats(
      gameState.plots_data ?? [],
      upgrades,
      prestigeMultiplier
    )

    const engineState: GameState = {
      crudeOil:               gameState.crude_oil ?? 0,
      refinedOil:             gameState.refined_oil ?? 0,
      petrodollars:           gameState.petrodollars ?? 0,
      plots:                  gameState.plots_data ?? [],
      unlockedTileCount:      gameState.unlocked_tile_count ?? 1,
      productionRate:         derived.productionRate,
      storageCapacity:        derived.storageCapacity,
      refineryRate:           derived.refineryRate,
      upgrades,
      prestigeLevel:          player.prestige_level ?? 0,
      prestigeMultiplier,
      blackGold:              player.black_gold ?? 0,
      xp:                     player.xp ?? 0,
      xpLevel:                player.xp_level ?? 0,
      milestoneProductionBonus: player.milestone_production_bonus ?? 1.0,
      milestoneCashBonus:     player.milestone_cash_bonus ?? 1.0,
      marketMultiplier:       1.0,
      loginStreak:            player.login_streak ?? 0,
      streakMultiplier:       player.streak_multiplier ?? 1.0,
      activeTempMultiplier:   1.0,
      activeTempMultiplierExpiresAt: null,
      lifetimeBarrels:        player.lifetime_barrels ?? 0,
      lifetimePetrodollars:   player.lifetime_petrodollars ?? 0,
      lastTickAt:             new Date(gameState.last_tick_at).getTime(),
      version:                gameState.version ?? 1,
    }

    const nowMs = Date.now()
    const offlineResult = calculateOfflineIncome(engineState, nowMs)

    let offlineIncomeReport: { crude: number; refined: number; seconds: number } | null = null

    if (offlineResult.secondsOffline > 10 && offlineResult.crudeEarned > 0) {
      offlineIncomeReport = {
        crude:   offlineResult.crudeEarned,
        refined: offlineResult.refinedEarned,
        seconds: offlineResult.secondsOffline,
      }

      // Persist immediately — if the client crashes before its next 30s save,
      // these resources are already committed and won't be double-awarded.
      await supabase
        .from('game_states')
        .update({
          crude_oil:    offlineResult.state.crudeOil,
          refined_oil:  offlineResult.state.refinedOil,
          last_tick_at: new Date(nowMs).toISOString(),
        })
        .eq('wallet_address', walletAddress)
    }

    const finalGameState = {
      ...gameState,
      crude_oil:    offlineResult.secondsOffline > 10 ? offlineResult.state.crudeOil  : engineState.crudeOil,
      refined_oil:  offlineResult.secondsOffline > 10 ? offlineResult.state.refinedOil : engineState.refinedOil,
      last_tick_at: new Date(nowMs).toISOString(),
      prestige_level:       player.prestige_level ?? 0,
      prestige_multiplier:  prestigeMultiplier,
      lifetime_barrels:     player.lifetime_barrels ?? 0,
      lifetime_petrodollars: player.lifetime_petrodollars ?? 0,
    }

    return NextResponse.json({
      player: {
        walletAddress:       player.wallet_address,
        displayName:         player.display_name,
        loginStreak:         player.login_streak,
        lastLoginDate:       player.last_login_date,
        prestigeLevel:       player.prestige_level,
        prestigeMultiplier,
        lifetimeBarrels:     player.lifetime_barrels,
        lifetimePetrodollars: player.lifetime_petrodollars,
      },
      gameState: finalGameState,
      missions: missions || [],
      // Client shows the offline income modal when this is non-null
      offlineIncome: offlineIncomeReport,
    })
  } catch (error) {
    console.error('Load error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
