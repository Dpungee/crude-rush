/**
 * Dynamic Oil Market Engine
 *
 * Multi-layer price model:
 *   price = baseRate × trendMultiplier × volatility × eventMult
 *
 * Market updates every MARKET_TICK_MS (5 min). Each tick:
 *   1. Roll a new "trend direction" with momentum (Markov chain)
 *   2. Apply bounded random walk to the trend multiplier
 *   3. Add fast micro-volatility (small noise each game tick)
 *
 * The server generates a MarketSnapshot every tick; clients fetch it.
 * Sell transactions use the server snapshot price — never client math.
 *
 * Market States (qualitative):
 *   crash  → mult < 0.78    (rare, exciting, "hold!")
 *   bear   → 0.78..0.92     (prices falling)
 *   stable → 0.92..1.08     (normal trading)
 *   bull   → 1.08..1.22     (rising, "sell soon!")
 *   boom   → mult > 1.22    (rare, "sell now!")
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** How often the server recalculates the market (5 minutes) */
export const MARKET_TICK_MS = 5 * 60 * 1000

/** How many history points to keep (24h ÷ 5min = 288 ticks) */
export const MARKET_HISTORY_LENGTH = 288

/** Hard floor and ceiling for trend multiplier */
export const MARKET_FLOOR = 0.60
export const MARKET_CEILING = 1.50

/** Per-tick max movement (±8% per 5-min tick) */
export const MARKET_MAX_STEP = 0.08

/** Momentum factor — higher = trends persist longer. 0.7 = strong momentum. */
export const MARKET_MOMENTUM = 0.7

/** Mean-reversion strength — pulls back toward 1.0 */
export const MARKET_MEAN_REVERSION = 0.15

// ── Types ──────────────────────────────────────────────────────────────────────

export type MarketState = 'crash' | 'bear' | 'stable' | 'bull' | 'boom'

export interface MarketSnapshot {
  /** Current crude oil trend multiplier (0.60 – 1.50) */
  crudeMult: number
  /** Current refined oil trend multiplier (0.60 – 1.50) */
  refinedMult: number
  /** Qualitative state */
  state: MarketState
  /** ISO timestamp of this snapshot */
  updatedAt: string
  /** Seconds until next market tick */
  nextTickIn: number
  /** Trend direction: -1 falling, 0 flat, +1 rising */
  trendDirection: number
  /** Recent price history (last N crude multipliers for sparkline) */
  history: number[]
}

// ── Deterministic Seeded RNG ───────────────────────────────────────────────────
// We need reproducible randomness so every server instance generates the same
// market at the same time. Uses a simple mulberry32 PRNG seeded from the tick index.

function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Core Market Computation ────────────────────────────────────────────────────

/**
 * Compute the market state at a given tick index.
 * Tick 0 = Unix epoch. Current tick = floor(Date.now() / MARKET_TICK_MS).
 *
 * We walk forward from a "checkpoint" to build the chain.
 * For efficiency, we only walk the last MARKET_HISTORY_LENGTH ticks.
 */
