/**
 * Season system constants and scoring helpers.
 *
 * Seasons are 7-day competitive periods. Players earn a composite score
 * based on activity during the season. Top players receive $CRUDE rewards.
 */

// ── Score weights ──────────────��─────────────────────────���────────────────────
// All inputs are season-only deltas (not lifetime totals).
export const SEASON_SCORE_WEIGHTS = {
  barrels: 1,          // 1 point per barrel produced
  petrodollars: 2,     // 2 points per petrodollar earned (rewards selling at good prices)
  tiles: 50_000,       // 50K points per tile unlocked (big commitment)
  upgrades: 25_000,    // 25K points per upgrade purchased
  prestiges: 500_000,  // 500K points per prestige reset (huge sacrifice in a 7-day window)
} as const

/**
 * Compute the composite season score from raw metrics.
 */
export function computeSeasonScore(
  barrels: number,
  petrodollars: number,
  tiles: number,
  upgrades: number,
  prestiges: number
): number {
  return Math.floor(
    barrels * SEASON_SCORE_WEIGHTS.barrels +
    petrodollars * SEASON_SCORE_WEIGHTS.petrodollars +
    tiles * SEASON_SCORE_WEIGHTS.tiles +
    upgrades * SEASON_SCORE_WEIGHTS.upgrades +
    prestiges * SEASON_SCORE_WEIGHTS.prestiges
  )
}

// ── Reward tier definitions (used by both backend and frontend) ───────────────
export interface SeasonRewardTier {
  tierName: string
  rankMin: number
  rankMax: number
  tokenReward: number  // micro-$CRUDE
  title: string | null
}

export const DEFAULT_REWARD_TIERS: SeasonRewardTier[] = [
  { tierName: 'champion',    rankMin: 1,   rankMax: 1,     tokenReward: 1_000_000_000, title: 'Champion' },
  { tierName: 'top3',        rankMin: 2,   rankMax: 3,     tokenReward: 500_000_000,   title: 'Medalist' },
  { tierName: 'top10',       rankMin: 4,   rankMax: 10,    tokenReward: 200_000_000,   title: 'Elite' },
  { tierName: 'top25',       rankMin: 11,  rankMax: 25,    tokenReward: 100_000_000,   title: 'Veteran' },
  { tierName: 'top50',       rankMin: 26,  rankMax: 50,    tokenReward: 50_000_000,    title: null },
  { tierName: 'top100',      rankMin: 51,  rankMax: 100,   tokenReward: 25_000_000,    title: null },
  { tierName: 'participant', rankMin: 101, rankMax: 99999, tokenReward: 5_000_000,     title: null },
]

/**
 * Find which reward tier a given rank falls into.
 */
export function getRewardTierForRank(rank: number): SeasonRewardTier | null {
  return DEFAULT_REWARD_TIERS.find(
    (t) => rank >= t.rankMin && rank <= t.rankMax
  ) ?? null
}

/** Season duration in milliseconds */
export const SEASON_DURATION_MS = 7 * 24 * 60 * 60 * 1000
