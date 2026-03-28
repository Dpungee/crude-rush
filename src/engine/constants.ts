// ============================================================
// Crude Rush - Game Balance Constants
// All tuning numbers in one place
// ============================================================

/** Game tick interval in milliseconds */
export const TICK_INTERVAL_MS = 1000

/** Auto-save interval in milliseconds */
export const SAVE_INTERVAL_MS = 30_000

/** Grid dimensions */
export const GRID_SIZE = 7
export const GRID_CENTER = 3 // index of center tile in a 7x7 grid

/** Tile unlock costs by Chebyshev distance from center */
export const TILE_UNLOCK_COSTS: Record<number, number> = {
  0: 0,    // center tile — free
  1: 50,   // ring 1 (8 tiles)
  2: 150,  // ring 2 (16 tiles)
  3: 400,  // ring 3 (24 tiles)
}

/** Maximum offline income duration in seconds (8 hours base) */
export const BASE_OFFLINE_SECONDS = 28_800

/** Starting petrodollars for new players */
export const STARTING_PETRODOLLARS = 100

/** Starting storage capacity in barrels */
export const STARTING_STORAGE = 200

/** Prestige thresholds */
export const PRESTIGE_BASE_THRESHOLD = 10_000
export const PRESTIGE_THRESHOLD_MULTIPLIER = 2
export const PRESTIGE_BONUS_PER_LEVEL = 0.1

/** Refinery conversion: 1 crude → this much refined */
export const REFINERY_CONVERSION_RATIO = 0.5

/** Refined oil is worth this many petrodollars per unit when sold */
export const REFINED_OIL_SELL_RATE = 15

/** Crude oil is worth this many petrodollars per unit when sold */
export const CRUDE_OIL_SELL_RATE = 2

/** Daily reward schedule (day 1-7, then resets) */
export const DAILY_REWARDS = [
  { day: 1, type: 'petrodollars' as const, amount: 50 },
  { day: 2, type: 'petrodollars' as const, amount: 100 },
  { day: 3, type: 'crude_oil' as const, amount: 50 },
  { day: 4, type: 'petrodollars' as const, amount: 200 },
  { day: 5, type: 'crude_oil' as const, amount: 150 },
  { day: 6, type: 'petrodollars' as const, amount: 350 },
  { day: 7, type: 'petrodollars' as const, amount: 500 },
] as const

/** Tolerance factor for server-side save validation */
export const VALIDATION_TOLERANCE = 1.1
