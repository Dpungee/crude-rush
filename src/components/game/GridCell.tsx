'use client'

import type { GridCell as GridCellType } from '@/engine/types'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { BUILDING_DEFINITIONS } from '@/engine/buildings'
import { cn, formatCommas } from '@/lib/utils'

interface GridCellProps {
  cell: GridCellType
}

export function GridCell({ cell }: GridCellProps) {
  const unlockTile = useGameStore((s) => s.unlockTile)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const selectCell = useUiStore((s) => s.selectCell)
  const selectedCell = useUiStore((s) => s.selectedCell)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const isSelected = selectedCell?.x === cell.x && selectedCell?.y === cell.y
  const canAffordUnlock = petrodollars >= cell.unlockCost

  const handleClick = () => {
    if (cell.status === 'locked') return

    if (cell.status === 'available') {
      if (!canAffordUnlock) {
        addToast({ message: `Need $${formatCommas(cell.unlockCost)} to unlock`, type: 'error' })
        return
      }
      const success = unlockTile(cell.x, cell.y)
      if (success) {
        trackEvent('tile_unlocked', 1)
        addToast({ message: 'Plot unlocked!', type: 'success' })
      }
      return
    }

    // Unlocked tile — open build/upgrade menu
    selectCell(cell.x, cell.y)
  }

  const building = cell.building ? BUILDING_DEFINITIONS[cell.building] : null

  // Locked tile
  if (cell.status === 'locked') {
    return (
      <div className="relative aspect-square rounded-md bg-oil-950 border border-oil-900/50 flex items-center justify-center opacity-30">
        <span className="text-base text-oil-700">🔒</span>
      </div>
    )
  }

  // Available tile (purchasable)
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square rounded-md border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-0.5',
          'hover:scale-[1.04] active:scale-[0.97]',
          canAffordUnlock
            ? 'border-crude-500/60 bg-crude-900/10 hover:bg-crude-800/20 hover:border-crude-400 animate-pulse-glow'
            : 'border-oil-700/50 bg-oil-950/30 opacity-60'
        )}
      >
        <span className="text-xs font-bold text-crude-400/80">🔓</span>
        <span className="text-[9px] font-bold text-crude-500/70 leading-none">
          ${formatCommas(cell.unlockCost)}
        </span>
      </button>
    )
  }

  // Unlocked tile
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative aspect-square rounded-md border transition-all duration-150',
        'flex flex-col items-center justify-center gap-0.5',
        'hover:scale-[1.03] active:scale-[0.97]',
        building
          ? 'bg-oil-800/80 border-oil-600 hover:border-crude-500/50'
          : 'bg-oil-900/40 border-oil-800/40 border-dashed hover:border-crude-500/30 hover:bg-oil-800/30',
        isSelected && 'ring-2 ring-crude-500 border-crude-500'
      )}
    >
      {building ? (
        <>
          <span
            className={cn(
              'text-2xl',
              cell.building === 'oil_well' && 'animate-pump',
              cell.building === 'refinery' && 'animate-pulse'
            )}
          >
            {building.emoji}
          </span>
          <span className="text-[9px] font-bold text-crude-400 leading-none">
            Lv.{cell.level}
          </span>
        </>
      ) : (
        <span className="text-lg text-oil-700 leading-none">+</span>
      )}
    </button>
  )
}
