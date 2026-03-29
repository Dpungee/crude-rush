import type { GameState, GridCell, TileStatus } from './types'
import { createInitialUpgrades } from './upgrades'
import {
  PRESTIGE_BASE_THRESHOLD,
  PRESTIGE_THRESHOLD_MULTIPLIER,
  PRESTIGE_BONUS_PER_LEVEL,
  BARRELS_PER_BLACK_GOLD,
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
  GRID_SIZE,
  GRID_CENTER,
  TILE_UNLOCK_COSTS,
} from './constants'

/**
 * Get the lifetime barrels threshold required for the next prestige.
 * First prestige: 10M, second: 20M, third: 40M…
 */
export function getPrestigeThreshold(currentPrestigeLevel: number): number {
  return PRESTIGE_BASE_THRESHOLD * Math.pow(PRESTIGE_THRESHOLD_MULTIPLIER, currentPrestigeLevel)
}

/** Check if the player can perform a prestige reset */
export function canPrestige(state: GameState): boolean {
  return state.lifetimeBarrels >= getPrestigeThreshold(state.prestigeLevel)
}

/**
 * Production multiplier for a given prestige level.
 * P0 = 1.0×, P1 = 1.5×, P2 = 2.0×, P10 = 6.0×
 */
export function getPrestigeMultiplier(level: number): number {
  return 1 + PRESTIGE_BONUS_PER_LEVEL * level
}

/**
 * Black Gold earned when prestiging.
 * 1 BG per BARRELS_PER_BLACK_GOLD lifetime barrels.
 */
export function getBlackGoldEarned(lifetimeBarrels: number): number {
  return Math.floor(lifetimeBarrels / BARRELS_PER_BLACK_GOLD)
}

/**
 * Get the unlock cost for a specific tile, adding a 30% corner surcharge.
 * Corner tiles are where |dx| == |dy| == ring distance (the 4 exact corners).
 */
export function getTileUnlockCost(x: number, y: number): number {
  const dx = Math.abs(x - GRID_CENTER)
  const dy = Math.abs(y - GRID_CENTER)
  const dist = Math.max(dx, dy)
  const baseCost = TILE_UNLOCK_COSTS[dist] ?? TILE_UNLOCK_COSTS[3]
  // Exact corners (all 4) get a 30% premium
  const isCorner = dx === dist && dy === dist && dist > 0
  return isCorner ? Math.floor(baseCost * 1.3) : baseCost
}

/**
 * Create the initial 7×7 grid for a fresh start or prestige reset.
 * Center tile (3,3) starts unlocked; ring-1 tiles are 'available'; rest 'locked'.
 */
export function createInitialGrid(): GridCell[] {
  const plots: GridCell[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dist = Math.max(Math.abs(x - GRID_CENTER), Math.abs(y - GRID_CENTER))
      const unlockCost = getTileUnlockCost(x, y)
      let status: TileStatus = 'locked'
      if (dist === 0) status = 'unlocked'
      else if (dist === 1) status = 'available'
      plots.push({ x, y, status, building: null, level: 0, builtAt: null, unlockCost })
    }
  }
  return plots
}

/**
 * Perform a prestige reset (the "Wildcatter Reset").
 * - Increments prestige level and multiplier
 * - Awards Black Gold based on lifetime barrels
 * - Resets all resources, buildings, and upgrades
 * - Keeps lifetime stats, XP, milestones, and token balance
 */
export function performPrestige(state: GameState): GameState {
  const newPrestigeLevel = state.prestigeLevel + 1
  const newMultiplier = getPrestigeMultiplier(newPrestigeLevel)
  const blackGoldEarned = getBlackGoldEarned(state.lifetimeBarrels)

  const plots = createInitialGrid()
  const upgrades = createInitialUpgrades()

  return {
    ...state,
    // Reset resources
    crudeOil: 0,
    refinedOil: 0,
    petrodollars: STARTING_PETRODOLLARS,

    // Reset grid
    plots,
    unlockedTileCount: 1,

    // Reset derived stats
    productionRate: 0,
    storageCapacity: STARTING_STORAGE,
    refineryRate: 0,

    // Reset upgrades
    upgrades,

    // Update prestige
    prestigeLevel: newPrestigeLevel,
    prestigeMultiplier: newMultiplier,

    // Accumulate Black Gold
    blackGold: state.blackGold + blackGoldEarned,

    // Keep lifetime stats (never reset)
    lifetimeBarrels: state.lifetimeBarrels,
    lifetimePetrodollars: state.lifetimePetrodollars,

    // Keep XP, milestones, market, streak
    xp: state.xp,
    xpLevel: state.xpLevel,
    milestoneProductionBonus: state.milestoneProductionBonus,
    milestoneCashBonus: state.milestoneCashBonus,
    loginStreak: state.loginStreak,
    streakMultiplier: state.streakMultiplier,
    marketMultiplier: state.marketMultiplier,

    // Clear any temp buff
    activeTempMultiplier: 1.0,
    activeTempMultiplierExpiresAt: null,

    // Update timing
    lastTickAt: Date.now(),
    version: state.version + 1,
  }
}
