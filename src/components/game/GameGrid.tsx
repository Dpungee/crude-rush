'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'
import { GRID_SIZE } from '@/engine/constants'

export function GameGrid() {
  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)

  return (
    <div className="relative w-full max-w-[660px]">
      {/* Empire status label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-oil-600/40 uppercase tracking-[0.15em] select-none">
        {unlockedTileCount <= 1 ? 'Your Empire Begins Here' : `${unlockedTileCount} plots claimed`}
      </div>

      <div
        className="grid w-full aspect-square"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: '2px',
        }}
      >
        {plots.map((plot) => (
          <GridCell key={`${plot.x}-${plot.y}`} cell={plot} />
        ))}
      </div>
    </div>
  )
}
