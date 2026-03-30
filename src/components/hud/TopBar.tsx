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
    <div className="flex items-center justify-between px-3 py-1.5"
      style={{
        background: 'linear-gradient(180deg, rgba(10,9,7,0.88) 0%, rgba(10,9,7,0.6) 80%, transparent 100%)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Resources — the primary HUD information */}
      <div className="flex items-center gap-3">
        <ResourceCounter emoji="💰" label="Cash" value={petrodollars} color="text-crude-400" />
        <div className="w-[1px] h-4 bg-oil-700/20" />
        <ResourceCounter emoji="🛢️" label="Crude" value={crudeOil} maxValue={storageCapacity} color="text-amber-400" />
        {refinedOil > 0.5 && (
          <>
            <div className="w-[1px] h-4 bg-oil-700/20" />
            <ResourceCounter emoji="⚗️" label="Refined" value={refinedOil} color="text-sky-400" />
          </>
        )}
      </div>

      {/* Center: Production + Market — compact status */}
      <div className="flex items-center gap-2">
        {productionRate > 0 && (
          <span className="text-[10px] font-bold text-crude-400/70 tabular-nums">
            +{formatNumber(productionRate)}/s
          </span>
        )}
        <div className={cn(
          'text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full',
          isBull ? 'text-emerald-400 bg-emerald-500/10' :
          isBear ? 'text-red-400 bg-red-500/10' :
          'text-oil-500 bg-oil-800/20'
        )}>
          {isBull ? '▲' : isBear ? '▼' : '–'}{marketPct}%
        </div>
      </div>

      {/* Right: Player status — minimal */}
      <div className="flex items-center gap-1.5">
        {tokenDisplay && (
          <span className="text-[9px] font-bold text-crude-400/80 tabular-nums">🪙{tokenDisplay}</span>
        )}
        {playerTitle && (
          <span className="hidden md:inline text-[8px] font-bold text-crude-600/60">{playerTitle}</span>
        )}
        {xpLevel > 0 && (
          <span className="text-[8px] font-bold text-oil-600/60 tabular-nums">L{xpLevel}</span>
        )}
        {loginStreak > 1 && (
          <span className="text-[8px] text-orange-600/50 tabular-nums">🔥{loginStreak}</span>
        )}
        {publicKey && (
          <button
            onClick={() => disconnect()}
            title="Disconnect"
            className="text-[8px] text-oil-600/50 font-mono hover:text-flame/70 transition-colors ml-1"
          >
            {truncateWallet(publicKey.toBase58(), 3)}
          </button>
        )}
      </div>
    </div>
  )
}
