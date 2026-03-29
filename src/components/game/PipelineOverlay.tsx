'use client'

/**
 * PipelineOverlay — draws visual pipes between adjacent buildings.
 *
 * Renders as an SVG overlay on top of the grid. Scans the plots array
 * to find adjacent building pairs and draws pipes between their centers.
 *
 * Pipe types (visual only — no gameplay effect):
 *   producer → refinery:   amber pipe (crude flow)
 *   refinery → storage:    red pipe (refined flow)
 *   terminal → neighbor:   yellow pipe (aura link)
 *   any → any:             grey pipe (infrastructure)
 *
 * Flow animation: subtle gradient animation along pipes to show
 * resource movement direction.
 */

import { useMemo } from 'react'
import type { GridCell, BuildingType } from '@/engine/types'
import { GRID_SIZE } from '@/engine/constants'

interface PipelineOverlayProps {
  plots: GridCell[]
}

// Which directions to check — only right and down to avoid duplicate lines
const EDGES: [number, number][] = [
  [1, 0],  // right
  [0, 1],  // down
]

const PRODUCERS = new Set<BuildingType>(['oil_well', 'pump_jack', 'derrick'])

interface Pipe {
  x1: number; y1: number
  x2: number; y2: number
  type: 'crude' | 'refined' | 'aura' | 'infra'
}

function getPipeType(a: BuildingType, b: BuildingType): Pipe['type'] {
  const aIsProducer = PRODUCERS.has(a)
  const bIsProducer = PRODUCERS.has(b)
  const aIsRefinery = a === 'refinery'
  const bIsRefinery = b === 'refinery'
  const aIsStorage = a === 'storage_tank'
  const bIsStorage = b === 'storage_tank'
  const aIsTerminal = a === 'oil_terminal'
  const bIsTerminal = b === 'oil_terminal'

  // Producer → Refinery = crude flow
  if ((aIsProducer && bIsRefinery) || (bIsProducer && aIsRefinery)) return 'crude'
  // Refinery → Storage = refined flow
  if ((aIsRefinery && bIsStorage) || (bIsRefinery && aIsStorage)) return 'refined'
  // Terminal connections = aura
  if (aIsTerminal || bIsTerminal) return 'aura'
  // Everything else
  return 'infra'
}

const PIPE_COLORS: Record<Pipe['type'], { stroke: string; glow: string }> = {
  crude:   { stroke: 'rgba(217,119,6,0.35)',  glow: 'rgba(217,119,6,0.15)' },
  refined: { stroke: 'rgba(220,38,38,0.30)',  glow: 'rgba(220,38,38,0.12)' },
  aura:    { stroke: 'rgba(234,179,8,0.25)',  glow: 'rgba(234,179,8,0.10)' },
  infra:   { stroke: 'rgba(120,113,100,0.20)', glow: 'rgba(120,113,100,0.08)' },
}

export function PipelineOverlay({ plots }: PipelineOverlayProps) {
  const pipes = useMemo(() => {
    const result: Pipe[] = []
    const plotMap = new Map<string, GridCell>()
    for (const p of plots) {
      plotMap.set(`${p.x},${p.y}`, p)
    }

    for (const p of plots) {
      if (!p.building) continue
      for (const [dx, dy] of EDGES) {
        const nx = p.x + dx
        const ny = p.y + dy
        if (nx >= GRID_SIZE || ny >= GRID_SIZE) continue
        const neighbor = plotMap.get(`${nx},${ny}`)
        if (!neighbor?.building) continue

        result.push({
          x1: p.x, y1: p.y,
          x2: nx, y2: ny,
          type: getPipeType(p.building, neighbor.building),
        })
      }
    }
    return result
  }, [plots])

  if (pipes.length === 0) return null

  // Each cell is 1/GRID_SIZE of the container. Center of cell (x,y) in % coordinates:
  // cx = (x + 0.5) / GRID_SIZE * 100
  // cy = (y + 0.5) / GRID_SIZE * 100

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Flow animation — subtle moving dash */}
        <filter id="pipeGlow">
          <feGaussianBlur stdDeviation="0.3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {pipes.map((pipe, i) => {
        const cellSize = 100 / GRID_SIZE
        const cx1 = (pipe.x1 + 0.5) * cellSize
        const cy1 = (pipe.y1 + 0.5) * cellSize
        const cx2 = (pipe.x2 + 0.5) * cellSize
        const cy2 = (pipe.y2 + 0.5) * cellSize
        const colors = PIPE_COLORS[pipe.type]
        const isFlow = pipe.type === 'crude' || pipe.type === 'refined'

        return (
          <g key={i}>
            {/* Glow layer */}
            <line
              x1={cx1} y1={cy1} x2={cx2} y2={cy2}
              stroke={colors.glow}
              strokeWidth="1.2"
              strokeLinecap="round"
              filter="url(#pipeGlow)"
            />
            {/* Main pipe */}
            <line
              x1={cx1} y1={cy1} x2={cx2} y2={cy2}
              stroke={colors.stroke}
              strokeWidth="0.5"
              strokeLinecap="round"
            />
            {/* Flow dots — animated dashes moving along the pipe */}
            {isFlow && (
              <line
                x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                stroke={colors.stroke}
                strokeWidth="0.3"
                strokeDasharray="0.8 2.5"
                strokeLinecap="round"
                opacity="0.6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-3.3"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            )}
            {/* Pipe joints at each end */}
            <circle cx={cx1} cy={cy1} r="0.4" fill={colors.stroke} />
            <circle cx={cx2} cy={cy2} r="0.4" fill={colors.stroke} />
          </g>
        )
      })}
    </svg>
  )
}
