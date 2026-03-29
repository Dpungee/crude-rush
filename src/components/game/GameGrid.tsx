'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'
import { GRID_SIZE } from '@/engine/constants'

export function GameGrid() {
  const plots = useGameStore((s) => s.plots)

  return (
    <div
      className="grid w-full max-w-[660px] aspect-square"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: GRID_SIZE > 9 ? '2px' : '4px',
      }}
    >
      {plots.map((plot) => (
        <GridCell key={`${plot.x}-${plot.y}`} cell={plot} />
      ))}
    </div>
  )
}
