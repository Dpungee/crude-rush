'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'
import { GRID_SIZE } from '@/engine/constants'

export function GameGrid() {
  const plots = useGameStore((s) => s.plots)

  return (
    <div
      className="grid gap-1 w-full max-w-[560px] aspect-square"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
      }}
    >
      {plots.map((plot) => (
        <GridCell key={`${plot.x}-${plot.y}`} cell={plot} />
      ))}
    </div>
  )
}
