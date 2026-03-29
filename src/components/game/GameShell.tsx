'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'
import { useGameStore, createInitialGameState } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { createSignMessage } from '@/lib/wallet-auth'
import { TICK_INTERVAL_MS, SAVE_INTERVAL_MS } from '@/engine/constants'
import { useEventStore } from '@/stores/eventStore'
import { useMarketStore } from '@/stores/marketStore'
import { GameGrid } from './GameGrid'
import { EventBanner } from './EventBanner'
import { TopBar } from '@/components/hud/TopBar'
import { BottomBar } from '@/components/hud/BottomBar'
import { SidePanel } from '@/components/panels/SidePanel'
import { BuildMenu } from './BuildMenu'
import { OfflineIncomeModal } from '@/components/shared/OfflineIncomeModal'
import { ToastContainer } from '@/components/shared/ToastContainer'

export function GameShell() {
  const { publicKey, signMessage, disconnect: walletDisconnect } = useWallet()
  const walletAddress = publicKey?.toBase58() || ''

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const authRef = useRef(false)

  const gameTick        = useGameStore((s) => s.tick)
  const hydrate         = useGameStore((s) => s.hydrate)
  const serialize       = useGameStore((s) => s.serialize)
  const setStakingMultiplier = useGameStore((s) => s.setStakingMultiplier)
  const setOfflineIncome = useUiStore((s) => s.setOfflineIncome)

  const setAuthResult    = usePlayerStore((s) => s.setAuthResult)
  const setAuthenticating = usePlayerStore((s) => s.setAuthenticating)
  const setAuthError     = usePlayerStore((s) => s.setAuthError)
  const setPendingTokens = usePlayerStore((s) => s.setPendingTokens)
  const setTotalEarnedTokens = usePlayerStore((s) => s.setTotalEarnedTokens)
  const setClaimCooldown = usePlayerStore((s) => s.setClaimCooldown)
  const isAuthenticated  = usePlayerStore((s) => s.isAuthenticated)
  const authError        = usePlayerStore((s) => s.authError)
  const playerDisconnect = usePlayerStore((s) => s.disconnect)

  // ── Load $CRUDE token balance from shadow ledger ───────────────────────
  const loadTokenBalance = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/token/balance', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setPendingTokens(Number(data.balance ?? 0))
          setTotalEarnedTokens(Number(data.totalEarned ?? 0))
          setClaimCooldown(data.cooldownExpiresAt ?? null)
        }
      } catch {
        // Non-critical
      }
    },
    [setPendingTokens, setTotalEarnedTokens, setClaimCooldown]
  )

  // ── Load staking multiplier ────────────────────────────────────────────
  const loadStakingBonus = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/game/staking-bonus', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { multiplier } = await res.json()
          if (typeof multiplier === 'number' && multiplier >= 1.0) {
            setStakingMultiplier(multiplier)
          }
        }
      } catch {
        // Non-critical — staking defaults to 1.0×
      }
    },
    [setStakingMultiplier]
  )

  // ── Load game ────────────────────────────────────────────────────────
  const loadGame = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/game/load', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()

          hydrate(data.gameState)

          if (data.offlineIncome && data.offlineIncome.crude > 0) {
            setOfflineIncome({
              crude:   data.offlineIncome.crude,
              refined: data.offlineIncome.refined,
              seconds: data.offlineIncome.seconds,
            })
          }

          if (data.missions?.length) {
            useMissionStore.getState().hydrate(data.missions)
          } else {
            useMissionStore.getState().initializeMissions()
          }

          if (data.player.loginStreak) {
            usePlayerStore.getState().setLoginStreak(data.player.loginStreak)
          }

          // Non-critical background loads
          loadTokenBalance(token)
          loadStakingBonus(token)
        } else {
          useGameStore.setState(createInitialGameState())
          useMissionStore.getState().initializeMissions()
        }
      } catch (err) {
        console.error('Failed to load game:', err)
        useGameStore.setState(createInitialGameState())
        useMissionStore.getState().initializeMissions()
      }
    },
    [hydrate, setOfflineIncome, loadTokenBalance, loadStakingBonus]
  )

  // ── Sign-in flow ────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    if (!walletAddress || !signMessage) return

    authRef.current = true
    setAuthenticating(true)
    setAuthError(null)

    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: walletAddress }),
      })
      if (!nonceRes.ok) throw new Error('Failed to get nonce')
      const { nonce } = await nonceRes.json()

      const message = createSignMessage(nonce)
      const messageBytes = new TextEncoder().encode(message)
      const rawSig = await signMessage(messageBytes)
      const signatureBytes =
        rawSig instanceof Uint8Array ? rawSig : (rawSig as { signature: Uint8Array }).signature
      const signature = bs58.encode(signatureBytes)

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: walletAddress, signature, nonce }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.token) {
        throw new Error(verifyData.error || 'Verification failed')
      }

      setAuthResult(verifyData.token, walletAddress, verifyData.loginStreak)
      await loadGame(verifyData.token)
    } catch (err) {
      console.error('Sign-in failed:', err)
      const msg = err instanceof Error ? err.message : 'Sign-in failed. Please reconnect.'
      setAuthError(msg)
      authRef.current = false
    }
  }, [walletAddress, signMessage, setAuthResult, setAuthenticating, setAuthError, loadGame])

  useEffect(() => {
    if (!walletAddress || !signMessage || authRef.current) return
    signIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // ── Save function — includes mission progress ────────────────────────
  const saveGame = useCallback(async () => {
    const token = usePlayerStore.getState().authToken
    if (!token) return

    try {
      const gameState = serialize()
      const upgrades = useGameStore.getState().upgrades
      const missions = useMissionStore.getState().missions

      await fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameState: { ...gameState, upgrades },
          missions,  // included so server can verify mission claims
        }),
      })
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }, [serialize])

  // ── Tick loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    tickRef.current = setInterval(gameTick, TICK_INTERVAL_MS)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [isAuthenticated, gameTick])

  // ── Save loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    saveRef.current = setInterval(saveGame, SAVE_INTERVAL_MS)
    return () => { if (saveRef.current) clearInterval(saveRef.current) }
  }, [isAuthenticated, saveGame])

  // ── Event polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    useEventStore.getState().fetchEvents()
    const eventInterval = setInterval(() => useEventStore.getState().fetchEvents(), 60_000)
    return () => clearInterval(eventInterval)
  }, [isAuthenticated])

  // ── Market polling ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    useMarketStore.getState().fetchMarket()
    // Re-fetch every 60s as a fallback (main refresh is via countdown in tick)
    const marketInterval = setInterval(() => useMarketStore.getState().fetchMarket(), 60_000)
    return () => clearInterval(marketInterval)
  }, [isAuthenticated])

  // ── Save on tab blur / close ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    const onHide = () => { if (document.hidden) saveGame() }
    const onUnload = () => saveGame()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [isAuthenticated, saveGame])

  // ── Wallet disconnect sync ───────────────────────────────────────────
  useEffect(() => {
    if (!publicKey) {
      authRef.current = false
      playerDisconnect()
    }
  }, [publicKey, playerDisconnect])

  // ── Loading / auth states ────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-oil-950 relative overflow-hidden">
        {/* Ambient atmosphere */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-crude-500/8 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          {authError ? (
            <>
              <div className="text-5xl">🛢️</div>
              <p className="text-red-400 text-sm font-bold">Sign-in failed</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs text-center">{authError}</p>
              <button
                onClick={() => { authRef.current = false; signIn() }}
                className="mt-2 px-6 py-2.5 bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 font-bold text-sm rounded-lg hover:from-crude-500 hover:to-crude-400 transition-all shadow-lg shadow-crude-500/20"
              >
                Try Again
              </button>
              <button
                onClick={() => walletDisconnect()}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline"
              >
                Disconnect wallet
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl drop-shadow-[0_0_20px_rgba(212,160,23,0.4)] animate-pulse">🛢️</div>
              <h2 className="text-lg font-black tracking-tight">
                <span className="text-crude">CRUDE</span>
                <span className="text-foreground ml-1">RUSH</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crude-500 animate-pulse" />
                <p className="text-muted-foreground text-sm">Signing in…</p>
              </div>
              <p className="text-xs text-muted-foreground/40">Approve the signature in your wallet</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-oil-950 overflow-hidden">
      <EventBanner />
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Grid area — centered with atmospheric lighting */}
        <div className="flex-1 flex items-center justify-center p-3 relative bg-grid-pattern">
          {/* Radial ambient glow behind the grid */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] bg-crude-500/[0.03] rounded-full blur-[80px]" />
          </div>
          <GameGrid />
          <BuildMenu />
        </div>

        {/* Side panel */}
        <div className="w-80 xl:w-96 border-l border-oil-800/60 overflow-y-auto bg-oil-950/50 backdrop-blur-sm">
          <SidePanel />
        </div>
      </div>

      <BottomBar />
      <OfflineIncomeModal />
      <ToastContainer />
    </div>
  )
}
