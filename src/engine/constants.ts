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
export const TILE_UNLOCK_COSTS: Record<number, number> = {
  0: 0,      // center tile — free
  1: 100,    // ring 1 (4 edge × $100, 4 corner × $130)
  2: 1_500,  // ring 2 (12 edge × $1,500, 4 corner × $1,950)
  3: 12_500, // ring 3 (20 edge × $12,500, 4 corner × $16,250)
}

// ─── Offline & Timing ─────────────────────────────────────────────────────────
export const BASE_OFFLINE_SECONDS = 28_800
export const OFFLINE_EFFICIENCY = 0.5

// ─── Starting Values ──────────────────────────────────────────────────────────
export const STARTING_PETRODOLLARS = 100
export const STARTING_STORAGE = 500

// ─── Economy ──────────────────────────────────────────────────────────────────
export const CRUDE_OIL_SELL_RATE = 1
export const REFINED_OIL_SELL_RATE = 4
export const REFINERY_CONVERSION_RATIO = 0.5

// ─── Market Fluctuation ──────────────────────────────────────────────────────
export const MARKET_FLUCTUATION_AMPLITUDE = 0.20
export const MARKET_FLUCTUATION_PERIOD_MS = 10 * 60 * 1000

// ─── Prestige ─────────────────────────────────────────────────────────────────
export const PRESTIGE_BASE_THRESHOLD = 10_000_000
export const PRESTIGE_THRESHOLD_MULTIPLIER = 2
export const PRESTIGE_BONUS_PER_LEVEL = 0.5
export const BARRELS_PER_BLACK_GOLD = 1_000_000

// ─── Daily Login Rewards ──────────────────────────────────────────────────────
// tokenMicroReward: micro-$CRUDE (÷1e6 for display). 0 = no token on that day.
// Day 4, 5, 6, 7 include token bonuses — reward loyalty with real value.
export const DAILY_REWARDS = [
  { day: 1, type: 'petrodollars' as const, amount: 1_000,  tokenMicroReward: 0           },
  { day: 2, type: 'petrodollars' as const, amount: 2_000,  tokenMicroReward: 0           },
  { day: 3, type: 'petrodollars' as const, amount: 5_000,  tokenMicroReward: 0           },
  { day: 4, type: 'petrodollars' as const, amount: 3_000,  tokenMicroReward: 1_000_000   }, // 1 $CRUDE
  { day: 5, type: 'petrodollars' as const, amount: 10_000, tokenMicroReward: 2_000_000   }, // 2 $CRUDE
  { day: 6, type: 'crude_oil'    as const, amount: 5_000,  tokenMicroReward: 5_000_000   }, // 5 $CRUDE
  { day: 7, type: 'petrodollars' as const, amount: 25_000, tokenMicroReward: 10_000_000  }, // 10 $CRUDE — jackpot
] as const

export const STREAK_BONUS_PER_DAY = 0.01
export const MAX_STREAK_BONUS     = 0.30

// ─── Barrel Milestones ────────────────────────────────────────────────────────
export interface BarrelMilestone {
  threshold: number
  cashReward: number
  /** Micro-$CRUDE (÷1e6 for display) */
  tokenMicroReward: number
  title: string | null
  productionBonus: number
  cashBonus: number
}

export const BARREL_MILESTONES: BarrelMilestone[] = [
  { threshold: 1_000,         cashReward: 500,     tokenMicroReward: 50_000_000,        title: null,                productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 10_000,        cashReward: 2_500,   tokenMicroReward: 100_000_000,       title: 'Roughneck',         productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 100_000,       cashReward: 15_000,  tokenMicroReward: 250_000_000,       title: 'Wildcatter',        productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 1_000_000,     cashReward: 75_000,  tokenMicroReward: 1_000_000_000,     title: 'Oil Baron',         productionBonus: 1.05, cashBonus: 1.0  },
  { threshold: 10_000_000,    cashReward: 400_000, tokenMicroReward: 5_000_000_000,     title: 'Tycoon',            productionBonus: 1.0,  cashBonus: 1.10 },
  { threshold: 100_000_000,   cashReward: 0,       tokenMicroReward: 25_000_000_000,    title: 'Magnate',           productionBonus: 1.0,  cashBonus: 1.0  },
  { threshold: 1_000_000_000, cashReward: 0,       tokenMicroReward: 100_000_000_000,   title: 'Crude Rush Legend', productionBonus: 1.25, cashBonus: 1.0  },
]

// ─── XP Rewards ──────────────────────────────────────────────────────────────
export const XP_REWARDS = {
  tile_unlocked:     200,
  building_built:    100,
  building_upgraded:  50,
  upgrade_purchased: 150,
  barrel_milestone:  500,
  prestige_reset:  2_000,
  oil_sold_k:          1,
} as const

export const VALIDATION_TOLERANCE = 1.15
export const MAX_BUILDING_LEVEL = 10
