import { MARKET_FLUCTUATION_AMPLITUDE, MARKET_FLUCTUATION_PERIOD_MS } from './constants'

/**
 * Get the current market price multiplier based on a deterministic sine wave.
 * Value oscillates between (1 - amplitude) and (1 + amplitude).
 *
 * @param timestampMs - Current time in milliseconds (use Date.now())
 * @returns Multiplier in range [0.80, 1.20] (with default ±20% amplitude)
 */
export function getMarketMultiplier(timestampMs: number): number {
  const phase = ((timestampMs % MARKET_FLUCTUATION_PERIOD_MS) / MARKET_FLUCTUATION_PERIOD_MS) * 2 * Math.PI
  return 1 + MARKET_FLUCTUATION_AMPLITUDE * Math.sin(phase)
}

/**
 * Format the market multiplier as a human-readable price trend.
 * e.g. 1.12 → "+12%", 0.88 → "-12%"
 */
export function formatMarketTrend(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

/**
 * Get a qualitative market mood label.
 */
export function getMarketMood(multiplier: number): 'bearish' | 'neutral' | 'bullish' {
  if (multiplier < 0.93) return 'bearish'
  if (multiplier > 1.07) return 'bullish'
  return 'neutral'
}
