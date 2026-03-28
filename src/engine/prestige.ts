import type { GameState, GridCell, UpgradeType, TileStatus } from './types'
import {
  PRESTIGE_BASE_THRESHOLD,
  PRESTIGE_THRESHOLD_MULTIPLIER,
  PRESTIGE_BONUS_PER_LEVEL,
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
  GRID_SIZE,
  GRID_CENTER,
  TILE_UNLOCK_COSTS,
} from './constants'

/**
 * Get the lifetime barrels threshold required for the next prestige level.
 */
export function getPrestigeThreshold(currentPrestigeLevel: number): number {
  return PRESTIGE_BASE_THRESHOLD * Math.pow(PRESTIGE_THRESHOLD_MULTIPLIER, currentPrestigeLevel)
}

/**
 * Check if the player can perform a prestige reset.
 */
export function canPrestige(state: GameState): boolean {
  const threshold = getPrestigeThreshold(state.prestigeLevel)
  return state.lifetimeBarrels >= threshold
}

/**
 * Get the prestige multiplier for a given prestige level.
 */
export function getPrestigeMultiplier(level: number): number {
  return 1 + PRESTIGE_BONUS_PER_LEVEL * level
}

/**
 * Create the initial 7x7 grid for a fresh start or prestige reset.
 * Center tile (3,3) is unlocked; ring-1 tiles are 'available'; all others are 'locked'.
 */
export function createInitialGrid(): GridCell[] {
  const plots: GridCell[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dist = Math.max(Math.abs(x - GRID_CENTER), Math.abs(y - GRID_CENTER))
      const unlockCost = TILE_UNLOCK_COSTS[dist] ?? TILE_UNLOCK_COSTS[3]
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
 * - Increments prestige level
 * - Resets all resources, buildings, and upgrades
 * - Keeps lifetime stats and prestige data
 */
export function performPrestige(state: GameState): GameState {
  const newPrestigeLevel = state.prestigeLevel + 1
  const newMultiplier = getPrestigeMultiplier(newPrestigeLevel)

  const plots = createInitialGrid()

  const upgrades: Record<UpgradeType, number> = {
    extraction_speed: 0,
    storage_expansion: 0,
    auto_sell: 0,
    offline_duration: 0,
  }

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

    // Keep lifetime stats
    lifetimeBarrels: state.lifetimeBarrels,
    lifetimePetrodollars: state.lifetimePetrodollars,

    // Update timing
    lastTickAt: Date.now(),
    version: state.version + 1,
  }
}
