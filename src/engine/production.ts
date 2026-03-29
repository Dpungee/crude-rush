import type { GridCell, UpgradeType } from './types'
import { getBuildingProduction, getBuildingStorageBonus, getBuildingRefineryRate, BUILDING_DEFINITIONS } from './buildings'
import { getExtractionSpeedMultiplier, getStorageExpansionMultiplier, getRefineryEfficiencyMultiplier, getDeepDrillingMultiplier } from './upgrades'
import { STARTING_STORAGE, TILE_TRAITS } from './constants'

/** Building types that produce crude oil */
const PRODUCER_TYPES = new Set(['oil_well', 'pump_jack', 'derrick'])

/**
 * Calculate Oil Terminal aura multiplier for a specific producer tile.
 * Each terminal within Chebyshev radius 1 (excluding the tile itself) adds its auraBonus × level.
 * Multiple terminals stack additively: 2 L1 terminals → +40%.
 */
function getAuraMultiplier(plots: GridCell[], producerX: number, producerY: number): number {
  let bonus = 0
  for (const plot of plots) {
    if (plot.building !== 'oil_terminal') continue
    const dx = Math.abs(plot.x - producerX)
    const dy = Math.abs(plot.y - producerY)
    const dist = Math.max(dx, dy)
    const def = BUILDING_DEFINITIONS['oil_terminal']
    if (dist > 0 && dist <= def.auraRadius) {
      bonus += def.auraBonus * plot.level
    }
  }
  return 1 + bonus
}

/**
 * Calculate total crude oil production rate (barrels/second) from all buildings,
 * upgrades, prestige multiplier, staking bonus, Oil Terminal auras,
 * and permanent milestone production bonus.
 *
 * @param stakingMultiplier - from /api/game/staking-bonus (default 1.0)
 * @param milestoneBonus    - permanent production bonus from barrel milestones
 */
export function calculateProductionRate(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number,
  stakingMultiplier = 1.0,
  milestoneBonus = 1.0
): number {
  let totalProduction = 0

  for (const plot of plots) {
    if (!plot.building || !PRODUCER_TYPES.has(plot.building)) continue
    const base = getBuildingProduction(plot.building, plot.level)
    const aura = getAuraMultiplier(plots, plot.x, plot.y)
    const traitMult = TILE_TRAITS[plot.trait ?? 'normal']?.productionMultiplier ?? 1.0
    // Deep Drilling bonus: extra production on ring 3+ tiles
    const ring = plot.ring ?? 0
    const deepDrillMult = ring >= 3 ? getDeepDrillingMultiplier(upgrades.deep_drilling ?? 0) : 1.0
    totalProduction += base * aura * traitMult * deepDrillMult
  }

  const speedMultiplier = getExtractionSpeedMultiplier(upgrades.extraction_speed)

  return totalProduction * speedMultiplier * prestigeMultiplier * stakingMultiplier * milestoneBonus
}

/**
 * Calculate total storage capacity.
 * = (STARTING_STORAGE + tank bonuses) × storage_expansion multiplier
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

  const expansionMult = getStorageExpansionMultiplier(upgrades.storage_expansion)
  return Math.floor((STARTING_STORAGE + tankBonus) * expansionMult)
}

/**
 * Calculate refinery processing rate (crude/second consumed).
 * Refined output = rate × REFINERY_CONVERSION_RATIO.
 * Scaled by refinery_efficiency upgrade.
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

  const effMult = getRefineryEfficiencyMultiplier(upgrades.refinery_efficiency)
  return totalRate * effMult * prestigeMultiplier
}

/**
 * Recalculate all derived production stats.
 *
 * @param stakingMultiplier - from /api/game/staking-bonus (default 1.0)
 * @param milestoneBonus    - compound production bonus from barrel milestones
 */
export function recalculateDerivedStats(
  plots: GridCell[],
  upgrades: Record<UpgradeType, number>,
  prestigeMultiplier: number,
  stakingMultiplier = 1.0,
  milestoneBonus = 1.0
): {
  productionRate: number
  storageCapacity: number
  refineryRate: number
} {
  return {
    productionRate: calculateProductionRate(plots, upgrades, prestigeMultiplier, stakingMultiplier, milestoneBonus),
    storageCapacity: calculateStorageCapacity(plots, upgrades),
    refineryRate: calculateRefineryRate(plots, upgrades, prestigeMultiplier),
  }
}
