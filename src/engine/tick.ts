import type { GameState } from './types'
import { REFINERY_CONVERSION_RATIO, CRUDE_OIL_SELL_RATE, REFINED_OIL_SELL_RATE } from './constants'
import { isAutoSellEnabled, getAutoSellRate } from './upgrades'
import { getMarketMultiplier } from './market'

/**
 * Core game tick — pure function, no side effects.
 * Called once per second (or with accumulated deltaMs for catch-up).
 *
 * 1. Produce crude oil (capped by storage)
 * 2. Auto-sell crude when storage is near-full (if upgrade active)
 * 3. Refine crude into refined oil (if refinery exists)
 * 4. Update market multiplier
 * 5. Expire temp buffs
 * 6. Track lifetime stats
 */
export function tick(state: GameState, deltaMs: number): GameState {
  const deltaSec = deltaMs / 1000
  const now = Date.now()

  // ── Market price update ────────────────────────────────────────────────────
  const marketMultiplier = getMarketMultiplier(now)

  // ── Temp buff expiry ───────────────────────────────────────────────────────
  const activeTempMultiplier =
    state.activeTempMultiplierExpiresAt && now > state.activeTempMultiplierExpiresAt
      ? 1.0
      : state.activeTempMultiplier
  const activeTempMultiplierExpiresAt =
    state.activeTempMultiplierExpiresAt && now > state.activeTempMultiplierExpiresAt
      ? null
      : state.activeTempMultiplierExpiresAt

  // ── Crude Oil Production ───────────────────────────────────────────────────
  const produced = state.productionRate * deltaSec * activeTempMultiplier
  const spaceAvailable = Math.max(0, state.storageCapacity - state.crudeOil)
  const actualProduced = Math.min(produced, spaceAvailable)
  let crudeOil = state.crudeOil + actualProduced
  const lifetimeBarrels = state.lifetimeBarrels + actualProduced

  // ── Auto-Sell ─────────────────────────────────────────────────────────────
  let petrodollars = state.petrodollars
  let lifetimePetrodollars = state.lifetimePetrodollars

  if (isAutoSellEnabled(state.upgrades.auto_sell) && crudeOil > 0) {
    const autoRate = getAutoSellRate(state.upgrades.auto_sell)
    const effectivePrice = CRUDE_OIL_SELL_RATE * marketMultiplier * state.streakMultiplier * state.milestoneCashBonus
    // Sell a portion each tick to simulate automatic selling
    const toSell = Math.min(crudeOil, state.productionRate * deltaSec * autoRate)
    const earned = toSell * effectivePrice
    crudeOil -= toSell
    petrodollars += earned
    lifetimePetrodollars += earned
  }

  // ── Refinery Processing ────────────────────────────────────────────────────
  let refinedOil = state.refinedOil
  if (state.refineryRate > 0 && crudeOil > 0) {
    const crudeToProcess = Math.min(state.refineryRate * deltaSec, crudeOil)
    crudeOil -= crudeToProcess
    refinedOil += crudeToProcess * REFINERY_CONVERSION_RATIO
  }

  return {
    ...state,
    crudeOil,
    refinedOil,
    petrodollars,
    lifetimeBarrels,
    lifetimePetrodollars,
    marketMultiplier,
    activeTempMultiplier,
    activeTempMultiplierExpiresAt,
    lastTickAt: now,
  }
}

/**
 * Run a large offline tick for catch-up on login.
 * Uses the OFFLINE_EFFICIENCY scalar from constants — imported via caller.
 * Pass pre-scaled productionRate (rate × OFFLINE_EFFICIENCY) if needed,
 * or use calculateOfflineIncome() in offline.ts which handles the scaling.
 */
export function tickOffline(state: GameState, secondsElapsed: number): GameState {
  return tick(state, secondsElapsed * 1000)
}
