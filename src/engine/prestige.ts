import type { GameState, GridCell, UpgradeType } from './types'
import {
  PRESTIGE_BASE_THRESHOLD,
  PRESTIGE_THRESHOLD_MULTIPLIER,
  PRESTIGE_BONUS_PER_LEVEL,
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
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
 * Perform a prestige reset (the "Wildcatter Reset").
 * - Increments prestige level
 * - Resets all resources, buildings, and upgrades
 * - Keeps lifetime stats and prestige data
 */
export function performPrestige(state: GameState): GameState {
  const newPrestigeLevel = state.prestigeLevel + 1
  const newMultiplier = getPrestigeMultiplier(newPrestigeLevel)

  // Create fresh 3x3 grid
  const cells: GridCell[] = []
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      cells.push({ x, y, building: null, level: 0, builtAt: null, pendingOil: 0 })
    }
  }

  // Reset upgrades to 0
  const upgrades: Record<UpgradeType, number> = {
    well_speed: 0,
    storage_cap: 0,
    refinery_eff: 0,
    auto_collect: 0,
    offline_duration: 0,
  }

  return {
    ...state,
    // Reset resources
    crudeOil: 0,
    refinedOil: 0,
    petrodollars: STARTING_PETRODOLLARS,

    // Reset grid
    gridSize: 3,
    cells,

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
