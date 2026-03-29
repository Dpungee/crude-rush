import { create } from 'zustand'
import type { GameState, BuildingType, UpgradeType, ServerGameState, EventModifiers } from '@/engine/types'
import { tick } from '@/engine/tick'
import { recalculateDerivedStats } from '@/engine/production'
import { getBuildingCost, getBuildingUpgradeCost, isBuildingAvailable } from '@/engine/buildings'
import { getUpgradeCost, canPurchaseUpgrade, createInitialUpgrades } from '@/engine/upgrades'
import { createInitialGrid, performPrestige, canPrestige } from '@/engine/prestige'
import { getLevelFromXP, xpFromSale, XP_BUILDING_BUILT, XP_BUILDING_UPGRADED, XP_TILE_UNLOCKED, XP_UPGRADE_PURCHASED } from '@/engine/xp'
import { getMarketMultiplier } from '@/engine/market'
import {
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
  CRUDE_OIL_SELL_RATE,
  REFINED_OIL_SELL_RATE,
  GRID_SIZE,
  STREAK_BONUS_PER_DAY,
  MAX_STREAK_BONUS,
  BARREL_MILESTONES,
  DAILY_REWARDS,
  MAX_BUILDING_LEVEL,
  MAX_CONSTRUCTION_SLOTS,
  getConstructionTime,
  INSTANT_FINISH_COST_PER_SECOND,
} from '@/engine/constants'

// Use the shared createInitialUpgrades from engine/upgrades.ts (imported above)

// ── Lazy store accessors ─────────────────────────────────────────────────────
// We cannot import eventStore/marketStore at module top level because Zustand
// stores run create() on import. If gameStore loads before them (or vice versa),
// we get "cannot access before initialization" errors. Instead, we require()
// them lazily inside functions — by the time these functions run, all stores
// are guaranteed to be initialized.

/** Get the current event time multiplier for construction */
function getEventTimeMultiplier(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEventStore } = require('@/stores/eventStore')
    return useEventStore.getState().getEffectiveModifiers().upgradeTimeMultiplier ?? 1.0
  } catch {
    return 1.0
  }
}

/** Get current market prices from the server-authoritative market store */
function getServerMarketPrices(): { crudeMult: number; refinedMult: number } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMarketStore } = require('@/stores/marketStore')
    const ms = useMarketStore.getState()
    if (ms.updatedAt) return { crudeMult: ms.crudeMult, refinedMult: ms.refinedMult }
  } catch { /* first load — stores not ready yet */ }
  return { crudeMult: 1.0, refinedMult: 1.0 }
}

/** Tick down the market countdown timer */
function tickMarketCountdown(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMarketStore } = require('@/stores/marketStore')
    useMarketStore.getState().tickCountdown()
  } catch { /* ok */ }
}

export function createInitialGameState(): GameState {
  return {
    crudeOil: 0,
    refinedOil: 0,
    petrodollars: STARTING_PETRODOLLARS,
    plots: createInitialGrid(),
    unlockedTileCount: 1,
    productionRate: 0,
    storageCapacity: STARTING_STORAGE,
    refineryRate: 0,
    upgrades: createInitialUpgrades(),
    prestigeLevel: 0,
    prestigeMultiplier: 1.0,
    blackGold: 0,
    xp: 0,
    xpLevel: 0,
    milestoneProductionBonus: 1.0,
    milestoneCashBonus: 1.0,
    marketMultiplier: 1.0,
    loginStreak: 0,
    streakMultiplier: 1.0,
    activeTempMultiplier: 1.0,
    activeTempMultiplierExpiresAt: null,
    lifetimeBarrels: 0,
    lifetimePetrodollars: 0,
    lastTickAt: Date.now(),
    version: 1,
  }
}

interface GameActions {
  // Core tick
  tick: () => void

  // Tile actions
  unlockTile: (x: number, y: number) => boolean

