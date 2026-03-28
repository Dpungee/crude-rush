import { create } from 'zustand'
import type { GameState, GridCell, BuildingType, UpgradeType, ServerGameState } from '@/engine/types'
import { tick } from '@/engine/tick'
import { recalculateDerivedStats } from '@/engine/production'
import { getBuildingCost, getBuildingUpgradeCost } from '@/engine/buildings'
import { getUpgradeCost, canPurchaseUpgrade } from '@/engine/upgrades'
import { createInitialGrid, performPrestige, canPrestige } from '@/engine/prestige'
import { getLevelFromXP, xpFromSale, XP_BUILDING_BUILT, XP_BUILDING_UPGRADED, XP_TILE_UNLOCKED, XP_UPGRADE_PURCHASED } from '@/engine/xp'
import { getMarketMultiplier } from '@/engine/market'
import {
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
  CRUDE_OIL_SELL_RATE,
  REFINED_OIL_SELL_RATE,
  GRID_SIZE,
  GRID_CENTER,
  STREAK_BONUS_PER_DAY,
  MAX_STREAK_BONUS,
  BARREL_MILESTONES,
  DAILY_REWARDS,
} from '@/engine/constants'

function createInitialUpgrades(): Record<UpgradeType, number> {
  return {
    extraction_speed: 0,
    storage_expansion: 0,
    refinery_efficiency: 0,
    auto_sell: 0,
    offline_duration: 0,
  }
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

  tick: () => {
    const state = get()
    const now = Date.now()
    const deltaMs = Math.min(now - state.lastTickAt, 5000)
    if (deltaMs <= 0) return

    const newState = tick(state, deltaMs)

    // Check for milestone unlocks from barrel gains
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

    // Make adjacent locked tiles 'available'
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
    if (plot.building !== null) return false

    const cost = getBuildingCost(buildingType, 1)
    if (state.petrodollars < cost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = {
      ...plot,
      building: buildingType,
      level: 1,
      builtAt: new Date().toISOString(),
    }

    const derived = recalculateDerivedStats(
      newPlots, state.upgrades, state.prestigeMultiplier, 1.0, state.milestoneProductionBonus
    )

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })

    get()._awardXP(XP_BUILDING_BUILT)
    return true
  },

  upgradeBuilding: (x, y) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (!plot.building) return false

    const cost = getBuildingUpgradeCost(plot.building, plot.level)
    if (state.petrodollars < cost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = { ...plot, level: plot.level + 1 }

    const derived = recalculateDerivedStats(
      newPlots, state.upgrades, state.prestigeMultiplier, 1.0, state.milestoneProductionBonus
    )

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })

    get()._awardXP(XP_BUILDING_UPGRADED)
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
      state.plots, newUpgrades, state.prestigeMultiplier, 1.0, state.milestoneProductionBonus
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

    const effectiveRate = CRUDE_OIL_SELL_RATE * state.marketMultiplier * state.streakMultiplier * state.milestoneCashBonus
    const earned = toSell * effectiveRate

    const xpGained = xpFromSale(earned)
    const newXP = state.xp + xpGained

    set({
      crudeOil: state.crudeOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
      xp: newXP,
      xpLevel: getLevelFromXP(newXP),
    })
    return true
  },

  sellRefinedOil: (amount) => {
    const state = get()
    const toSell = Math.min(amount, state.refinedOil)
    if (toSell <= 0) return false

    const effectiveRate = REFINED_OIL_SELL_RATE * state.marketMultiplier * state.streakMultiplier * state.milestoneCashBonus
    const earned = toSell * effectiveRate

    const xpGained = xpFromSale(earned)
    const newXP = state.xp + xpGained

    set({
      refinedOil: state.refinedOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
      xp: newXP,
      xpLevel: getLevelFromXP(newXP),
    })
    return true
  },

  sellAllCrude: () => {
    const state = get()
    return get().sellCrudeOil(state.crudeOil)
  },

  sellAllRefined: () => {
    const state = get()
    return get().sellRefinedOil(state.refinedOil)
  },

  claimDailyReward: (loginStreak) => {
    const dayIndex = ((loginStreak - 1) % 7)
    const reward = DAILY_REWARDS[dayIndex]
    const newStreak = loginStreak
    const streakMult = 1 + Math.min(newStreak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS)

    set((state) => {
      const update: Partial<GameState> = {
        loginStreak: newStreak,
        streakMultiplier: streakMult,
      }
      if (reward.type === 'petrodollars') {
        update.petrodollars = state.petrodollars + reward.amount
        update.lifetimePetrodollars = state.lifetimePetrodollars + reward.amount
      } else if (reward.type === 'crude_oil') {
        const newCrude = Math.min(state.crudeOil + reward.amount, state.storageCapacity)
        update.crudeOil = newCrude
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

  hydrate: (server) => {
    const upgrades = server.upgrades_data ?? createInitialUpgrades()

    set({
      crudeOil: server.crude_oil,
      refinedOil: server.refined_oil,
      petrodollars: server.petrodollars,
      plots: server.plots_data,
      unlockedTileCount: server.unlocked_tile_count,
      upgrades,
      productionRate: server.production_rate,
      storageCapacity: server.storage_capacity,
      refineryRate: server.refinery_rate,
      prestigeLevel: server.prestige_level,
      prestigeMultiplier: server.prestige_multiplier,
      blackGold: server.black_gold ?? 0,
      xp: server.xp ?? 0,
      xpLevel: server.xp_level ?? 0,
      milestoneProductionBonus: server.milestone_production_bonus ?? 1.0,
      milestoneCashBonus: server.milestone_cash_bonus ?? 1.0,
      loginStreak: server.login_streak ?? 0,
      streakMultiplier: server.streak_multiplier ?? 1.0,
      marketMultiplier: getMarketMultiplier(Date.now()),
      activeTempMultiplier: 1.0,
      activeTempMultiplierExpiresAt: null,
      lifetimeBarrels: server.lifetime_barrels,
      lifetimePetrodollars: server.lifetime_petrodollars,
      lastTickAt: new Date(server.last_tick_at).getTime(),
      version: server.version,
    })

    get()._recalculate()
  },

  serialize: (): ServerGameState => {
    const s = get()
    return {
      wallet_address: '',
      crude_oil: s.crudeOil,
      refined_oil: s.refinedOil,
      petrodollars: s.petrodollars,
      plots_data: s.plots,
      unlocked_tile_count: s.unlockedTileCount,
      upgrades_data: s.upgrades,
      production_rate: s.productionRate,
      storage_capacity: s.storageCapacity,
      refinery_rate: s.refineryRate,
      last_tick_at: new Date(s.lastTickAt).toISOString(),
      version: s.version,
      prestige_level: s.prestigeLevel,
      prestige_multiplier: s.prestigeMultiplier,
      black_gold: s.blackGold,
      xp: s.xp,
      xp_level: s.xpLevel,
      milestone_production_bonus: s.milestoneProductionBonus,
      milestone_cash_bonus: s.milestoneCashBonus,
      login_streak: s.loginStreak,
      streak_multiplier: s.streakMultiplier,
      lifetime_barrels: s.lifetimeBarrels,
      lifetime_petrodollars: s.lifetimePetrodollars,
    }
  },

  reset: () => {
    set(createInitialGameState())
  },

  _recalculate: () => {
    const state = get()
    const derived = recalculateDerivedStats(
      state.plots, state.upgrades, state.prestigeMultiplier, 1.0, state.milestoneProductionBonus
    )
    set(derived)
  },

  _awardXP: (amount) => {
    set((state) => {
      const newXP = state.xp + amount
      return { xp: newXP, xpLevel: getLevelFromXP(newXP) }
    })
  },

  /**
   * Check if any barrel milestones were crossed since last tick
   * and apply their permanent bonuses + cash rewards.
   * Milestone bonuses are compound-multiplicative.
   */
  _applyMilestoneBonuses: (prevBarrels, newBarrels) => {
    for (const milestone of BARREL_MILESTONES) {
      if (prevBarrels < milestone.threshold && newBarrels >= milestone.threshold) {
        set((state) => ({
          // One-time cash reward
          petrodollars: state.petrodollars + milestone.cashReward,
          lifetimePetrodollars: state.lifetimePetrodollars + milestone.cashReward,
          // Compound the permanent production bonus
          milestoneProductionBonus: state.milestoneProductionBonus * milestone.productionBonus,
          // Compound the permanent cash bonus
          milestoneCashBonus: state.milestoneCashBonus * milestone.cashBonus,
        }))
        // Recalculate production rate to reflect new bonus
        get()._recalculate()
        // Award XP
        get()._awardXP(500)
      }
    }
  },
}))
