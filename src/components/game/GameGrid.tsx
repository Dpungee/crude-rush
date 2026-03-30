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

      {/* TERRAIN — one continuous ground surface. Cells are transparent on top. */}
      <div className="relative overflow-hidden"
        style={{ background: '#0e0c0a' }}
      >
        {/* Radial warm center — circular light, not square bands */}
        <div className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(55,42,25,0.6) 0%, rgba(35,28,18,0.35) 20%, rgba(20,16,10,0.15) 40%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 45% 48%, rgba(70,50,28,0.12) 0%, transparent 100%),
              radial-gradient(ellipse 35% 45% at 58% 52%, rgba(60,45,25,0.08) 0%, transparent 100%)`,
          }}
        />

        {/* Dirt texture patches — organic, irregular */}
        <div className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 12% 8% at 30% 35%, rgba(100,75,40,0.06) 0%, transparent 100%),
              radial-gradient(ellipse 8% 12% at 65% 45%, rgba(90,65,35,0.05) 0%, transparent 100%),
              radial-gradient(ellipse 15% 10% at 42% 62%, rgba(80,60,30,0.04) 0%, transparent 100%),
              radial-gradient(ellipse 10% 7% at 55% 30%, rgba(95,70,38,0.04) 0%, transparent 100%),
              radial-gradient(ellipse 6% 10% at 38% 72%, rgba(85,62,32,0.03) 0%, transparent 100%)`,
          }}
        />

        {/* Grid — cells are TRANSPARENT. Terrain shows through. */}
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
    </div>
  )
}
