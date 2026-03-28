import { create } from 'zustand'

interface PlayerState {
  walletAddress: string | null
  displayName: string | null
  isConnected: boolean
  isAuthenticating: boolean
  isAuthenticated: boolean  // true only after sign-message verification succeeds
  authToken: string | null  // JWT for all subsequent API calls
  loginStreak: number
  pendingCrudeTokens: number  // shadow ledger balance in micro-$CRUDE (1e6 = 1 token)

  // Actions
  setWallet: (address: string) => void
  setAuthResult: (token: string, walletAddress: string, loginStreak: number) => void
  setDisplayName: (name: string) => void
  setLoginStreak: (streak: number) => void
  setPendingTokens: (amount: number) => void
  setAuthenticating: (v: boolean) => void
  disconnect: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  walletAddress: null,
  displayName: null,
  isConnected: false,
  isAuthenticating: false,
  isAuthenticated: false,
  authToken: null,
  loginStreak: 0,
  pendingCrudeTokens: 0,

  setWallet: (address) =>
    set({ walletAddress: address, isConnected: true }),

  setAuthResult: (token, walletAddress, loginStreak) =>
    set({
      authToken: token,
      walletAddress,
      isConnected: true,
      isAuthenticated: true,
      isAuthenticating: false,
      loginStreak,
    }),

  setDisplayName: (name) => set({ displayName: name }),

  setLoginStreak: (streak) => set({ loginStreak: streak }),

  setPendingTokens: (amount) => set({ pendingCrudeTokens: amount }),

  setAuthenticating: (v) => set({ isAuthenticating: v }),

  disconnect: () =>
    set({
      walletAddress: null,
      displayName: null,
      isConnected: false,
      isAuthenticated: false,
      isAuthenticating: false,
      authToken: null,
      loginStreak: 0,
      pendingCrudeTokens: 0,
    }),
}))
