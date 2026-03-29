/**
 * Server-side Economy Engine
 *
 * Shared functions used by server-authoritative API routes to validate
 * and execute economy actions. All cost calculations, resource checks,
 * and state transitions live here — never trust client values.
 *
 * This module is imported only by API routes (server-side).
 */

import type { GridCell, BuildingType, UpgradeType } from '@/engine/types'
import { getBuildingCost, getBuildingUpgradeCost, isBuildingAvailable } from '@/engine/buildings'
import { getConstructionTime, INSTANT_FINISH_COST_PER_SECOND, MAX_CONSTRUCTION_SLOTS, MAX_BUILDING_LEVEL, GRID_SIZE, TILE_UNLOCK_COSTS } from '@/engine/constants'
import { recalculateDerivedStats } from '@/engine/production'
import { generateMarketSnapshot } from '@/engine/market'

// ── Sell ────────────────────────────────────────────────────────────────────

export interface SellResult {
  earned: number
  newCrudeOil: number
  newRefinedOil: number
  newPetrodollars: number
  marketMult: number
}

/** Calculate and execute a crude oil sale. Returns null if nothing to sell. */
export function executeSellCrude(
  crudeOil: number,
  petrodollars: number,
  streakMultiplier: number,
  milestoneCashBonus: number,
  eventSellMult: number,
): SellResult | null {
  if (crudeOil < 1) return null
  const market = generateMarketSnapshot()
  const effectiveRate = 1 * market.crudeMult * eventSellMult * streakMultiplier * milestoneCashBonus
  const earned = Math.floor(crudeOil * effectiveRate)
  return {
    earned,
    newCrudeOil: 0,
    newRefinedOil: 0, // not changed
    newPetrodollars: petrodollars + earned,
    marketMult: market.crudeMult,
  }
}

/** Calculate and execute a refined oil sale. Returns null if nothing to sell. */
export function executeSellRefined(
  refinedOil: number,
  petrodollars: number,
  streakMultiplier: number,
  milestoneCashBonus: number,
  eventSellMult: number,
): SellResult | null {
  if (refinedOil < 1) return null
  const market = generateMarketSnapshot()
  const effectiveRate = 4 * market.refinedMult * eventSellMult * streakMultiplier * milestoneCashBonus
  const earned = Math.floor(refinedOil * effectiveRate)
  return {
    earned,
    newCrudeOil: 0, // not changed
    newRefinedOil: 0,
    newPetrodollars: petrodollars + earned,
    marketMult: market.refinedMult,
  }
}

// ── Build / Upgrade ─────────────────────────────────────────────────────────

export interface BuildStartResult {
  cost: number
  constructionEndsAt: string
  newPetrodollars: number
}

/** Validate and start building construction. Returns null if invalid. */
export function validateBuildStart(
  plots: GridCell[],
  x: number,
  y: number,
  buildingType: BuildingType,
  petrodollars: number,
  unlockedTileCount: number,
  eventTimeMult: number,
): BuildStartResult | null {
  const plot = plots.find((p) => p.x === x && p.y === y)
  if (!plot || plot.status !== 'unlocked') return null
  if (plot.building !== null || plot.constructionType) return null
  if (!isBuildingAvailable(buildingType, unlockedTileCount)) return null

  const activeConstructions = plots.filter((p) => p.constructionEndsAt).length
  if (activeConstructions >= MAX_CONSTRUCTION_SLOTS) return null

  const cost = getBuildingCost(buildingType, 1)
  if (petrodollars < cost) return null

  const constructionTime = getConstructionTime(buildingType, 1, eventTimeMult)
  const endsAt = new Date(Date.now() + constructionTime * 1000).toISOString()

  return { cost, constructionEndsAt: endsAt, newPetrodollars: petrodollars - cost }
}

export interface UpgradeStartResult {
  cost: number
  targetLevel: number
  constructionEndsAt: string
  newPetrodollars: number
}

