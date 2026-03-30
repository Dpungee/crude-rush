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

      {/* World container — NO rounded corners, NO card feel, terrain fills to edges */}
      <div className="relative overflow-hidden"
        style={{ background: '#0e0c0a' }}
      >
        {/* Central warm zone — radial, NOT square. This is the main terrain light. */}
        <div className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(50,40,28,0.5) 0%, rgba(30,25,18,0.3) 25%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 40% 45%, rgba(80,60,35,0.08) 0%, transparent 100%),
              radial-gradient(ellipse 40% 60% at 60% 55%, rgba(70,55,30,0.06) 0%, transparent 100%),
              radial-gradient(ellipse 30% 25% at 25% 30%, rgba(90,65,35,0.04) 0%, transparent 100%),
              radial-gradient(ellipse 25% 30% at 75% 70%, rgba(85,60,30,0.03) 0%, transparent 100%)`,
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
