'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'
import { PipelineOverlay } from './PipelineOverlay'
import { GRID_SIZE } from '@/engine/constants'

export function GameGrid() {
  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)

  return (
    <div className="relative w-full max-w-[660px]">
      {/* Empire label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-oil-600/40 uppercase tracking-[0.15em] select-none">
        {unlockedTileCount <= 1 ? 'Your Empire Begins Here' : `${unlockedTileCount} plots claimed`}
      </div>

      {/* Terrain container — the desert ground the grid sits on */}
      <div className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1610 0%, #15120d 40%, #100e0a 100%)',
        }}
      >
        {/* Terrain noise texture */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(139,92,46,0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 60%, rgba(120,80,40,0.06) 0%, transparent 40%),
              radial-gradient(circle at 50% 80%, rgba(100,70,30,0.05) 0%, transparent 45%)`,
          }}
        />

        {/* Grid — seamless tiles, 1px gaps simulate terrain cracks */}
        <div className="relative">
          <div
            className="relative grid w-full aspect-square z-[2]"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gap: '1px',
              backgroundColor: '#0d0b08',
            }}
          >
            {plots.map((plot) => (
              <GridCell key={`${plot.x}-${plot.y}`} cell={plot} />
            ))}
          </div>

          {/* Pipeline connections between adjacent buildings */}
          <PipelineOverlay plots={plots} />
        </div>
      </div>
    </div>
  )
}
