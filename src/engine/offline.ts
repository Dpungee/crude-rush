import type { GameState } from './types'
import { MAX_OFFLINE_SECONDS } from './constants'
import { getMaxOfflineSeconds } from './upgrades'
import { tickOffline } from './tick'

export interface OfflineIncomeResult {
  /** Updated game state after applying offline income */
  state: GameState
  /** Seconds player was offline (capped) */
  secondsOffline: number
  /** Crude oil earned while offline */
  crudeEarned: number
  /** Refined oil earned while offline */
  refinedEarned: number
}

/**
 * Calculate and apply offline income when a player returns.
 *
 * @param state - The game state as loaded from the server
 * @param nowMs - Current timestamp in milliseconds
 */
export function calculateOfflineIncome(
  state: GameState,
  nowMs: number = Date.now()
): OfflineIncomeResult {
  const rawSeconds = (nowMs - state.lastTickAt) / 1000

  // Cap offline duration based on upgrade level
  const maxSeconds = getMaxOfflineSeconds(state.upgrades.offline_duration)
  const secondsOffline = Math.min(Math.max(0, rawSeconds), maxSeconds)

  if (secondsOffline < 2) {
    // Less than 2 seconds — not worth calculating
    return {
      state: { ...state, lastTickAt: nowMs },
      secondsOffline: 0,
      crudeEarned: 0,
      refinedEarned: 0,
    }
  }

  const prevCrude = state.crudeOil
  const prevRefined = state.refinedOil

  const newState = tickOffline(state, secondsOffline)

  return {
    state: { ...newState, lastTickAt: nowMs },
    secondsOffline,
    crudeEarned: newState.crudeOil - prevCrude,
    refinedEarned: newState.refinedOil - prevRefined,
  }
}
