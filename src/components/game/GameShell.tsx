'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'
import { useGameStore, createInitialGameState } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { calculateOfflineIncome } from '@/engine/offline'
import { createSignMessage } from '@/lib/wallet-auth'
import { TICK_INTERVAL_MS, SAVE_INTERVAL_MS } from '@/engine/constants'
import { GameGrid } from './GameGrid'
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
  const authRef = useRef(false)  // prevent double-auth on StrictMode

  const gameTick = useGameStore((s) => s.tick)
  const hydrate = useGameStore((s) => s.hydrate)
  const serialize = useGameStore((s) => s.serialize)
  const setOfflineIncome = useUiStore((s) => s.setOfflineIncome)
  const addToast = useUiStore((s) => s.addToast)

  const setAuthResult = usePlayerStore((s) => s.setAuthResult)
  const setAuthenticating = usePlayerStore((s) => s.setAuthenticating)
  const setPendingTokens = usePlayerStore((s) => s.setPendingTokens)
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const authToken = usePlayerStore((s) => s.authToken)
  const playerDisconnect = usePlayerStore((s) => s.disconnect)

  // ─── Sign-in flow: nonce → sign → verify → JWT ──────────────────────────
  useEffect(() => {
    if (!walletAddress || !signMessage || authRef.current) return

    authRef.current = true
    setAuthenticating(true)

    async function signIn() {
      try {
        // 1. Request nonce
        const nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: walletAddress }),
        })
        const { nonce } = await nonceRes.json()

        // 2. Sign with Phantom
        const message = createSignMessage(nonce)
        const messageBytes = new TextEncoder().encode(message)
        const signatureBytes = await signMessage!(messageBytes)
        const signature = bs58.encode(signatureBytes)

        // 3. Verify on server → receive JWT
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: walletAddress, signature, nonce }),
        })
        const verifyData = await verifyRes.json()

        if (!verifyRes.ok || !verifyData.token) {
          throw new Error(verifyData.error || 'Auth failed')
        }

        setAuthResult(verifyData.token, walletAddress, verifyData.loginStreak)

        // 4. Load game state using JWT
        await loadGame(verifyData.token)
      } catch (err) {
        console.error('Sign-in failed:', err)
        addToast({ message: 'Sign-in failed. Please reconnect.', type: 'error' })
        setAuthenticating(false)
        authRef.current = false
      }
    }

    signIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // ─── Load game ──────────────────────────────────────────────────────────
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

          // Apply offline income
          const state = useGameStore.getState()
          const offlineResult = calculateOfflineIncome(state)

          if (offlineResult.secondsOffline > 10 && offlineResult.crudeEarned > 0) {
            useGameStore.setState({
              crudeOil: offlineResult.state.crudeOil,
              refinedOil: offlineResult.state.refinedOil,
              lifetimeBarrels: offlineResult.state.lifetimeBarrels,
              lastTickAt: offlineResult.state.lastTickAt,
            })
            setOfflineIncome({
              crude: offlineResult.crudeEarned,
              refined: offlineResult.refinedEarned,
              seconds: offlineResult.secondsOffline,
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

          // Load token balance
          loadTokenBalance(token)
        } else {
          // New player or load failed — start fresh
          useGameStore.setState(createInitialGameState())
          useMissionStore.getState().initializeMissions()
        }
      } catch (err) {
        console.error('Failed to load game:', err)
        useGameStore.setState(createInitialGameState())
        useMissionStore.getState().initializeMissions()
      }
    },
    [hydrate, setOfflineIncome]
  )

  // ─── Load $CRUDE token balance from shadow ledger ────────────────────────
  const loadTokenBalance = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/token/balance', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { balance } = await res.json()
          setPendingTokens(balance)
        }
      } catch {
        // Non-critical — ignore
      }
    },
    [setPendingTokens]
  )

  // ─── Save function ───────────────────────────────────────────────────────
  const saveGame = useCallback(async () => {
    const token = usePlayerStore.getState().authToken
    if (!token) return

    try {
      const gameState = serialize()
      const upgrades = useGameStore.getState().upgrades

      await fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameState: { ...gameState, upgrades } }),
      })
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }, [serialize])

  // ─── Tick loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    tickRef.current = setInterval(gameTick, TICK_INTERVAL_MS)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [isAuthenticated, gameTick])

  // ─── Save loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    saveRef.current = setInterval(saveGame, SAVE_INTERVAL_MS)
    return () => { if (saveRef.current) clearInterval(saveRef.current) }
  }, [isAuthenticated, saveGame])

  // ─── Save on tab blur / close ────────────────────────────────────────────
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

  // ─── Wallet disconnect sync ──────────────────────────────────────────────
  useEffect(() => {
    if (!publicKey) {
      authRef.current = false
      playerDisconnect()
    }
  }, [publicKey, playerDisconnect])

  // ─── Loading / auth spinner ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-oil-950 gap-4">
        <div className="text-4xl animate-pulse">🛢️</div>
        <p className="text-muted-foreground text-sm">
          Signing in to Crude Rush…
        </p>
        <p className="text-xs text-muted-foreground/50">
          Approve the signature request in Phantom
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-oil-950 overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Game Grid */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <GameGrid />
          <BuildMenu />
        </div>

        {/* Side Panel */}
        <div className="w-80 xl:w-96 border-l border-oil-800 overflow-y-auto">
          <SidePanel />
        </div>
      </div>

      <BottomBar />
      <OfflineIncomeModal />
      <ToastContainer />
    </div>
  )
}