/** Validate and start building upgrade. Returns null if invalid. */
export function validateUpgradeStart(
  plots: GridCell[],
  x: number,
  y: number,
  petrodollars: number,
  eventTimeMult: number,
): UpgradeStartResult | null {
  const plot = plots.find((p) => p.x === x && p.y === y)
  if (!plot || !plot.building) return null
  if (plot.constructionEndsAt) return null // already upgrading
  if (plot.level >= MAX_BUILDING_LEVEL) return null

  const activeConstructions = plots.filter((p) => p.constructionEndsAt).length
  if (activeConstructions >= MAX_CONSTRUCTION_SLOTS) return null

  const cost = getBuildingUpgradeCost(plot.building, plot.level)
  if (petrodollars < cost) return null

  const targetLevel = plot.level + 1
  const constructionTime = getConstructionTime(plot.building, targetLevel, eventTimeMult)
  const endsAt = new Date(Date.now() + constructionTime * 1000).toISOString()

  return { cost, targetLevel, constructionEndsAt: endsAt, newPetrodollars: petrodollars - cost }
}

// ── Construction Completion ─────────────────────────────────────────────────

/** Validate that a construction has legitimately completed (timestamp check) */
export function validateConstructionComplete(plot: GridCell): boolean {
  if (!plot.constructionEndsAt || !plot.constructionType) return false
  return new Date(plot.constructionEndsAt).getTime() <= Date.now()
}

// ── Instant Finish ──────────────────────────────────────────────────────────

export interface InstantFinishResult {
  cost: number
  newPetrodollars: number
}

/** Calculate instant-finish cost from server-known construction end time */
export function validateInstantFinish(
  plot: GridCell,
  petrodollars: number,
): InstantFinishResult | null {
  if (!plot.constructionEndsAt) return null
  const remainingMs = Math.max(0, new Date(plot.constructionEndsAt).getTime() - Date.now())
  const remainingSec = Math.ceil(remainingMs / 1000)
  const cost = remainingSec * INSTANT_FINISH_COST_PER_SECOND
  if (petrodollars < cost) return null
  return { cost, newPetrodollars: petrodollars - cost }
}

// ── Tile Unlock ─────────────────────────────────────────────────────────────

/** Validate tile unlock eligibility and return cost. */
export function validateTileUnlock(
  plots: GridCell[],
  x: number,
  y: number,
  petrodollars: number,
): { cost: number; newPetrodollars: number } | null {
  const plot = plots.find((p) => p.x === x && p.y === y)
  if (!plot || plot.status !== 'available') return null
  if (petrodollars < plot.unlockCost) return null
  return { cost: plot.unlockCost, newPetrodollars: petrodollars - plot.unlockCost }
}

// ── Construction Timer Validation (for save route) ──────────────────────────

/**
 * Validate construction timestamps in saved plots.
 * Returns list of plots with suspicious timestamps clamped.
 */
export function validateConstructionTimers(
  clientPlots: GridCell[],
  serverPlots: GridCell[],
): GridCell[] {
  return clientPlots.map((cp) => {
    if (!cp.constructionEndsAt || !cp.constructionType) return cp

    // Find matching server plot
    const sp = serverPlots.find((p) => p.x === cp.x && p.y === cp.y)

    // If server had a construction end time, client can't make it earlier
    if (sp?.constructionEndsAt) {
      const serverEnd = new Date(sp.constructionEndsAt).getTime()
      const clientEnd = new Date(cp.constructionEndsAt).getTime()
      if (clientEnd < serverEnd - 2000) {
        // Client tried to shorten timer — reject, keep server time
        return { ...cp, constructionEndsAt: sp.constructionEndsAt }
      }
    }

    // If server had no construction but client claims one ending in the past,
    // that's suspicious — the client fabricated a completed construction
    if (!sp?.constructionEndsAt && new Date(cp.constructionEndsAt).getTime() < Date.now() - 5000) {
      // Strip the fabricated construction
      return { ...cp, constructionType: null, constructionLevel: undefined, constructionEndsAt: null }
    }

    return cp
  })
}
