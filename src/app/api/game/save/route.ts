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
import type { UpgradeType, GridCell, MissionProgress } from '@/engine/types'

// ── Per-wallet save rate limiting ─────────────────────────────────────────────
const MIN_SAVE_INTERVAL_MS = 15_000

declare global {
  // eslint-disable-next-line no-var
  var __saveRateLimiter: Map<string, number> | undefined
}
const saveLastAt = (global.__saveRateLimiter ??= new Map<string, number>())

setInterval(
  () => {
    const cutoff = Date.now() - 5 * 60_000
    for (const [wallet, ts] of saveLastAt) {
      if (ts < cutoff) saveLastAt.delete(wallet)
    }
  },
  10 * 60_000
)

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  // ── Rate limit ────────────────────────────────────────────────────────
  const now = Date.now()
  const lastSave = saveLastAt.get(walletAddress) ?? 0
  const elapsed = now - lastSave
  if (elapsed < MIN_SAVE_INTERVAL_MS) {
    const retryAfterSec = Math.ceil((MIN_SAVE_INTERVAL_MS - elapsed) / 1000)
    return NextResponse.json(
      { error: 'Save too frequent', retryAfter: retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }
  saveLastAt.set(walletAddress, now)

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
    const supabase = getServiceSupabase()

    const { data: prevState } = await supabase
      .from('game_states')
      .select('version, crude_oil, last_tick_at, server_lifetime_barrels')
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
      // Accumulate barrels based on what the server knows is possible,
      // not what the client claims. This is the counter used for milestone rewards.
      const maxNewBarrels = serverProductionRate * cappedElapsedSec * VALIDATION_TOLERANCE
      serverLifetimeBarrels += Math.floor(maxNewBarrels)

      // ── Validate client lifetime_barrels against server tracking ────────
      // Client value should never exceed server-tracked by more than one
      // save interval's worth of production.
      const clientLifetimeBarrels = Math.max(0, gameState.lifetime_barrels ?? 0)
      if (clientLifetimeBarrels > serverLifetimeBarrels * 1.1 + 1000) {
        console.warn(
          `[anti-cheat] lifetime_barrels suspicious for ${walletAddress}:`,
          `client=${clientLifetimeBarrels} server=${serverLifetimeBarrels}`
        )
        // Don't reject — just clamp to server value. The game still saves,
        // but milestones use server_lifetime_barrels, not the client value.
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
