'use client'

import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function BottomBar() {
  const productionRate = useGameStore((s) => s.productionRate)
  const refineryRate = useGameStore((s) => s.refineryRate)
  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const prestigeMultiplier = useGameStore((s) => s.prestigeMultiplier)
  const pendingTokens = usePlayerStore((s) => s.pendingCrudeTokens)

  const buildingCount = plots.filter((p) => p.building !== null).length
  const tokenDisplay = pendingTokens > 0 ? (pendingTokens / 1_000_000).toFixed(1) : '0'

  return (
    <div className="h-10 bg-oil-900/95 border-t border-oil-800/60 flex items-center justify-between px-4 text-[10px] backdrop-blur-sm">
      {/* Left: Production stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]">⚡</span>
          <span className={cn(
            'font-bold tabular-nums',
            productionRate > 0 ? 'text-crude-400' : 'text-oil-600'
          )}>
            {formatNumber(productionRate)} bbl/s
          </span>
        </div>

        {refineryRate > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">🔥</span>
            <span className="font-bold text-red-400 tabular-nums">
              {formatNumber(refineryRate / 2)}/s refined
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="font-medium">{buildingCount}</span>
          <span className="opacity-50">/</span>
          <span className="font-medium">{unlockedTileCount}</span>
          <span className="opacity-50 ml-0.5">plots</span>
        </div>
      </div>

      {/* Right: Lifetime stats + token + prestige */}
      <div className="flex items-center gap-4">
        <div className="text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground/80">{formatNumber(lifetimeBarrels)}</span>
          <span className="opacity-50 ml-0.5">lifetime bbl</span>
        </div>

        {pendingTokens > 0 && (
          <div className="flex items-center gap-1 bg-crude-950/40 px-1.5 py-0.5 rounded border border-crude-800/30">
            <span className="text-[9px]">🪙</span>
            <span className="font-bold text-crude-400 tabular-nums">{tokenDisplay}</span>
          </div>
        )}

        {prestigeLevel > 0 && (
          <div className="flex items-center gap-1 bg-violet-950/30 px-1.5 py-0.5 rounded border border-violet-800/30">
            <span className="text-[9px]">🌟</span>
            <span className="font-bold text-violet-400 tabular-nums">P{prestigeLevel}</span>
            <span className="text-violet-500/50 tabular-nums">{prestigeMultiplier.toFixed(1)}x</span>
          </div>
        )}
      </div>
    </div>
  )
}
