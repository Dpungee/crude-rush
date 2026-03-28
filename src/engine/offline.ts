import type { GameState } from './types'
import { OFFLINE_EFFICIENCY } from './constants'
import { getMaxOfflineSeconds } from './upgrades'
import { tickOffline } from './tick'

export interface OfflineIncomeResult {
  /** Updated game state after applying offline income */
  state: GameState
  /** Seconds player was offline (capped by Night Shift) */
  secondsOffline: number
  /** Crude oil earned while offline */
  crudeEarned: number
  /** Refined oil earned while offline */
  refinedEarned: number
  /** Petrodollars earned via auto-sell while offline */
  petrodollarsEarned: number
}

/**
 * Calculate and apply offline income when a player returns.
 *
 * Offline production runs at OFFLINE_EFFICIENCY (50%) of live rate.
 * Duration is capped by the Night Shift upgrade (base 8h, up to 24h).
 *
 * @param state  - Game state as loaded from the server
 * @param nowMs  - Current timestamp in milliseconds
 */
export function calculateOfflineIncome(
  state: GameState,
  nowMs: number = Date.now()
): OfflineIncomeResult {
  const rawSeconds = (nowMs - state.lastTickAt) / 1000

  // Cap offline duration based on Night Shift upgrade level
  const maxSeconds = getMaxOfflineSeconds(state.upgrades.offline_duration)
  const secondsOffline = Math.min(Math.max(0, rawSeconds), maxSeconds)

  if (secondsOffline < 2) {
    return {
      state: { ...state, lastTickAt: nowMs },
      secondsOffline: 0,
      crudeEarned: 0,
      refinedEarned: 0,
      petrodollarsEarned: 0,
    }
  }

  const prevCrude = state.crudeOil
  const prevRefined = state.refinedOil
  const prevPetrodollars = state.petrodollars

  // Apply 50% offline efficiency by scaling production rate during the offline tick
  const offlineState: GameState = {
    ...state,
    productionRate: state.productionRate * OFFLINE_EFFICIENCY,
    refineryRate: state.refineryRate * OFFLINE_EFFICIENCY,
  }

  const newState = tickOffline(offlineState, secondsOffline)

  // Restore the real production rate (tick only scaled it for offline)
  const finalState: GameState = {
    ...newState,
    productionRate: state.productionRate,
    refineryRate: state.refineryRate,
    lastTickAt: nowMs,
  }

  return {
    state: finalState,
    secondsOffline,
    crudeEarned: Math.max(0, finalState.crudeOil - prevCrude),
    refinedEarned: Math.max(0, finalState.refinedOil - prevRefined),
    petrodollarsEarned: Math.max(0, finalState.petrodollars - prevPetrodollars),
  }
}

/**
 * Format seconds offline as a human-readable string.
 * e.g. 3720 → "1h 2m"
 */
export function formatOfflineTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
