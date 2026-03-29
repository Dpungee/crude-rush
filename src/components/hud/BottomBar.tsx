'use client'

import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { NextGoalCard } from './NextGoalCard'

export function BottomBar() {
  const productionRate = useGameStore((s) => s.productionRate)
  const refineryRate = useGameStore((s) => s.refineryRate)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const pendingTokens = usePlayerStore((s) => s.pendingCrudeTokens)

  const tokenDisplay = pendingTokens > 0 ? (pendingTokens / 1_000_000).toFixed(1) : null

  return (
    <div className="bg-oil-900/95 border-t border-oil-800/60 backdrop-blur-sm px-3 py-1.5">
      <div className="flex items-center gap-3">
        {/* Left: Next goal card */}
        <div className="flex-1 min-w-0">
          <NextGoalCard />
        </div>

        {/* Right: Compact live stats */}
        <div className="flex items-center gap-3 shrink-0 text-[10px]">
          {productionRate > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[8px]">⚡</span>
              <span className="font-bold text-crude-400 tabular-nums">{formatNumber(productionRate)}/s</span>
            </div>
          )}
          {refineryRate > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[8px]">🔥</span>
              <span className="font-bold text-red-400 tabular-nums">{formatNumber(refineryRate / 2)}/s</span>
            </div>
          )}
          <div className="text-muted-foreground tabular-nums">
            {formatNumber(lifetimeBarrels)} bbl
          </div>
          {tokenDisplay && (
            <div className="flex items-center gap-0.5 text-crude-400 font-bold">
              <span className="text-[8px]">🪙</span>
              {tokenDisplay}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
