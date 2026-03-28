'use client'

import { useState } from 'react'
import type { GridCell as GridCellType } from '@/engine/types'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { BUILDING_DEFINITIONS } from '@/engine/buildings'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils'

interface GridCellProps {
  cell: GridCellType
}

export function GridCell({ cell }: GridCellProps) {
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleAmount, setBubbleAmount] = useState(0)
  const collectFromCell = useGameStore((s) => s.collectFromCell)
  const selectCell = useUiStore((s) => s.selectCell)
  const selectedCell = useUiStore((s) => s.selectedCell)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const isSelected =
    selectedCell?.x === cell.x && selectedCell?.y === cell.y

  const handleClick = () => {
    if (cell.building) {
      // Collect oil and show bubble
      const collected = collectFromCell(cell.x, cell.y)
      if (collected > 0) {
        setBubbleAmount(collected)
        setShowBubble(true)
        trackEvent('barrels_collected', collected)
        setTimeout(() => setShowBubble(false), 1500)
      }
      // Also select for upgrade
      selectCell(cell.x, cell.y)
    } else {
      // Empty cell — open build menu
      selectCell(cell.x, cell.y)
    }
  }

  const building = cell.building ? BUILDING_DEFINITIONS[cell.building] : null

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative aspect-square rounded-lg border transition-all duration-150',
        'flex flex-col items-center justify-center gap-0.5',
        'hover:scale-[1.03] active:scale-[0.97]',
        cell.building
          ? 'bg-oil-800/80 border-oil-600 hover:border-crude-500/50'
          : 'bg-oil-900/50 border-oil-800/50 border-dashed hover:border-crude-500/30 hover:bg-oil-800/30',
        isSelected && 'ring-2 ring-crude-500 border-crude-500'
      )}
    >
      {building ? (
        <>
          <span
            className={cn(
              'text-2xl md:text-3xl',
              cell.building === 'oil_well' && 'animate-pump',
              cell.building === 'refinery' && 'animate-pulse'
            )}
          >
            {building.emoji}
          </span>
          <span className="text-[10px] font-bold text-crude-400">
            Lv.{cell.level}
          </span>
        </>
      ) : (
        <span className="text-xl text-oil-600 group-hover:text-crude-500/50">+</span>
      )}

      {/* Production bubble */}
      {showBubble && bubbleAmount > 0 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-bubble-up pointer-events-none">
          <span className="text-sm font-bold text-crude-400 whitespace-nowrap">
            +{formatNumber(bubbleAmount)} bbl
          </span>
        </div>
      )}
    </button>
  )
}
