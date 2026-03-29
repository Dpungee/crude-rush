import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { calculateProductionRate, calculateStorageCapacity } from '@/engine/production'
import { UPGRADE_DEFINITIONS } from '@/engine/upgrades'
import {
  BARREL_MILESTONES,
  MAX_BUILDING_LEVEL,
  PRESTIGE_BONUS_PER_LEVEL,
  VALIDATION_TOLERANCE,
} from '@/engine/constants'
import { MISSION_DEFINITIONS } from '@/data/missions'
import { computeSeasonScore } from '@/engine/season'
import { checkRateLimit } from '@/lib/rate-limit'
import type { UpgradeType, GridCell, MissionProgress } from '@/engine/types'

const MIN_SAVE_INTERVAL_MS = 15_000

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const body = await request.json()
    const { gameState, missions } = body

    if (!gameState) {
      return NextResponse.json({ error: 'Missing gameState' }, { status: 400 })
    }

    // ── Dev mode ──────────────────────────────────────────────────────────
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true })
    }

    // ── Durable rate limit (survives lambda cold starts) ─────────────────
    const supabase = getServiceSupabase()
    const rl = await checkRateLimit(supabase, `save:${walletAddress}`, MIN_SAVE_INTERVAL_MS)
    if (!rl.allowed) {
      const retryAfterSec = Math.ceil(rl.retryAfterMs / 1000)
      return NextResponse.json(
        { error: 'Save too frequent', retryAfter: retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    // ── Input validation ──────────────────────────────────────────────────
    const upgradesData: Record<string, number> = gameState.upgrades_data ?? {}
    for (const [type, level] of Object.entries(upgradesData)) {
      const def = UPGRADE_DEFINITIONS[type as UpgradeType]
      if (!def) {
        return NextResponse.json({ error: `Unknown upgrade type: ${type}` }, { status: 400 })
      }
      if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > def.maxLevel) {
        return NextResponse.json(
          { error: `Invalid upgrade level for ${type}: ${level} (max ${def.maxLevel})` },
          { status: 400 }
        )
      }
    }

    const plots: GridCell[] = gameState.plots_data ?? []
    for (const plot of plots) {
      if (plot.building !== null) {
        if (
          typeof plot.level !== 'number' ||
          !Number.isInteger(plot.level) ||
          plot.level < 1 ||
          plot.level > MAX_BUILDING_LEVEL
        ) {
          return NextResponse.json(
            { error: `Invalid building level: ${plot.level} (max ${MAX_BUILDING_LEVEL})` },
            { status: 400 }
          )
        }
      }
    }

    // ── Server-side production rate recalculation ─────────────────────────
    const prestigeLevel = Math.max(0, Math.floor(gameState.prestige_level ?? 0))
    const serverPrestigeMultiplier = 1 + PRESTIGE_BONUS_PER_LEVEL * prestigeLevel
    const milestoneProductionBonus = Math.max(1.0, gameState.milestone_production_bonus ?? 1.0)

    const serverProductionRate = calculateProductionRate(
      plots,
      upgradesData as Record<UpgradeType, number>,
      serverPrestigeMultiplier,
      1.0,
      milestoneProductionBonus
    )
    const serverStorageCapacity = calculateStorageCapacity(
      plots,
      upgradesData as Record<UpgradeType, number>
    )

    // ── Load previous state for delta validation ───────────────────────────
    const { data: prevState } = await supabase
      .from('game_states')
      .select('version, crude_oil, refined_oil, petrodollars, last_tick_at, server_lifetime_barrels, plots_data, upgrades_data, unlocked_tile_count')
      .eq('wallet_address', walletAddress)
      .single()

    // ── Load previous player state for prestige validation ──────────────
    const { data: prevPlayer } = await supabase
      .from('players')
      .select('prestige_level, lifetime_barrels, lifetime_petrodollars, black_gold')
      .eq('wallet_address', walletAddress)
      .single()

    // Server-tracked lifetime barrels — accumulates based on validated production,
    // NOT the client-sent lifetime_barrels. This prevents milestone inflation.
    let serverLifetimeBarrels = prevState?.server_lifetime_barrels ?? 0

    if (prevState) {
      if (gameState.version <= prevState.version) {
        return NextResponse.json({ error: 'Stale version' }, { status: 409 })
      }

      const elapsedSec =
        (new Date(gameState.last_tick_at).getTime() -
          new Date(prevState.last_tick_at).getTime()) /
        1000

      // Cap elapsed time at 12 hours to prevent time manipulation
      const cappedElapsedSec = Math.min(Math.max(0, elapsedSec), 43_200)

      const maxPossibleCrude = Math.min(
        prevState.crude_oil + serverProductionRate * cappedElapsedSec * VALIDATION_TOLERANCE,
        serverStorageCapacity
      )

      if (gameState.crude_oil > maxPossibleCrude + 1) {
        console.warn(
          `[anti-cheat] oil delta too large for ${walletAddress}:`,
          `${gameState.crude_oil.toFixed(1)} > ${maxPossibleCrude.toFixed(1)}`
        )
        return NextResponse.json({ error: 'Invalid game state delta' }, { status: 400 })
      }

      // ── Server-tracked barrel accumulation ──────────────────────────────
      const maxNewBarrels = serverProductionRate * cappedElapsedSec * VALIDATION_TOLERANCE
      serverLifetimeBarrels += Math.floor(maxNewBarrels)

      // ── Validate client lifetime_barrels against server tracking ────────
      const clientLifetimeBarrels = Math.max(0, gameState.lifetime_barrels ?? 0)
      if (clientLifetimeBarrels > serverLifetimeBarrels * 1.1 + 1000) {
        console.warn(
          `[anti-cheat] lifetime_barrels suspicious for ${walletAddress}:`,
          `client=${clientLifetimeBarrels} server=${serverLifetimeBarrels}`
        )
      }

      // ── Validate petrodollar delta ─────────────────────────────────────
      // Petrodollars can increase from selling crude/refined + daily rewards +
      // mission rewards + milestone rewards. Estimate a generous upper bound.
      const maxSellIncome = (
        (prevState.crude_oil + maxNewBarrels) * 4 * // refined sells at 4x
        1.3 * // max market multiplier headroom
        1.3 * // max streak bonus headroom
        2.0   // max milestone cash bonus headroom
      )
      const maxPetrodollars = (prevState.petrodollars ?? 0) + maxSellIncome + 100_000 // daily/mission buffer
      const clientPetrodollars = Math.max(0, gameState.petrodollars ?? 0)

      if (clientPetrodollars > maxPetrodollars) {
        console.warn(
          `[anti-cheat] petrodollars suspicious for ${walletAddress}:`,
          `client=${clientPetrodollars.toFixed(0)} max=${maxPetrodollars.toFixed(0)}`
        )
        // Clamp instead of reject — prevents locking out legitimate edge cases
        gameState.petrodollars = Math.min(clientPetrodollars, maxPetrodollars)
      }

      // ── Validate prestige level ────────────────────────────────────────
      // Prestige can only increase by 1 per save. Can't jump from P0 to P10.
      const prevPrestige = prevPlayer?.prestige_level ?? 0
      if (prestigeLevel > prevPrestige + 1) {
        console.warn(
          `[anti-cheat] prestige jump for ${walletAddress}: ${prevPrestige} → ${prestigeLevel}`
        )
        return NextResponse.json({ error: 'Invalid prestige progression' }, { status: 400 })
      }

      // ── Validate lifetime stats never decrease (except prestige resets resources) ──
      if ((gameState.lifetime_petrodollars ?? 0) < (prevPlayer?.lifetime_petrodollars ?? 0) - 1) {
        console.warn(`[anti-cheat] lifetime_petrodollars decreased for ${walletAddress}`)
        gameState.lifetime_petrodollars = prevPlayer?.lifetime_petrodollars ?? 0
      }

      // ── Validate tile unlock count vs actual unlocked tiles ─────────────
      const actualUnlocked = plots.filter((p: GridCell) => p.status === 'unlocked').length
      if (Math.abs(actualUnlocked - (gameState.unlocked_tile_count ?? 1)) > 1) {
        console.warn(
          `[anti-cheat] tile count mismatch for ${walletAddress}: ` +
          `claimed=${gameState.unlocked_tile_count} actual=${actualUnlocked}`
        )
        gameState.unlocked_tile_count = actualUnlocked
      }
    }

    // ── Upsert game state + update player stats in parallel ───────────────
    const dbNow = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: any[] = [
      supabase.from('game_states').upsert({
        wallet_address: walletAddress,
        crude_oil: Math.max(0, gameState.crude_oil ?? 0),
        refined_oil: Math.max(0, gameState.refined_oil ?? 0),
        petrodollars: Math.max(0, gameState.petrodollars ?? 0),
        plots_data: plots,
        unlocked_tile_count: gameState.unlocked_tile_count ?? 1,
        upgrades_data: upgradesData,
        production_rate: serverProductionRate,
        storage_capacity: serverStorageCapacity,
        refinery_rate: Math.max(0, gameState.refinery_rate ?? 0),
        last_tick_at: gameState.last_tick_at,
        version: gameState.version,
        server_lifetime_barrels: serverLifetimeBarrels,
        updated_at: dbNow,
      }),

      supabase
        .from('players')
        .update({
          last_seen_at: dbNow,
          prestige_level: prestigeLevel,
          prestige_multiplier: serverPrestigeMultiplier,
          black_gold: Math.max(0, gameState.black_gold ?? 0),
          xp: Math.max(0, gameState.xp ?? 0),
          xp_level: Math.max(0, gameState.xp_level ?? 0),
          milestone_production_bonus: Math.max(1.0, gameState.milestone_production_bonus ?? 1.0),
          milestone_cash_bonus: Math.max(1.0, gameState.milestone_cash_bonus ?? 1.0),
          streak_multiplier: Math.max(1.0, gameState.streak_multiplier ?? 1.0),
          lifetime_barrels: Math.max(0, gameState.lifetime_barrels ?? 0),
          lifetime_petrodollars: Math.max(0, gameState.lifetime_petrodollars ?? 0),
        })
        .eq('wallet_address', walletAddress),
    ]

    // ── Save mission progress (server-validated) ──────────────────────────
    // Mission progress is tracked client-side between saves.
    // CRITICAL: We do NOT trust client-sent `completed` or `target` fields.
    // Instead, we validate against MISSION_DEFINITIONS on the server.
    // This prevents: (1) client setting completed=true on unfinished missions,
    // (2) client lowering the target to make completion easier.
    if (Array.isArray(missions) && missions.length > 0) {
      const missionUpserts = (missions as MissionProgress[])
        .filter((m) => !m.claimed)
        .map((m) => {
          // Look up the canonical definition — client cannot override target/reward
          const def = MISSION_DEFINITIONS.find((d) => d.key === m.missionKey)
          if (!def) return null

          const serverTarget = def.target
          const serverProgress = Math.max(0, Math.min(Math.floor(m.progress ?? 0), serverTarget))
          // Server determines completion — client's `completed` field is ignored
          const serverCompleted = serverProgress >= serverTarget

          return {
            wallet_address: walletAddress,
            mission_key: m.missionKey,
            progress: serverProgress,
            target: serverTarget,
            completed: serverCompleted,
            server_verified: serverCompleted,
            claimed: false,
            reward_type: def.rewardType,
            reward_amount: def.rewardAmount,
            updated_at: dbNow,
          }
        })
        .filter(Boolean)

      if (missionUpserts.length > 0) {
        ops.push(
          supabase
            .from('missions')
            .upsert(missionUpserts, { onConflict: 'wallet_address,mission_key' })
        )
      }
    }

    await Promise.all(ops)

    // ── Credit $CRUDE token milestone rewards (idempotent) ─────────────────
    // CRITICAL: Use server_lifetime_barrels (server-tracked), NOT the client-sent
    // value. This prevents a cheater from inflating lifetime_barrels in one save
    // to instantly claim all milestone rewards.
    const lifetimeBarrels: number = serverLifetimeBarrels
    const reachedRefs = BARREL_MILESTONES
      .filter((m) => lifetimeBarrels >= m.threshold)
      .map((m) => `barrel_milestone_${m.threshold}`)

    if (reachedRefs.length > 0) {
      const { data: existingRefs } = await supabase
        .from('token_ledger')
        .select('reference_id')
        .eq('wallet_address', walletAddress)
        .in('reference_id', reachedRefs)

      const alreadyCredited = new Set(existingRefs?.map((r) => r.reference_id) ?? [])

      const newRewards = BARREL_MILESTONES
        .filter((m) => {
          const ref = `barrel_milestone_${m.threshold}`
          return lifetimeBarrels >= m.threshold && !alreadyCredited.has(ref)
        })
        .map((m) => ({
          wallet_address: walletAddress,
          event_type: 'barrel_milestone',
          amount: m.tokenMicroReward,
          reference_id: `barrel_milestone_${m.threshold}`,
          settled: false,
        }))

      if (newRewards.length > 0) {
        await supabase.from('token_ledger').insert(newRewards)

        // Audit log for milestone token credits
        await supabase.from('token_audit_log').insert(
          newRewards.map((r) => ({
            wallet_address: walletAddress,
            action: 'credit',
            amount: r.amount,
            reference_id: r.reference_id,
            metadata: { source: 'barrel_milestone', serverLifetimeBarrels },
          }))
        )
      }
    }

    // ── Season delta tracking ──────────────────────────────────────────────
    // Compute incremental deltas from prevState and upsert to season_entries.
    // This is the ONLY place season scores update — fully server-side.
    if (prevState && prevPlayer) {
      try {
        const { data: activeSeason } = await supabase
          .from('seasons')
          .select('id')
          .eq('status', 'active')
          .single()

        if (activeSeason) {
          // Compute incremental deltas since last save
          const barrelsDelta = Math.max(0, serverLifetimeBarrels - (prevState.server_lifetime_barrels ?? 0))
          const petroDelta = Math.max(0, (gameState.lifetime_petrodollars ?? 0) - (prevPlayer.lifetime_petrodollars ?? 0))

          // Tiles: count actual unlocked tiles vs previous
          const prevTiles = prevState.unlocked_tile_count ?? 1
          const newTiles = Math.max(1, gameState.unlocked_tile_count ?? 1)
          const tilesDelta = Math.max(0, newTiles - prevTiles)

          // Upgrades: sum all upgrade levels
          const sumUpgrades = (u: Record<string, number>) => Object.values(u).reduce((a, b) => a + (b || 0), 0)
          const prevUpgradeSum = sumUpgrades(prevState.upgrades_data ?? {})
          const newUpgradeSum = sumUpgrades(upgradesData)
          const upgradesDelta = Math.max(0, newUpgradeSum - prevUpgradeSum)

          // Prestige
          const prestigeDelta = Math.max(0, prestigeLevel - (prevPlayer.prestige_level ?? 0))

          // Only upsert if there's actual activity
          if (barrelsDelta > 0 || petroDelta > 0 || tilesDelta > 0 || upgradesDelta > 0 || prestigeDelta > 0) {
            // Upsert with incremental adds
            const { data: existingEntry } = await supabase
              .from('season_entries')
              .select('season_barrels, season_petrodollars, season_tiles_unlocked, season_upgrades_bought, season_prestiges')
              .eq('season_id', activeSeason.id)
              .eq('wallet_address', walletAddress)
              .single()

            const newBarrels = (existingEntry?.season_barrels ?? 0) + barrelsDelta
            const newPetro = (existingEntry?.season_petrodollars ?? 0) + petroDelta
            const newTilesTotal = (existingEntry?.season_tiles_unlocked ?? 0) + tilesDelta
            const newUpgradesTotal = (existingEntry?.season_upgrades_bought ?? 0) + upgradesDelta
            const newPrestigesTotal = (existingEntry?.season_prestiges ?? 0) + prestigeDelta
            const newScore = computeSeasonScore(newBarrels, newPetro, newTilesTotal, newUpgradesTotal, newPrestigesTotal)

            await supabase.from('season_entries').upsert({
              season_id: activeSeason.id,
              wallet_address: walletAddress,
              season_barrels: newBarrels,
              season_petrodollars: newPetro,
              season_tiles_unlocked: newTilesTotal,
              season_upgrades_bought: newUpgradesTotal,
              season_prestiges: newPrestigesTotal,
              score: newScore,
              updated_at: dbNow,
            }, { onConflict: 'season_id,wallet_address' })
          }
        }
      } catch (seasonErr) {
        // Non-critical — don't fail the save if season tracking fails
        console.error('[save] Season tracking error:', seasonErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
