/**
 * Game Services — shared accessor functions for cross-store data.
 *
 * WHY THIS EXISTS:
 * gameStore needs market prices and event modifiers, but importing
 * eventStore/marketStore at module top level causes Zustand initialization
 * order issues. This module solves that by:
 *   1. Not importing any store at the top level
 *   2. Lazily accessing stores only when called (stores are initialized by then)
 *   3. Providing safe fallbacks if stores aren't ready
 *
 * RULES:
 *   - This module must NOT import any Zustand store at the top level
 *   - All store access must happen inside function bodies
 *   - All functions must have safe fallback returns
 */

// We use a registry pattern: stores register themselves after creation,
// then services access them by reference — no import, no require().

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreRef = { getState: () => any }

const _registry: Record<string, StoreRef> = {}

/** Called by each store after create() to register itself */
export function registerStore(name: string, store: StoreRef): void {
  _registry[name] = store
}

/** Get a registered store by name, or null if not yet registered */
function getStore(name: string): StoreRef | null {
  return _registry[name] ?? null
}

// ── Public Service Functions ─────────────────────────────────────────────────

/** Get current event-driven construction time multiplier (e.g. 0.5 during Speed Build Week) */
export function getEventTimeMultiplier(): number {
  try {
    const store = getStore('event')
    if (!store) return 1.0
    const mods = store.getState().getEffectiveModifiers?.()
    return mods?.upgradeTimeMultiplier ?? 1.0
  } catch {
    return 1.0
  }
}

/** Get server-authoritative market prices */
export function getServerMarketPrices(): { crudeMult: number; refinedMult: number } {
  try {
    const store = getStore('market')
    if (!store) return { crudeMult: 1.0, refinedMult: 1.0 }
    const s = store.getState()
    if (s.updatedAt) {
      return { crudeMult: s.crudeMult ?? 1.0, refinedMult: s.refinedMult ?? 1.0 }
    }
  } catch { /* store not ready */ }
  return { crudeMult: 1.0, refinedMult: 1.0 }
}

/** Tick down the market countdown timer (called once per game tick) */
export function tickMarketCountdown(): void {
  try {
    const store = getStore('market')
    if (!store) return
    store.getState().tickCountdown?.()
  } catch { /* ok */ }
}
