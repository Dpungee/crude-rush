import { XP_REWARDS } from './constants'

// ─── Level thresholds ─────────────────────────────────────────────────────────
/**
 * XP required to advance FROM level N to level N+1.
 * Formula: 100 × level^1.8
 *
 * Level 1 → 2:   100
 * Level 5 → 6:   1,741
 * Level 10 → 11: 6,310
 * Level 20 → 21: 23,325
 */
export function xpRequiredForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.8))
}

/**
 * Cumulative XP required to reach level N from 0.
 * (Sum of xpRequiredForNextLevel(1) through xpRequiredForNextLevel(N))
 */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let i = 1; i <= level; i++) {
    total += xpRequiredForNextLevel(i)
  }
  return total
}

/**
 * Determine current XP level from cumulative XP.
 * Efficient binary-search style loop.
 */
export function getLevelFromXP(xp: number): number {
  let level = 0
  while (totalXpForLevel(level + 1) <= xp) {
    level++
  }
  return level
}

/**
 * XP progress within the current level (for progress bars).
 * Returns { current, required, fraction }
 */
export function xpProgress(xp: number): {
  level: number
  current: number
  required: number
  fraction: number
} {
  const level = getLevelFromXP(xp)
  const xpAtCurrentLevel = totalXpForLevel(level)
  const required = xpRequiredForNextLevel(level + 1)
  const current = xp - xpAtCurrentLevel

  return {
    level,
    current,
    required,
    fraction: required > 0 ? current / required : 1,
  }
}

// ─── XP award helpers ─────────────────────────────────────────────────────────

/** XP awarded when a tile is unlocked */
export const XP_TILE_UNLOCKED = XP_REWARDS.tile_unlocked

/** XP awarded when a building is constructed */
export const XP_BUILDING_BUILT = XP_REWARDS.building_built

/** XP awarded when a building is upgraded */
export const XP_BUILDING_UPGRADED = XP_REWARDS.building_upgraded

/** XP awarded when a global upgrade is purchased */
export const XP_UPGRADE_PURCHASED = XP_REWARDS.upgrade_purchased

/** XP awarded when a barrel milestone is reached */
export const XP_BARREL_MILESTONE = XP_REWARDS.barrel_milestone

/** XP awarded on prestige */
export const XP_PRESTIGE = XP_REWARDS.prestige_reset

/**
 * XP from oil sold.
 * 1 XP per 1,000 petrodollars earned.
 */
export function xpFromSale(petrodollarsEarned: number): number {
  return Math.floor(petrodollarsEarned / 1_000) * XP_REWARDS.oil_sold_k
}
