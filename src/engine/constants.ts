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

// ─── Tile Unlock Costs ────────────────────────────────────────────────────────
/**
 * Base tile unlock cost by Chebyshev distance from center.
 * Corner tiles (where dx == dy == ring) cost an extra 30%.
 * See getTileUnlockCost() in prestige.ts.
 *
 * Total to unlock all 49 tiles: ~$325K
 *   Ring 1 (8 tiles):  ~$1,000
 *   Ring 2 (16 tiles): ~$25,000
 *   Ring 3 (24 tiles): ~$300,000
 */
export const TILE_UNLOCK_COSTS: Record<number, number> = {
  0: 0,      // center tile — free
  1: 100,    // ring 1 (4 edge × $100, 4 corner × $130)
  2: 1_500,  // ring 2 (12 edge × $1,500, 4 corner × $1,950)
  3: 12_500, // ring 3 (20 edge × $12,500, 4 corner × $16,250)
}

// ─── Offline & Timing ─────────────────────────────────────────────────────────
/** Maximum offline income duration in seconds (8 hours base) */
export const BASE_OFFLINE_SECONDS = 28_800

/**
 * Offline production efficiency (fraction of live rate).
 * 0.5 = 50% — returning players feel rewarded without breaking balance.
 */
export const OFFLINE_EFFICIENCY = 0.5

// ─── Starting Values ──────────────────────────────────────────────────────────
/** Starting petrodollars for new players */
export const STARTING_PETRODOLLARS = 100

/** Starting storage capacity in barrels */
export const STARTING_STORAGE = 500

// ─── Economy ──────────────────────────────────────────────────────────────────
/** Crude oil sell rate: petrodollars per barrel */
export const CRUDE_OIL_SELL_RATE = 1

/**
 * Refined oil sell rate: petrodollars per barrel.
 * 4× crude value. But REFINERY_CONVERSION_RATIO = 0.5 (2 crude → 1 refined),
 * so net effective gain vs selling raw crude = 2×.
 */
export const REFINED_OIL_SELL_RATE = 4

/** Refinery conversion: 1 crude consumed → 0.5 refined produced */
export const REFINERY_CONVERSION_RATIO = 0.5

// ─── Market Fluctuation ──────────────────────────────────────────────────────
/**
 * Sell price sine wave amplitude (±20%).
 * Price drifts between 0.80× and 1.20× on a 10-minute cycle.
 * Cosmetic — adds texture; never drops below 80¢/bbl.
 */
export const MARKET_FLUCTUATION_AMPLITUDE = 0.20
export const MARKET_FLUCTUATION_PERIOD_MS = 10 * 60 * 1000

// ─── Prestige ─────────────────────────────────────────────────────────────────
/**
 * Lifetime barrels required for first prestige.
 * Doubles each run: 10M → 20M → 40M…
 */
export const PRESTIGE_BASE_THRESHOLD = 10_000_000
export const PRESTIGE_THRESHOLD_MULTIPLIER = 2

/**
 * Multiplier bonus per prestige level.
 * Formula: 1 + PRESTIGE_BONUS_PER_LEVEL × prestigeLevel
 * P1 → 1.5×, P2 → 2.0×, P10 → 6.0×
 */
export const PRESTIGE_BONUS_PER_LEVEL = 0.5

/** 1 Black Gold per this many lifetime barrels, earned at prestige */
export const BARRELS_PER_BLACK_GOLD = 1_000_000

// ─── Daily Login Rewards ──────────────────────────────────────────────────────
export const DAILY_REWARDS = [
  { day: 1, type: 'petrodollars' as const, amount: 1_000 },
  { day: 2, type: 'petrodollars' as const, amount: 2_000 },
  { day: 3, type: 'petrodollars' as const, amount: 5_000 },
  { day: 4, type: 'petrodollars' as const, amount: 3_000 },
  { day: 5, type: 'petrodollars' as const, amount: 10_000 },
  { day: 6, type: 'crude_oil'    as const, amount: 5_000 },
  { day: 7, type: 'petrodollars' as const, amount: 25_000 },
] as const

/** +1% sell bonus per consecutive login day, max +30% at Day 30 */
export const STREAK_BONUS_PER_DAY = 0.01
export const MAX_STREAK_BONUS     = 0.30

// ─── Barrel Milestones ────────────────────────────────────────────────────────
export interface BarrelMilestone {
  threshold: number
  cashReward: number
  /** Micro-$CRUDE (÷1e6 for display) */
  tokenMicroReward: number
  title: string | null
  /** Multiplicative production bonus applied permanently (1.05 = +5%) */
  productionBonus: number
  /** Multiplicative cash bonus applied permanently */
  cashBonus: number
}

export const BARREL_MILESTONES: BarrelMilestone[] = [
  { threshold: 1_000,       cashReward: 500,     tokenMicroReward: 50_000_000,       title: null,                productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 10_000,      cashReward: 2_500,   tokenMicroReward: 100_000_000,      title: 'Roughneck',         productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 100_000,     cashReward: 15_000,  tokenMicroReward: 250_000_000,      title: 'Wildcatter',        productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 1_000_000,   cashReward: 75_000,  tokenMicroReward: 1_000_000_000,   title: 'Oil Baron',         productionBonus: 1.05, cashBonus: 1.0  },
  { threshold: 10_000_000,  cashReward: 400_000, tokenMicroReward: 5_000_000_000,   title: 'Tycoon',            productionBonus: 1.0,  cashBonus: 1.10 },
  { threshold: 100_000_000, cashReward: 0,       tokenMicroReward: 25_000_000_000,  title: 'Magnate',           productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 1_000_000_000, cashReward: 0,     tokenMicroReward: 100_000_000_000, title: 'Crude Rush Legend', productionBonus: 1.25, cashBonus: 1.0  },
]

// ─── XP Rewards ──────────────────────────────────────────────────────────────
export const XP_REWARDS = {
  tile_unlocked:     200,
  building_built:    100,
  building_upgraded:  50,
  upgrade_purchased: 150,
  barrel_milestone:  500,
  prestige_reset:  2_000,
  oil_sold_k:          1, // 1 XP per 1,000 petrodollars earned
} as const

/** Server-side save validation tolerance */
export const VALIDATION_TOLERANCE = 1.15
