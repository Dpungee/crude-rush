// ============================================================
// Crude Rush - Game Balance Constants
// All tuning numbers in one place
// ============================================================

/** Game tick interval in milliseconds */
export const TICK_INTERVAL_MS = 1000

/** Auto-save interval in milliseconds */
export const SAVE_INTERVAL_MS = 30_000

/** Grid dimensions — 11×11 grid with 6 rings (0=center, 5=frontier) */
export const GRID_SIZE = 11
export const GRID_CENTER = 5 // index of center tile in an 11x11 grid

// ─── Tile Unlock Costs (per ring) ─────────────────────────────────────────────
// Ring 0: center (free). Rings 1-3: early/mid game. Rings 4-5: late/premium.
export const TILE_UNLOCK_COSTS: Record<number, number> = {
  0: 0,          // center tile — free
  1: 100,        // ring 1 — Starter Fields
  2: 1_500,      // ring 2 — Expansion Zone
  3: 12_500,     // ring 3 — Industrial Belt
  4: 75_000,     // ring 4 — Deep Reserves (post-prestige territory)
  5: 500_000,    // ring 5 — Frontier (endgame whale territory)
}

// ─── Ring Names (for UI display) ──────────────────────────────────────────────
export const RING_NAMES: Record<number, string> = {
  0: 'HQ',
  1: 'Starter Fields',
  2: 'Expansion Zone',
  3: 'Industrial Belt',
  4: 'Deep Reserves',
  5: 'The Frontier',
}

// ─── Tile Traits ──────────────────────────────────────────────────────────────
// Some tiles have special traits assigned at grid creation. Deterministic seeding
// based on coordinates ensures the same traits appear for all players.
export type TileTrait = 'normal' | 'rich' | 'gusher' | 'barren'

export interface TileTraitDef {
  trait: TileTrait
  /** Production multiplier for buildings on this tile */
  productionMultiplier: number
  /** Label shown on hover */
  label: string
  /** Color accent for the tile border */
  color: string
}

export const TILE_TRAITS: Record<TileTrait, TileTraitDef> = {
  normal:  { trait: 'normal',  productionMultiplier: 1.0,  label: '',             color: '' },
  rich:    { trait: 'rich',    productionMultiplier: 1.25, label: 'Rich Deposit',  color: 'border-amber-400/60' },
  gusher:  { trait: 'gusher',  productionMultiplier: 1.75, label: 'Gusher!',      color: 'border-crude-400/80' },
  barren:  { trait: 'barren',  productionMultiplier: 0.6,  label: 'Barren',       color: 'border-oil-600/40' },
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

// ─── Construction Timers ──────────────────────────────────────────────────────
// Base seconds for each building type. Formula: base × targetLevel^1.5
import type { BuildingType } from './types'

export const CONSTRUCTION_BASE_SECONDS: Record<BuildingType, number> = {
  oil_well: 10,       // L1: 10s, L5: 112s, L10: 316s (~5min)
  pump_jack: 30,      // L1: 30s, L10: 949s (~16min)
  derrick: 60,        // L1: 60s, L10: 1897s (~32min)
  oil_terminal: 120,  // L1: 120s, L10: 3795s (~63min)
  storage_tank: 15,   // L1: 15s, L10: 474s (~8min)
  refinery: 45,       // L1: 45s, L10: 1423s (~24min)
}

/**
 * Construction time in seconds: base × targetLevel^1.5 × eventMultiplier
 * @param eventTimeMultiplier - from active events (e.g. 0.5 = half time). Default 1.0.
 */
export function getConstructionTime(type: BuildingType, targetLevel: number, eventTimeMultiplier = 1.0): number {
  const base = CONSTRUCTION_BASE_SECONDS[type]
  const raw = base * Math.pow(Math.max(1, targetLevel), 1.5)
  return Math.max(1, Math.floor(raw * eventTimeMultiplier))
}

/** Max simultaneous constructions (1 free, expandable later) */
export const MAX_CONSTRUCTION_SLOTS = 1

/** Cost per remaining second to instant-finish */
export const INSTANT_FINISH_COST_PER_SECOND = 10
