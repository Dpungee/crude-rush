import type { GridCell, UpgradeType } from './types'
import { getBuildingProduction, getBuildingStorageBonus, getBuildingRefineryRate } from './buildings'
import { getWellSpeedMultiplier, getStorageCapBonus, getRefineryEffMultiplier } from './upgrades'
import { STARTING_STORAGE, REFINERY_CONVERSION_RATIO } from './constants'

/** Producer building types */
const PRODUCER_TYPES = new Set(['oil_well', 'pump_jack', 'derrick'])

/**
 * Calculate total crude oil production rate (barrels per second)
 * from all buildings, upgrades, and prestige multiplier.
 */
export function calculateProductionRate(
  cells: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): number {
  let totalProduction = 0

  // Count pipelines for flow bonus
  const pipelineCount = cells.filter((c) => c.building === 'pipeline').length
  const pipelineBonus = 1 + pipelineCount * 0.1 // +10% per pipeline

  for (const cell of cells) {
    if (!cell.building || !PRODUCER_TYPES.has(cell.building)) continue
    totalProduction += getBuildingProduction(cell.building, cell.level)
  }

  // Apply well speed upgrade multiplier
  const speedMultiplier = getWellSpeedMultiplier(upgrades.well_speed)

  // Apply pipeline bonus, well speed, and prestige
  return totalProduction * speedMultiplier * pipelineBonus * prestigeMultiplier
}

/**
 * Calculate total storage capacity from base + tanks + upgrades.
 */
export function calculateStorageCapacity(
  cells: GridCell[],
  upgrades: Record<UpgradeType, number>
): number {
  let tankBonus = 0

  for (const cell of cells) {
    if (cell.building === 'storage_tank') {
      tankBonus += getBuildingStorageBonus('storage_tank', cell.level)
    }
  }

  const upgradeBonus = getStorageCapBonus(upgrades.storage_cap)

  return STARTING_STORAGE + tankBonus + upgradeBonus
}

/**
 * Calculate total refinery processing rate (crude consumed per second).
 * The output is crude_consumed * REFINERY_CONVERSION_RATIO = refined produced.
 */
export function calculateRefineryRate(
  cells: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): number {
  let totalRate = 0

  for (const cell of cells) {
    if (cell.building === 'refinery') {
      totalRate += getBuildingRefineryRate('refinery', cell.level)
    }
  }

  const effMultiplier = getRefineryEffMultiplier(upgrades.refinery_eff)

  return totalRate * effMultiplier * prestigeMultiplier
}

/**
 * Recalculate all derived stats from the current game state pieces.
 * Returns { productionRate, storageCapacity, refineryRate }
 */
export function recalculateDerivedStats(
  cells: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): {
  productionRate: number
  storageCapacity: number
  refineryRate: number
} {
  return {
    productionRate: calculateProductionRate(cells, upgrades, prestigeMultiplier),
    storageCapacity: calculateStorageCapacity(cells, upgrades),
    refineryRate: calculateRefineryRate(cells, upgrades, prestigeMultiplier),
  }
}
