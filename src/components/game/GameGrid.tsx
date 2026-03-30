'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'
import { PipelineOverlay } from './PipelineOverlay'
import { GRID_SIZE } from '@/engine/constants'

export function GameGrid() {
  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)

  return (
    <div className="relative w-full max-w-[780px] max-h-[calc(100vh-8rem)]">
      {/* Empire label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-oil-600/30 uppercase tracking-[0.15em] select-none z-10">
        {unlockedTileCount <= 1 ? 'Your Empire Begins Here' : `${unlockedTileCount} plots claimed`}
      </div>

      {/* Grid — NO background, NO border, NO wrapper styling. Fully transparent. */}
      <div className="relative">
        <div
          className="relative grid w-full aspect-square z-[2]"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gap: '0px',
          }}
        >
          {plots.map((plot) => (
            <GridCell key={`${plot.x}-${plot.y}`} cell={plot} />
          ))}
        </div>

        {/* Pipeline connections */}
        <PipelineOverlay plots={plots} />
      </div>
    </div>
  )
}
