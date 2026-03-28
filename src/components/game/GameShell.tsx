'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGameStore, createInitialGameState } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { calculateOfflineIncome } from '@/engine/offline'
import { TICK_INTERVAL_MS, SAVE_INTERVAL_MS } from '@/engine/constants'
import { GameGrid } from './GameGrid'
import { TopBar } from '@/components/hud/TopBar'
import { BottomBar } from '@/components/hud/BottomBar'
import { SidePanel } from '@/components/panels/SidePanel'
import { BuildMenu } from './BuildMenu'
import { OfflineIncomeModal } from '@/components/shared/OfflineIncomeModal'
import { ToastContainer } from '@/components/shared/ToastContainer'

export function GameShell() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toBase58() || ''
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isLoadedRef = useRef(false)

  const gameTick = useGameStore((s) => s.tick)
  const hydrate = useGameStore((s) => s.hydrate)
  const serialize = useGameStore((s) => s.serialize)
  const setOfflineIncome = useUiStore((s) => s.setOfflineIncome)

  // Load game data on mount
  useEffect(() => {
    if (!walletAddress || isLoadedRef.current) return

    async function loadGame() {
      try {
        const res = await fetch('/api/game/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        })

        if (res.ok) {
          const data = await res.json()
          hydrate(data.gameState)

          // Calculate offline income
          const state = useGameStore.getState()
          const offlineResult = calculateOfflineIncome(state)

          if (offlineResult.secondsOffline > 10 && offlineResult.crudeEarned > 0) {
            // Apply offline income
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

          // Hydrate missions
          if (data.missions?.length) {
            useMissionStore.getState().hydrate(data.missions)
          } else {
            useMissionStore.getState().initializeMissions()
          }

          usePlayerStore.getState().setWallet(walletAddress)
          if (data.player.loginStreak) {
            usePlayerStore.getState().setLoginStreak(data.player.loginStreak)
          }
        } else {
          // New player — use initial state
          useGameStore.setState(createInitialGameState())
          useMissionStore.getState().initializeMissions()
          usePlayerStore.getState().setWallet(walletAddress)
        }
      } catch (err) {
        console.error('Failed to load game:', err)
        useGameStore.setState(createInitialGameState())
        useMissionStore.getState().initializeMissions()
        usePlayerStore.getState().setWallet(walletAddress)
      }

      isLoadedRef.current = true
    }

    loadGame()
  }, [walletAddress, hydrate, setOfflineIncome])

  // Save function
  const saveGame = useCallback(async () => {
    if (!walletAddress) return
    try {
      const gameState = serialize()
      gameState.wallet_address = walletAddress

      // Include upgrades from store
      const upgrades = useGameStore.getState().upgrades

      await fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          gameState: { ...gameState, upgrades },
        }),
      })
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }, [walletAddress, serialize])

  // Start tick loop
  useEffect(() => {
    tickRef.current = setInterval(() => {
      gameTick()
    }, TICK_INTERVAL_MS)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [gameTick])

  // Start save loop
  useEffect(() => {
    saveRef.current = setInterval(saveGame, SAVE_INTERVAL_MS)

    return () => {
      if (saveRef.current) clearInterval(saveRef.current)
    }
  }, [saveGame])

  // Save on tab blur / close
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveGame()
      }
    }

    const handleBeforeUnload = () => {
      saveGame()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveGame])

  return (
    <div className="h-screen flex flex-col bg-oil-950 overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Game Grid — center */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <GameGrid />
          <BuildMenu />
        </div>

        {/* Side Panel — right */}
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
