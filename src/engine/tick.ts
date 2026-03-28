import type { GameState } from './types'
import { REFINERY_CONVERSION_RATIO } from './constants'

/**
 * Core game tick — pure function, no side effects.
 * Called once per second (or with accumulated deltaMs for catch-up).
 *
 * 1. Produce crude oil (capped by storage)
 * 2. Refine crude into refined oil (if refinery exists)
 * 3. Track lifetime stats
 */
export function tick(state: GameState, deltaMs: number): GameState {
  const deltaSec = deltaMs / 1000

  // --- Crude Oil Production ---
  const produced = state.productionRate * deltaSec
  const spaceAvailable = Math.max(0, state.storageCapacity - state.crudeOil)
  const actualProduced = Math.min(produced, spaceAvailable)

  let crudeOil = state.crudeOil + actualProduced
  let refinedOil = state.refinedOil
  let lifetimeBarrels = state.lifetimeBarrels + actualProduced

  // --- Refinery Processing ---
  if (state.refineryRate > 0 && crudeOil > 0) {
    const crudeToProcess = Math.min(
      state.refineryRate * deltaSec,
      crudeOil
    )
    crudeOil -= crudeToProcess
    refinedOil += crudeToProcess * REFINERY_CONVERSION_RATIO
  }

  return {
    ...state,
    crudeOil,
    refinedOil,
    lifetimeBarrels,
    lastTickAt: Date.now(),
  }
}

/**
 * Run multiple ticks for offline catch-up.
 * Uses a single large tick rather than iterating 1-second ticks
 * (since our tick function is linear and order-independent for production).
 */
export function tickOffline(state: GameState, secondsElapsed: number): GameState {
  return tick(state, secondsElapsed * 1000)
}