  // Building actions
  buildOnCell: (x: number, y: number, building: BuildingType) => boolean
  upgradeBuilding: (x: number, y: number) => boolean
  completeConstruction: (x: number, y: number) => void
  instantFinish: (x: number, y: number) => boolean

  // Upgrade actions
  purchaseUpgrade: (type: UpgradeType) => boolean

  // Economy
  sellCrudeOil: (amount: number) => boolean
  sellRefinedOil: (amount: number) => boolean
  sellAllCrude: () => boolean
  sellAllRefined: () => boolean

  // Daily reward claim
  claimDailyReward: (loginStreak: number) => void

  // Prestige
  prestige: () => boolean

  // Market multiplier refresh
  refreshMarket: () => void

  // Temp buff (e.g. from day-7 reward)
  applyTempMultiplier: (multiplier: number, durationMs: number) => void

  // Staking multiplier (on-chain, fetched post-login — not persisted in DB)
  stakingMultiplier: number
  setStakingMultiplier: (multiplier: number) => void

  // Persistence
  hydrate: (server: ServerGameState) => void
  serialize: () => ServerGameState
  reset: () => void

  // Internal
  _recalculate: () => void
  _awardXP: (amount: number) => void
  _applyMilestoneBonuses: (prevLifetimeBarrels: number, newLifetimeBarrels: number) => void
}

