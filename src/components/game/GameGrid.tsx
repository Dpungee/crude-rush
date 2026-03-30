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

      {/* World container — continuous terrain, no visible grid */}
      <div className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(170deg, #1e1812 0%, #17130e 30%, #110e0a 60%, #0d0b08 100%)',
        }}
      >
        {/* Terrain variation — natural ground patches */}
        <div className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 40% 35% at 25% 25%, rgba(139,92,46,0.06) 0%, transparent 100%),
              radial-gradient(ellipse 30% 40% at 65% 55%, rgba(120,80,40,0.05) 0%, transparent 100%),
              radial-gradient(ellipse 45% 30% at 45% 80%, rgba(100,70,30,0.04) 0%, transparent 100%),
              radial-gradient(ellipse 20% 20% at 80% 20%, rgba(80,60,35,0.03) 0%, transparent 100%)`,
          }}
        />

        {/* Grid — ZERO gap, seamless continuous ground */}
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

          {/* Pipeline connections between adjacent buildings */}
          <PipelineOverlay plots={plots} />
        </div>
      </div>
    </div>
  )
}
