'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useMarketStore } from '@/stores/marketStore'
import { ResourceCounter } from './ResourceCounter'
import { truncateWallet, formatNumber, getPlayerTitle } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { publicKey, disconnect } = useWallet()
  const petrodollars = useGameStore((s) => s.petrodollars)
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const storageCapacity = useGameStore((s) => s.storageCapacity)
  const productionRate = useGameStore((s) => s.productionRate)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const xpLevel = useGameStore((s) => s.xpLevel)
  const loginStreak = usePlayerStore((s) => s.loginStreak)
  const pendingTokens = usePlayerStore((s) => s.pendingCrudeTokens)
  const marketState = useMarketStore((s) => s.state)
  const crudeMult = useMarketStore((s) => s.crudeMult)

  const playerTitle = getPlayerTitle(lifetimeBarrels)
  const marketPct = ((crudeMult - 1) * 100).toFixed(0)
  const isBull = marketState === 'bull' || marketState === 'boom'
  const isBear = marketState === 'bear' || marketState === 'crash'
  const tokenDisplay = pendingTokens > 0 ? (pendingTokens / 1_000_000).toFixed(1) : null

  return (
    <div className="h-10 flex items-center justify-between px-3 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(15,13,10,0.95) 0%, rgba(15,13,10,0.85) 100%)',
        borderBottom: '1px solid rgba(50,45,35,0.3)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Left: Resources */}
      <div className="flex items-center gap-3">
        <ResourceCounter emoji="💰" label="Cash" value={petrodollars} color="text-crude-400" />
        <ResourceCounter emoji="🛢️" label="Crude" value={crudeOil} maxValue={storageCapacity} color="text-amber-400" />
        {refinedOil > 0.5 && (
          <ResourceCounter emoji="⚗️" label="Refined" value={refinedOil} color="text-sky-400" />
        )}
      </div>

      {/* Center: Production + Market */}
      <div className="flex items-center gap-2">
        {productionRate > 0 && (
          <span className="text-[10px] font-bold text-crude-400/80 tabular-nums">
            +{formatNumber(productionRate)}/s
          </span>
        )}
        <div className={cn(
          'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded',
          isBull ? 'text-emerald-400 bg-emerald-950/40' :
          isBear ? 'text-red-400 bg-red-950/40' :
          'text-oil-400 bg-oil-800/30'
        )}>
          {isBull ? '▲' : isBear ? '▼' : '–'}{marketPct}%
        </div>
      </div>

      {/* Right: Status + Wallet */}
      <div className="flex items-center gap-2">
        {tokenDisplay && (
          <span className="text-[10px] font-bold text-crude-400 tabular-nums">
            🪙{tokenDisplay}
          </span>
        )}
        {playerTitle && (
          <span className="hidden md:inline text-[9px] font-bold text-crude-500/70">{playerTitle}</span>
        )}
        {xpLevel > 0 && (
          <span className="text-[9px] font-bold text-oil-500 tabular-nums">L{xpLevel}</span>
        )}
        {loginStreak > 1 && (
          <span className="text-[9px] text-orange-500/60 tabular-nums">🔥{loginStreak}</span>
        )}
        {publicKey && (
          <button
            onClick={() => disconnect()}
            title="Disconnect wallet"
            className="text-[9px] text-oil-500 font-mono hover:text-flame transition-colors px-1.5 py-0.5 rounded hover:bg-oil-800/40"
          >
            {truncateWallet(publicKey.toBase58(), 3)}
          </button>
        )}
      </div>
    </div>
  )
}
