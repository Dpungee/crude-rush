'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/lib/utils'

export function BottomBar() {
  const productionRate = useGameStore((s) => s.productionRate)
  const refineryRate = useGameStore((s) => s.refineryRate)
  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)

  const buildingCount = plots.filter((p) => p.building !== null).length

  return (
    <div className="h-10 bg-oil-900/90 border-t border-oil-800 flex items-center justify-between px-4 text-xs backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <span className="text-muted-foreground">
          Production:{' '}
          <span className="text-crude-400 font-bold">
            {formatNumber(productionRate)} bbl/s
          </span>
        </span>

        {refineryRate > 0 && (
          <span className="text-muted-foreground">
            Refining:{' '}
            <span className="text-petro-blue font-bold">
              {formatNumber(refineryRate)} bbl/s
            </span>
          </span>
        )}

        <span className="text-muted-foreground">
          Plots:{' '}
          <span className="text-foreground font-medium">
            {buildingCount} buildings / {unlockedTileCount} unlocked
          </span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-muted-foreground">
          Lifetime:{' '}
          <span className="text-foreground font-medium">
            {formatNumber(lifetimeBarrels)} bbl
          </span>
        </span>

        {prestigeLevel > 0 && (
          <span className="text-muted-foreground">
            Prestige:{' '}
            <span className="text-crude-400 font-bold">
              Lv.{prestigeLevel}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