export function computeMarketAtTick(tickIndex: number): {
  crudeMult: number
  refinedMult: number
  trendDirection: number
  history: number[]
} {
  // Walk history from (tickIndex - histLen) to tickIndex
  const histLen = Math.min(tickIndex, MARKET_HISTORY_LENGTH)
  const startTick = tickIndex - histLen

  let crudeMult = 1.0
  let refinedMult = 1.0
  let prevDelta = 0
  const history: number[] = []

  for (let t = startTick; t <= tickIndex; t++) {
    const rng = mulberry32(t * 2654435761) // unique seed per tick

    // Random impulse (-1 to +1)
    const impulse = (rng() - 0.5) * 2 * MARKET_MAX_STEP

    // Mean reversion pull toward 1.0
    const reversion = (1.0 - crudeMult) * MARKET_MEAN_REVERSION

    // Momentum from previous delta
    const momentum = prevDelta * MARKET_MOMENTUM

    // Combined delta
    const delta = impulse + reversion + momentum
    prevDelta = delta

    crudeMult = Math.max(MARKET_FLOOR, Math.min(MARKET_CEILING, crudeMult + delta))

    // Refined oil tracks crude but with slight offset (refined is more stable)
    const refinedImpulse = (rng() - 0.5) * 2 * MARKET_MAX_STEP * 0.6
    const refinedReversion = (1.0 - refinedMult) * MARKET_MEAN_REVERSION * 1.3
    refinedMult = Math.max(
      MARKET_FLOOR + 0.1,
      Math.min(MARKET_CEILING - 0.1, refinedMult + refinedImpulse + refinedReversion + momentum * 0.4)
    )

    history.push(Math.round(crudeMult * 1000) / 1000)
  }

  return {
    crudeMult: Math.round(crudeMult * 1000) / 1000,
    refinedMult: Math.round(refinedMult * 1000) / 1000,
    trendDirection: prevDelta > 0.01 ? 1 : prevDelta < -0.01 ? -1 : 0,
    history,
  }
}

/** Get the current tick index */
export function getCurrentTickIndex(): number {
  return Math.floor(Date.now() / MARKET_TICK_MS)
}

/** Seconds until the next market tick */
export function secondsUntilNextTick(): number {
  const now = Date.now()
  const nextTick = (Math.floor(now / MARKET_TICK_MS) + 1) * MARKET_TICK_MS
  return Math.max(0, Math.ceil((nextTick - now) / 1000))
}

// ── Market State Classification ────────────────────────────────────────────────

export function classifyMarket(mult: number): MarketState {
  if (mult < 0.78) return 'crash'
  if (mult < 0.92) return 'bear'
  if (mult > 1.22) return 'boom'
  if (mult > 1.08) return 'bull'
  return 'stable'
}

/** Human-readable label for market state */
export const MARKET_STATE_LABELS: Record<MarketState, { label: string; emoji: string; color: string }> = {
  crash:  { label: 'CRASH',       emoji: '💥', color: 'text-red-500' },
  bear:   { label: 'Bearish',     emoji: '📉', color: 'text-red-400' },
  stable: { label: 'Stable',      emoji: '📊', color: 'text-slate-300' },
  bull:   { label: 'Bullish',     emoji: '📈', color: 'text-emerald-400' },
  boom:   { label: 'BOOM',        emoji: '🚀', color: 'text-emerald-300' },
}

// ── Full Snapshot Generator ────────────────────────────────────────────────────

/** Generate a complete market snapshot for the current moment */
export function generateMarketSnapshot(): MarketSnapshot {
  const tickIndex = getCurrentTickIndex()
  const { crudeMult, refinedMult, trendDirection, history } = computeMarketAtTick(tickIndex)

  return {
    crudeMult,
    refinedMult,
    state: classifyMarket(crudeMult),
    updatedAt: new Date().toISOString(),
    nextTickIn: secondsUntilNextTick(),
    trendDirection,
    history: history.slice(-48), // Last 48 ticks = 4 hours of sparkline
  }
}

// ── Legacy Compatibility ───────────────────────────────────────────────────────
// Keep old function signature alive so tick.ts doesn't break before we update it.
// Once the SellPanel and tick are updated to use market snapshots, remove this.

/** @deprecated Use generateMarketSnapshot() instead */
export function getMarketMultiplier(timestampMs: number): number {
  const tickIndex = Math.floor(timestampMs / MARKET_TICK_MS)
  const { crudeMult } = computeMarketAtTick(tickIndex)
  return crudeMult
}

/** Format market multiplier as "+12%" or "-8%" */
export function formatMarketTrend(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

/** @deprecated Use classifyMarket() */
export function getMarketMood(multiplier: number): 'bearish' | 'neutral' | 'bullish' {
  if (multiplier < 0.93) return 'bearish'
  if (multiplier > 1.07) return 'bullish'
  return 'neutral'
}
