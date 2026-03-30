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
      let msg = 'Sign-in failed. Please reconnect.'
      if (err instanceof Error) {
        // User rejected the signature request in their wallet
        if (err.message.includes('User rejected') || err.message.includes('rejected')) {
          msg = 'Signature rejected. Click "Try Again" to sign in.'
        } else {
          msg = err.message
        }
      }
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0908' }}>
      {/* Event banner sits above everything */}
      <EventBanner />

      {/* Main game area — world fills the space, HUD floats on top */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* World area — terrain fills the ENTIRE space, no visible grid boundary */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: '#0c0a08' }}
        >
          {/* TERRAIN LAYER — covers full world area, not just the grid */}
          {/* Warm ground light — large circular glow centered on play area */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 45% 50%, rgba(55,42,25,0.5) 0%, rgba(35,28,18,0.3) 15%, rgba(20,16,10,0.12) 30%, transparent 50%),
                radial-gradient(ellipse 60% 50% at 42% 48%, rgba(70,50,28,0.1) 0%, transparent 100%),
                radial-gradient(ellipse 40% 55% at 55% 52%, rgba(60,45,25,0.07) 0%, transparent 100%)`,
            }}
          />
          {/* Dirt texture patches — scattered across full area */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 15% 10% at 25% 30%, rgba(100,75,40,0.05) 0%, transparent 100%),
                radial-gradient(ellipse 10% 14% at 60% 40%, rgba(90,65,35,0.04) 0%, transparent 100%),
                radial-gradient(ellipse 18% 12% at 40% 58%, rgba(80,60,30,0.035) 0%, transparent 100%),
                radial-gradient(ellipse 12% 8% at 52% 25%, rgba(95,70,38,0.03) 0%, transparent 100%),
                radial-gradient(ellipse 8% 12% at 35% 70%, rgba(85,62,32,0.025) 0%, transparent 100%),
                radial-gradient(ellipse 14% 10% at 70% 65%, rgba(75,55,30,0.03) 0%, transparent 100%),
                radial-gradient(ellipse 10% 16% at 20% 55%, rgba(88,63,33,0.02) 0%, transparent 100%)`,
            }}
          />

          <GameGrid />
          <BuildMenu />

          {/* Floating TopBar — overlays the world */}
          <div className="absolute top-0 left-0 right-0 z-20">
            <TopBar />
          </div>

          {/* Floating BottomBar — overlays the world */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <BottomBar />
          </div>
        </div>

        {/* Command panel — narrower, translucent */}
        <div className="w-72 xl:w-80 overflow-y-auto flex-shrink-0"
          style={{
            backgroundColor: 'rgba(10,9,7,0.95)',
            borderLeft: '1px solid rgba(40,35,25,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <SidePanel />
        </div>
      </div>

      <OfflineIncomeModal />
      <ToastContainer />
    </div>
  )
}