type GameStore = GameState & GameActions

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),

  // stakingMultiplier is NOT part of GameState / not persisted — fetched from
  // /api/game/staking-bonus after login and reset to 1.0 on fresh start.
  stakingMultiplier: 1.0,

  tick: () => {
    const state = get()
    const now = Date.now()
    // Cap delta to 5 s to prevent runaway catch-up if tab was suspended
    const deltaMs = Math.min(now - state.lastTickAt, 5000)
    if (deltaMs <= 0) return

    // Pull server-authoritative market price from marketStore
    const { crudeMult: serverCrudeMult } = getServerMarketPrices()
    tickMarketCountdown()

    const stateWithMarket = { ...state, marketMultiplier: serverCrudeMult || state.marketMultiplier }
    const newState = tick(stateWithMarket, deltaMs)
    const prevBarrels = state.lifetimeBarrels
    const newBarrels = newState.lifetimeBarrels

    set({
      crudeOil: newState.crudeOil,
      refinedOil: newState.refinedOil,
      petrodollars: newState.petrodollars,
      lifetimeBarrels: newBarrels,
      lifetimePetrodollars: newState.lifetimePetrodollars,
      marketMultiplier: newState.marketMultiplier,
      activeTempMultiplier: newState.activeTempMultiplier,
      activeTempMultiplierExpiresAt: newState.activeTempMultiplierExpiresAt,
      lastTickAt: now,
    })

    get()._applyMilestoneBonuses(prevBarrels, newBarrels)

    // Auto-complete expired constructions
    const nowMs = Date.now()
    for (const plot of get().plots) {
      if (plot.constructionEndsAt && new Date(plot.constructionEndsAt).getTime() <= nowMs) {
        get().completeConstruction(plot.x, plot.y)
      }
    }
  },

  unlockTile: (x, y) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (plot.status !== 'available') return false
    if (state.petrodollars < plot.unlockCost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = { ...plot, status: 'unlocked' }

    // Expose adjacent locked tiles as purchasable
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue
        const neighborIdx = newPlots.findIndex((p) => p.x === nx && p.y === ny)
        if (neighborIdx !== -1 && newPlots[neighborIdx].status === 'locked') {
          newPlots[neighborIdx] = { ...newPlots[neighborIdx], status: 'available' }
        }
      }
    }

    const newUnlockedCount = state.unlockedTileCount + 1

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - plot.unlockCost,
      unlockedTileCount: newUnlockedCount,
      version: state.version + 1,
    })

    get()._awardXP(XP_TILE_UNLOCKED)
    return true
  },

  buildOnCell: (x, y, buildingType) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (plot.status !== 'unlocked') return false
    if (plot.building !== null || plot.constructionType) return false

    if (!isBuildingAvailable(buildingType, state.unlockedTileCount)) return false

    // Check construction slot limit
    const activeConstructions = state.plots.filter((p) => p.constructionEndsAt).length
    if (activeConstructions >= MAX_CONSTRUCTION_SLOTS) return false

    const cost = getBuildingCost(buildingType, 1)
    if (state.petrodollars < cost) return false

    // Apply event time modifier if available (e.g. Speed Build Week = 0.5x)
    const eventTimeMult = getEventTimeMultiplier()
    const constructionTime = getConstructionTime(buildingType, 1, eventTimeMult)
    const endsAt = new Date(Date.now() + constructionTime * 1000).toISOString()

    const newPlots = [...state.plots]
    newPlots[plotIndex] = {
      ...plot,
      constructionType: buildingType,
      constructionLevel: 1,
      constructionEndsAt: endsAt,
    }

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      version: state.version + 1,
    })

    // XP awarded on completion, not start
    return true
  },

  upgradeBuilding: (x, y) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (!plot.building) return false
    if (plot.constructionEndsAt) return false // already upgrading
    if (plot.level >= MAX_BUILDING_LEVEL) return false

    // Check construction slot limit
    const activeConstructions = state.plots.filter((p) => p.constructionEndsAt).length
    if (activeConstructions >= MAX_CONSTRUCTION_SLOTS) return false

    const cost = getBuildingUpgradeCost(plot.building, plot.level)
    if (state.petrodollars < cost) return false

    const targetLevel = plot.level + 1
    const eventTimeMult2 = getEventTimeMultiplier()
    const constructionTime = getConstructionTime(plot.building, targetLevel, eventTimeMult2)
    const endsAt = new Date(Date.now() + constructionTime * 1000).toISOString()

    const newPlots = [...state.plots]
    newPlots[plotIndex] = {
      ...plot,
      // Keep current building+level — production continues at current rate
      constructionType: plot.building,
      constructionLevel: targetLevel,
      constructionEndsAt: endsAt,
    }

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      version: state.version + 1,
    })

    return true
  },

  /** Complete a construction if its timer has expired */
  completeConstruction: (x: number, y: number) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return

    const plot = state.plots[plotIndex]
    if (!plot.constructionEndsAt || !plot.constructionType) return
    if (new Date(plot.constructionEndsAt).getTime() > Date.now()) return

    const isNewBuild = plot.building === null
    const newPlots = [...state.plots]
    newPlots[plotIndex] = {
      ...plot,
      building: plot.constructionType,
      level: plot.constructionLevel ?? 1,
      builtAt: plot.builtAt ?? new Date().toISOString(),
      constructionType: null,
      constructionLevel: undefined,
      constructionEndsAt: null,
    }

    const derived = recalculateDerivedStats(
      newPlots, state.upgrades, state.prestigeMultiplier,
      get().stakingMultiplier, state.milestoneProductionBonus
    )

    set({ plots: newPlots, ...derived })
    get()._awardXP(isNewBuild ? XP_BUILDING_BUILT : XP_BUILDING_UPGRADED)
  },

  /** Spend petrodollars to instantly finish a construction */
  instantFinish: (x: number, y: number) => {
    const state = get()
    const plot = state.plots.find((p) => p.x === x && p.y === y)
    if (!plot?.constructionEndsAt) return false

    const remainingMs = Math.max(0, new Date(plot.constructionEndsAt).getTime() - Date.now())
    const remainingSec = Math.ceil(remainingMs / 1000)
    const cost = remainingSec * INSTANT_FINISH_COST_PER_SECOND

    if (state.petrodollars < cost) return false

    // Set the construction end to now so completeConstruction picks it up
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    const newPlots = [...state.plots]
    newPlots[plotIndex] = { ...newPlots[plotIndex], constructionEndsAt: new Date().toISOString() }
    set({ plots: newPlots, petrodollars: state.petrodollars - cost })
    get().completeConstruction(x, y)
    return true
  },

  purchaseUpgrade: (type) => {
    const state = get()
    const currentLevel = state.upgrades[type]
    if (!canPurchaseUpgrade(type, currentLevel)) return false

    const cost = getUpgradeCost(type, currentLevel)
    if (state.petrodollars < cost) return false

    const newUpgrades = { ...state.upgrades, [type]: currentLevel + 1 }
    const derived = recalculateDerivedStats(
      state.plots, newUpgrades, state.prestigeMultiplier,
      get().stakingMultiplier, state.milestoneProductionBonus
    )

    set({
      upgrades: newUpgrades,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })

    get()._awardXP(XP_UPGRADE_PURCHASED)
    return true
  },

  sellCrudeOil: (amount) => {
    const state = get()
    const toSell = Math.min(amount, state.crudeOil)
    if (toSell <= 0) return false

    // Use server-authoritative crude market price
    const { crudeMult } = getServerMarketPrices()
    const effectiveMult = crudeMult || state.marketMultiplier
    const effectiveRate = CRUDE_OIL_SELL_RATE * effectiveMult * state.streakMultiplier * state.milestoneCashBonus
    const earned = Math.floor(toSell * effectiveRate)
    const newXP = state.xp + xpFromSale(earned)

    set({
      crudeOil: state.crudeOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
      marketMultiplier: effectiveMult,
      xp: newXP,
      xpLevel: getLevelFromXP(newXP),
    })
    return true
  },

  sellRefinedOil: (amount) => {
    const state = get()
    const toSell = Math.min(amount, state.refinedOil)
    if (toSell <= 0) return false

    // Use server-authoritative refined market price
    const { refinedMult } = getServerMarketPrices()
    const effectiveRefinedMult = refinedMult || state.marketMultiplier
    const effectiveRate = REFINED_OIL_SELL_RATE * effectiveRefinedMult * state.streakMultiplier * state.milestoneCashBonus
    const earned = Math.floor(toSell * effectiveRate)
    const newXP = state.xp + xpFromSale(earned)

    set({
      refinedOil: state.refinedOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
      xp: newXP,
      xpLevel: getLevelFromXP(newXP),
    })
    return true
  },

  sellAllCrude: () => get().sellCrudeOil(get().crudeOil),
  sellAllRefined: () => get().sellRefinedOil(get().refinedOil),

  claimDailyReward: (loginStreak) => {
    const dayIndex = (loginStreak - 1) % 7
    const reward = DAILY_REWARDS[dayIndex]
    const streakMult = 1 + Math.min(loginStreak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS)

    set((state) => {
      const update: Partial<GameState> = {
        loginStreak,
        streakMultiplier: streakMult,
      }
      if (reward.type === 'petrodollars') {
        update.petrodollars = state.petrodollars + reward.amount
        update.lifetimePetrodollars = state.lifetimePetrodollars + reward.amount
      } else if (reward.type === 'crude_oil') {
        update.crudeOil = Math.min(state.crudeOil + reward.amount, state.storageCapacity)
      }
      return update
    })
  },

  prestige: () => {
    const state = get()
    if (!canPrestige(state)) return false

    const newState = performPrestige(state)
    set(newState)
    get()._recalculate()
    return true
  },

  refreshMarket: () => {
    set({ marketMultiplier: getMarketMultiplier(Date.now()) })
  },

  applyTempMultiplier: (multiplier, durationMs) => {
    set({
      activeTempMultiplier: multiplier,
      activeTempMultiplierExpiresAt: Date.now() + durationMs,
    })
  },

  setStakingMultiplier: (multiplier) => {
    set({ stakingMultiplier: multiplier })
    // Immediately recalculate production rate with new staking bonus
    get()._recalculate()
  },

  hydrate: (server) => {
    const upgrades = server.upgrades_data ?? createInitialUpgrades()

    set({
      crudeOil:             server.crude_oil ?? 0,
      refinedOil:           server.refined_oil ?? 0,
      petrodollars:         server.petrodollars ?? STARTING_PETRODOLLARS,
      plots:                server.plots_data ?? [],
      unlockedTileCount:    server.unlocked_tile_count ?? 1,
      upgrades,
      productionRate:       server.production_rate ?? 0,
      storageCapacity:      server.storage_capacity ?? STARTING_STORAGE,
      refineryRate:         server.refinery_rate ?? 0,
      prestigeLevel:        server.prestige_level ?? 0,
      prestigeMultiplier:   server.prestige_multiplier ?? 1.0,
      blackGold:            server.black_gold ?? 0,
      xp:                   server.xp ?? 0,
      xpLevel:              server.xp_level ?? 0,
      milestoneProductionBonus: server.milestone_production_bonus ?? 1.0,
      milestoneCashBonus:   server.milestone_cash_bonus ?? 1.0,
      loginStreak:          server.login_streak ?? 0,
      streakMultiplier:     server.streak_multiplier ?? 1.0,
      marketMultiplier:     getMarketMultiplier(Date.now()),
      activeTempMultiplier: 1.0,
      activeTempMultiplierExpiresAt: null,
      lifetimeBarrels:      server.lifetime_barrels ?? 0,
      lifetimePetrodollars: server.lifetime_petrodollars ?? 0,
      lastTickAt:           new Date(server.last_tick_at).getTime(),
      version:              server.version ?? 1,
    })

    // Recalculate derived stats from the loaded plots + upgrades
    get()._recalculate()
  },

  serialize: (): ServerGameState => {
    const s = get()
    return {
      wallet_address:          '',   // filled in by save route from JWT
      crude_oil:               s.crudeOil,
      refined_oil:             s.refinedOil,
      petrodollars:            s.petrodollars,
      plots_data:              s.plots,
      unlocked_tile_count:     s.unlockedTileCount,
      upgrades_data:           s.upgrades,
      production_rate:         s.productionRate,
      storage_capacity:        s.storageCapacity,
      refinery_rate:           s.refineryRate,
      last_tick_at:            new Date(s.lastTickAt).toISOString(),
      version:                 s.version,
      prestige_level:          s.prestigeLevel,
      prestige_multiplier:     s.prestigeMultiplier,
      black_gold:              s.blackGold,
      xp:                      s.xp,
      xp_level:                s.xpLevel,
      milestone_production_bonus: s.milestoneProductionBonus,
      milestone_cash_bonus:    s.milestoneCashBonus,
      login_streak:            s.loginStreak,
      streak_multiplier:       s.streakMultiplier,
      lifetime_barrels:        s.lifetimeBarrels,
      lifetime_petrodollars:   s.lifetimePetrodollars,
    }
  },

  reset: () => {
    set({ ...createInitialGameState(), stakingMultiplier: 1.0 })
  },

  _recalculate: () => {
    const state = get()
    const derived = recalculateDerivedStats(
      state.plots,
      state.upgrades,
      state.prestigeMultiplier,
      state.stakingMultiplier, // correctly applied — was always 1.0 before this fix
      state.milestoneProductionBonus
    )
    set(derived)
  },

  _awardXP: (amount) => {
    set((state) => {
      const newXP = state.xp + amount
      return { xp: newXP, xpLevel: getLevelFromXP(newXP) }
    })
  },

  _applyMilestoneBonuses: (prevBarrels, newBarrels) => {
    for (const milestone of BARREL_MILESTONES) {
      if (prevBarrels < milestone.threshold && newBarrels >= milestone.threshold) {
        set((state) => ({
          petrodollars: state.petrodollars + milestone.cashReward,
          lifetimePetrodollars: state.lifetimePetrodollars + milestone.cashReward,
          milestoneProductionBonus: state.milestoneProductionBonus * milestone.productionBonus,
          milestoneCashBonus: state.milestoneCashBonus * milestone.cashBonus,
        }))
        get()._recalculate()
        get()._awardXP(500)
      }
    }
  },
}))
