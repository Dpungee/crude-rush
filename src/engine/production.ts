import type { GridCell, UpgradeType } from './types'
import { getBuildingProduction, getBuildingStorageBonus, getBuildingRefineryRate } from './buildings'
import { getExtractionSpeedMultiplier, getStorageExpansionBonus } from './upgrades'
import { STARTING_STORAGE, REFINERY_CONVERSION_RATIO } from './constants'

/** Producer building types */
const PRODUCER_TYPES = new Set(['oil_well', 'pump_jack', 'derrick'])

/**
 * Calculate total crude oil production rate (barrels per second)
 * from all buildings, upgrades, and prestige multiplier.
 */
export function calculateProductionRate(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): number {
  let totalProduction = 0

  for (const plot of plots) {
    if (!plot.building || !PRODUCER_TYPES.has(plot.building)) continue
    totalProduction += getBuildingProduction(plot.building, plot.level)
  }

  const speedMultiplier = getExtractionSpeedMultiplier(upgrades.extraction_speed)

  return totalProduction * speedMultiplier * prestigeMultiplier
}

/**
 * Calculate total storage capacity from base + tanks + upgrades.
 */
export function calculateStorageCapacity(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>
): number {
  let tankBonus = 0

  for (const plot of plots) {
    if (plot.building === 'storage_tank') {
      tankBonus += getBuildingStorageBonus('storage_tank', plot.level)
    }
  }

  const upgradeBonus = getStorageExpansionBonus(upgrades.storage_expansion)

  return STARTING_STORAGE + tankBonus + upgradeBonus
}

/**
 * Calculate total refinery processing rate (crude consumed per second).
 * Output = crude_consumed * REFINERY_CONVERSION_RATIO = refined produced.
 */
export function calculateRefineryRate(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): number {
  let totalRate = 0

  for (const plot of plots) {
    if (plot.building === 'refinery') {
      totalRate += getBuildingRefineryRate('refinery', plot.level)
    }
  }

  return totalRate * prestigeMultiplier
}

/**
 * Recalculate all derived stats from the current game state pieces.
 */
export function recalculateDerivedStats(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number
): {
  productionRate: number
  storageCapacity: number
  refineryRate: number
} {
  return {
    productionRate: calculateProductionRate(plots, upgrades, prestigeMultiplier),
    storageCapacity: calculateStorageCapacity(plots, upgrades),
    refineryRate: calculateRefineryRate(plots, upgrades, prestigeMultiplier),
  }
}
