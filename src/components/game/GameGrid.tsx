'use client'

import { useGameStore } from '@/stores/gameStore'
import { GridCell } from './GridCell'

export function GameGrid() {
  const gridSize = useGameStore((s) => s.gridSize)
  const cells = useGameStore((s) => s.cells)

  return (
    <div
      className="grid gap-1.5 w-full max-w-[520px] aspect-square"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      }}
    >
      {cells.map((cell) => (
        <GridCell key={`${cell.x}-${cell.y}`} cell={cell} />
      ))}
    </div>
  )
}
