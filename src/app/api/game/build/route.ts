import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { validateBuildStart, validateUpgradeStart, validateInstantFinish, validateConstructionComplete } from '@/lib/economy'
import type { GridCell, BuildingType } from '@/engine/types'
import { recalculateDerivedStats } from '@/engine/production'
import { createInitialUpgrades } from '@/engine/upgrades'

/**
 * POST /api/game/build
 *
 * Server-authoritative build/upgrade/complete/instant-finish actions.
 * All construction timers are set by the server — clients cannot fake them.
 *
 * Body: { action, x, y, buildingType?, eventTimeMult? }
 *   action: 'build' | 'upgrade' | 'complete' | 'instant_finish'
 */
export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { action, x, y, buildingType } = body as {
      action: string
      x: number
      y: number
      buildingType?: BuildingType
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Load current game state
    const { data: gs, error: loadErr } = await supabase
      .from('game_states')
      .select('plots_data, petrodollars, unlocked_tile_count, upgrades_data, prestige_multiplier, milestone_production_bonus')
      .eq('wallet_address', walletAddress)
      .single()

    if (loadErr || !gs) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 })
    }

    const plots: GridCell[] = gs.plots_data ?? []
    let petrodollars: number = gs.petrodollars ?? 0
    const unlockedTileCount: number = gs.unlocked_tile_count ?? 1

    // TODO: get event time multiplier from active events in DB
    const eventTimeMult = 1.0

    if (action === 'build') {
      if (!buildingType) {
        return NextResponse.json({ error: 'Missing buildingType' }, { status: 400 })
      }

      const result = validateBuildStart(plots, x, y, buildingType, petrodollars, unlockedTileCount, eventTimeMult)
      if (!result) {
        return NextResponse.json({ error: 'Cannot build here' }, { status: 400 })
      }

      // Update plot
      const plotIndex = plots.findIndex((p) => p.x === x && p.y === y)
      plots[plotIndex] = {
        ...plots[plotIndex],
        constructionType: buildingType,
        constructionLevel: 1,
        constructionEndsAt: result.constructionEndsAt,
      }

      await supabase.from('game_states').update({
        plots_data: plots,
        petrodollars: result.newPetrodollars,
      }).eq('wallet_address', walletAddress)

      return NextResponse.json({
        success: true,
        action: 'build',
        constructionEndsAt: result.constructionEndsAt,
        cost: result.cost,
        petrodollars: result.newPetrodollars,
      })

    } else if (action === 'upgrade') {
      const result = validateUpgradeStart(plots, x, y, petrodollars, eventTimeMult)
      if (!result) {
        return NextResponse.json({ error: 'Cannot upgrade' }, { status: 400 })
      }

      const plotIndex = plots.findIndex((p) => p.x === x && p.y === y)
      plots[plotIndex] = {
        ...plots[plotIndex],
        constructionType: plots[plotIndex].building,
        constructionLevel: result.targetLevel,
        constructionEndsAt: result.constructionEndsAt,
      }

      await supabase.from('game_states').update({
        plots_data: plots,
        petrodollars: result.newPetrodollars,
      }).eq('wallet_address', walletAddress)

      return NextResponse.json({
        success: true,
        action: 'upgrade',
        targetLevel: result.targetLevel,
        constructionEndsAt: result.constructionEndsAt,
        cost: result.cost,
        petrodollars: result.newPetrodollars,
      })

    } else if (action === 'complete') {
      const plot = plots.find((p) => p.x === x && p.y === y)
      if (!plot || !validateConstructionComplete(plot)) {
        return NextResponse.json({ error: 'Construction not complete' }, { status: 400 })
      }

      const plotIndex = plots.findIndex((p) => p.x === x && p.y === y)
      plots[plotIndex] = {
        ...plots[plotIndex],
        building: plot.constructionType!,
        level: plot.constructionLevel ?? 1,
        builtAt: plot.builtAt ?? new Date().toISOString(),
        constructionType: null,
        constructionLevel: undefined,
        constructionEndsAt: null,
      }

      const upgrades = gs.upgrades_data ?? createInitialUpgrades()
      const derived = recalculateDerivedStats(
        plots, upgrades,
        gs.prestige_multiplier ?? 1.0,
        1.0,
        gs.milestone_production_bonus ?? 1.0,
      )

      await supabase.from('game_states').update({
        plots_data: plots,
        production_rate: derived.productionRate,
        storage_capacity: derived.storageCapacity,
        refinery_rate: derived.refineryRate,
      }).eq('wallet_address', walletAddress)

      return NextResponse.json({
        success: true,
        action: 'complete',
        building: plots[plotIndex].building,
        level: plots[plotIndex].level,
        productionRate: derived.productionRate,
        storageCapacity: derived.storageCapacity,
        refineryRate: derived.refineryRate,
      })

    } else if (action === 'instant_finish') {
      const plot = plots.find((p) => p.x === x && p.y === y)
      if (!plot) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 400 })
      }

      const result = validateInstantFinish(plot, petrodollars)
      if (!result) {
        return NextResponse.json({ error: 'Cannot instant finish' }, { status: 400 })
      }

      // Complete the construction immediately
      const plotIndex = plots.findIndex((p) => p.x === x && p.y === y)
      plots[plotIndex] = {
        ...plots[plotIndex],
        building: plot.constructionType!,
        level: plot.constructionLevel ?? 1,
        builtAt: plot.builtAt ?? new Date().toISOString(),
        constructionType: null,
        constructionLevel: undefined,
        constructionEndsAt: null,
      }

      const upgrades = gs.upgrades_data ?? createInitialUpgrades()
      const derived = recalculateDerivedStats(
        plots, upgrades,
        gs.prestige_multiplier ?? 1.0,
        1.0,
        gs.milestone_production_bonus ?? 1.0,
      )

      await supabase.from('game_states').update({
        plots_data: plots,
        petrodollars: result.newPetrodollars,
        production_rate: derived.productionRate,
        storage_capacity: derived.storageCapacity,
        refinery_rate: derived.refineryRate,
      }).eq('wallet_address', walletAddress)

      return NextResponse.json({
        success: true,
        action: 'instant_finish',
        cost: result.cost,
        petrodollars: result.newPetrodollars,
        building: plots[plotIndex].building,
        level: plots[plotIndex].level,
        productionRate: derived.productionRate,
        storageCapacity: derived.storageCapacity,
        refineryRate: derived.refineryRate,
      })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[build] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
