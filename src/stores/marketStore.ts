import { create } from 'zustand'
import type { MarketState, MarketSnapshot } from '@/engine/market'
import { registerStore } from '@/lib/game-services'

interface MarketStoreState {
  crudeMult: number
  refinedMult: number
  state: MarketState
  trendDirection: number
  nextTickIn: number
  history: number[]
  updatedAt: string | null
  isLoading: boolean

  /** Fetch latest market snapshot from server */
  fetchMarket: () => Promise<void>

  /** Tick down the countdown timer (call every second) */
  tickCountdown: () => void
}

export const useMarketStore = create<MarketStoreState>((set, get) => ({
  crudeMult: 1.0,
  refinedMult: 1.0,
  state: 'stable' as MarketState,
  trendDirection: 0,
  nextTickIn: 300,
  history: [],
  updatedAt: null,
  isLoading: false,

  fetchMarket: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/market')
      if (!res.ok) return
      const data: MarketSnapshot = await res.json()
      set({
        crudeMult: data.crudeMult,
        refinedMult: data.refinedMult,
        state: data.state,
        trendDirection: data.trendDirection,
        nextTickIn: data.nextTickIn,
        history: data.history,
        updatedAt: data.updatedAt,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false })
    }
  },

  tickCountdown: () => {
    const { nextTickIn } = get()
    if (nextTickIn <= 1) {
      get().fetchMarket()
    } else {
      set({ nextTickIn: nextTickIn - 1 })
    }
  },
}))

// Register so game-services can access without import
registerStore('market', useMarketStore)
