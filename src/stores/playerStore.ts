import { create } from 'zustand'

interface PlayerState {
  walletAddress: string | null
  displayName: string | null
  isConnected: boolean
  isLoading: boolean
  loginStreak: number
  authToken: string | null

  // Actions
  setWallet: (address: string) => void
  setAuthToken: (token: string) => void
  setDisplayName: (name: string) => void
  setLoginStreak: (streak: number) => void
  disconnect: () => void
  setLoading: (loading: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  walletAddress: null,
  displayName: null,
  isConnected: false,
  isLoading: false,
  loginStreak: 0,
  authToken: null,

  setWallet: (address) =>
    set({ walletAddress: address, isConnected: true }),

  setAuthToken: (token) =>
    set({ authToken: token }),

  setDisplayName: (name) =>
    set({ displayName: name }),

  setLoginStreak: (streak) =>
    set({ loginStreak: streak }),

  disconnect: () =>
    set({
      walletAddress: null,
      displayName: null,
      isConnected: false,
      authToken: null,
      loginStreak: 0,
    }),

  setLoading: (loading) =>
    set({ isLoading: loading }),
}))
