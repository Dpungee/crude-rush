import { create } from 'zustand'

interface PlayerState {
  walletAddress: string | null
  displayName: string | null
  isConnected: boolean
  isAuthenticating: boolean
  isAuthenticated: boolean
  authError: string | null
  authToken: string | null
  loginStreak: number
  /** Shadow ledger balance in micro-$CRUDE (1e6 = 1 token) */
  pendingCrudeTokens: number
  /** Total micro-$CRUDE ever earned (from /api/token/balance) */
  totalEarnedTokens: number
  /** ISO timestamp when next claim is available, or null if no cooldown */
  claimCooldownExpiresAt: string | null

  // Actions
  setWallet: (address: string) => void
  setAuthResult: (token: string, walletAddress: string, loginStreak: number) => void
  setAuthError: (error: string | null) => void
  setDisplayName: (name: string) => void
  setLoginStreak: (streak: number) => void
  setPendingTokens: (amount: number) => void
  addPendingTokens: (amount: number) => void
  setTotalEarnedTokens: (amount: number) => void
  setClaimCooldown: (expiresAt: string | null) => void
  setAuthenticating: (v: boolean) => void
  disconnect: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  walletAddress: null,
  displayName: null,
  isConnected: false,
  isAuthenticating: false,
  isAuthenticated: false,
  authError: null,
  authToken: null,
  loginStreak: 0,
  pendingCrudeTokens: 0,
  totalEarnedTokens: 0,
  claimCooldownExpiresAt: null,

  setWallet: (address) =>
    set({ walletAddress: address, isConnected: true }),

  setAuthResult: (token, walletAddress, loginStreak) =>
    set({
      authToken: token,
      walletAddress,
      isConnected: true,
      isAuthenticated: true,
      isAuthenticating: false,
      authError: null,
      loginStreak,
    }),

  setAuthError: (error) =>
    set({ authError: error, isAuthenticating: false }),

  setDisplayName: (name) => set({ displayName: name }),

  setLoginStreak: (streak) => set({ loginStreak: streak }),

  setPendingTokens: (amount) => set({ pendingCrudeTokens: amount }),

  /** Adds to pending balance (e.g. after a mission reward is granted) */
  addPendingTokens: (amount) =>
    set({ pendingCrudeTokens: get().pendingCrudeTokens + amount }),

  setTotalEarnedTokens: (amount) => set({ totalEarnedTokens: amount }),

  setClaimCooldown: (expiresAt) => set({ claimCooldownExpiresAt: expiresAt }),

  setAuthenticating: (v) => set({ isAuthenticating: v, authError: v ? null : undefined }),

  disconnect: () =>
    set({
      walletAddress: null,
      displayName: null,
      isConnected: false,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      authToken: null,
      loginStreak: 0,
      pendingCrudeTokens: 0,
      totalEarnedTokens: 0,
      claimCooldownExpiresAt: null,
    }),
}))
