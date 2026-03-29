'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { ResourceCounter } from './ResourceCounter'
import { truncateWallet, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { publicKey, disconnect } = useWallet()
  const petrodollars = useGameStore((s) => s.petrodollars)
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const storageCapacity = useGameStore((s) => s.storageCapacity)
  const marketMultiplier = useGameStore((s) => s.marketMultiplier)
  const xpLevel = useGameStore((s) => s.xpLevel)
  const productionRate = useGameStore((s) => s.productionRate)
  const loginStreak = usePlayerStore((s) => s.loginStreak)

  const marketDelta = ((marketMultiplier - 1) * 100).toFixed(0)
  const isMarketUp = marketMultiplier >= 1.05
  const isMarketDown = marketMultiplier <= 0.95

  return (
    <div className="h-14 bg-oil-900/95 border-b border-oil-800 flex items-center justify-between px-4 backdrop-blur-sm flex-shrink-0">
      {/* Left: Brand + live production rate */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xl">🛢️</span>
          <span className="text-base font-black tracking-tight hidden sm:block">
            <span className="text-crude">CRUDE</span>
            <span className="text-foreground ml-0.5">RUSH</span>
          </span>
        </div>
        {productionRate > 0 && (
          <div className="hidden md:flex items-center gap-1 bg-oil-800/60 px-2 py-0.5 rounded-full border border-oil-700/30">
            <span className="text-[9px]">⚡</span>
            <span className="text-[10px] font-bold text-crude-400 tabular-nums">
              {formatNumber(productionRate)}/s
            </span>
          </div>
        )}
      </div>

      {/* Center: Resource chips + market */}
      <div className="flex items-center gap-4 lg:gap-5">
        <ResourceCounter emoji="💰" label="Petrodollars" value={petrodollars} color="text-crude-400" />
        <ResourceCounter emoji="🛢️" label="Crude Oil" value={crudeOil} maxValue={storageCapacity} color="text-amber-400" />
        {refinedOil > 0 && (
          <ResourceCounter emoji="⚗️" label="Refined Oil" value={refinedOil} color="text-sky-400" />
        )}

        {/* Live market multiplier */}
        <div className={cn(
          'hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-300',
          isMarketUp
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
            : isMarketDown
              ? 'bg-red-950/60 text-red-400 border-red-900/50'
              : 'bg-oil-800/60 text-muted-foreground border-oil-700/40'
        )}>
          <span>{isMarketUp ? '📈' : isMarketDown ? '📉' : '📊'}</span>
          <span className="tabular-nums">{isMarketUp ? '+' : ''}{marketDelta}%</span>
        </div>
      </div>

      {/* Right: XP level + streak + wallet */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {xpLevel > 0 && (
          <div className="hidden sm:flex items-center gap-1 bg-oil-800/60 px-2 py-0.5 rounded-full border border-oil-700/30">
            <span className="text-[9px]">⭐</span>
            <span className="text-[10px] font-bold text-crude-300 tabular-nums">Lv{xpLevel}</span>
          </div>
        )}

        {loginStreak > 1 && (
          <div className="hidden sm:flex items-center gap-1 bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-900/40">
            <span className="text-[9px]">🔥</span>
            <span className="text-[10px] font-bold text-orange-400 tabular-nums">{loginStreak}d</span>
          </div>
        )}

        {publicKey && (
          <button
            onClick={() => disconnect()}
            title="Disconnect wallet"
            className="text-[10px] text-muted-foreground font-mono bg-oil-800/80 hover:bg-oil-700 px-2.5 py-1 rounded-md transition-colors hover:text-flame border border-oil-700/40"
          >
            {truncateWallet(publicKey.toBase58())}
          </button>
        )}
      </div>
    </div>
  )
}
