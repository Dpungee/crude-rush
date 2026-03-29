'use client'

import type { GridCell as GridCellType, BuildingType } from '@/engine/types'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import {
  BUILDING_DEFINITIONS,
  getBuildingProduction,
  getBuildingStorageBonus,
  getBuildingRefineryRate,
} from '@/engine/buildings'
import { cn, formatNumber, formatCommas } from '@/lib/utils'

interface GridCellProps {
  cell: GridCellType
}

// Full static class strings — Tailwind tree-shaking requires literal strings
const BUILDING_BORDER: Record<BuildingType, string> = {
  oil_well:     'border-amber-600/70',
  pump_jack:    'border-sky-600/70',
  derrick:      'border-violet-600/70',
  oil_terminal: 'border-yellow-400/90',
  storage_tank: 'border-emerald-700/70',
  refinery:     'border-red-700/70',
}

const BUILDING_BG: Record<BuildingType, string> = {
  oil_well:     'bg-amber-950/40',
  pump_jack:    'bg-sky-950/40',
  derrick:      'bg-violet-950/40',
  oil_terminal: 'bg-yellow-950/50',
  storage_tank: 'bg-emerald-950/40',
  refinery:     'bg-red-950/40',
}

const BUILDING_METRIC_COLOR: Record<BuildingType, string> = {
  oil_well:     'text-amber-400',
  pump_jack:    'text-sky-400',
  derrick:      'text-violet-400',
  oil_terminal: 'text-yellow-400',
  storage_tank: 'text-emerald-400',
  refinery:     'text-red-400',
}

const BUILDING_BAR: Record<BuildingType, string> = {
  oil_well:     'bg-amber-500',
  pump_jack:    'bg-sky-500',
  derrick:      'bg-violet-500',
  oil_terminal: 'bg-yellow-400',
  storage_tank: 'bg-emerald-500',
  refinery:     'bg-red-500',
}

function getBuildingMetric(type: BuildingType, level: number): string {
  if (type === 'oil_terminal') return '↑20% aura'
  const storage = getBuildingStorageBonus(type, level)
  if (storage > 0) return `+${formatNumber(storage, 0)} cap`
  const refRate = getBuildingRefineryRate(type, level)
  if (refRate > 0) return `→${formatNumber(refRate / 2, 1)}/s`
  const prod = getBuildingProduction(type, level)
  if (prod > 0) return `+${formatNumber(prod, 1)}/s`
  return ''
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

    selectCell(cell.x, cell.y)
  }

  const def = cell.building ? BUILDING_DEFINITIONS[cell.building] : null
  const isProducer = cell.building && ['oil_well', 'pump_jack', 'derrick'].includes(cell.building)
  const isRefinery = cell.building === 'refinery'
  const isTerminal = cell.building === 'oil_terminal'
  const metric = def ? getBuildingMetric(cell.building!, cell.level) : ''

  // ── LOCKED ────────────────────────────────────────────────────────────────
  if (cell.status === 'locked') {
    return (
      <div className="relative aspect-square rounded-md bg-oil-950/80 border border-oil-900/30 flex items-center justify-center opacity-20 select-none">
        <span className="text-xs text-oil-800">🔒</span>
      </div>
    )
  }

  // ── AVAILABLE (purchasable) ───────────────────────────────────────────────
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square rounded-md border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-0.5',
          'hover:scale-[1.05] active:scale-[0.97]',
          canAffordUnlock
            ? 'border-crude-500/50 bg-crude-950/20 hover:bg-crude-900/30 hover:border-crude-400/70 animate-pulse-glow'
            : 'border-oil-700/30 bg-oil-950/20 opacity-40'
        )}
      >
        <span className="text-[10px] leading-none select-none">🔓</span>
        <span className={cn(
          'text-[8px] font-bold leading-none tabular-nums',
          canAffordUnlock ? 'text-crude-400' : 'text-oil-600'
        )}>
          ${formatCommas(cell.unlockCost)}
        </span>
      </button>
    )
  }

  // ── UNLOCKED ──────────────────────────────────────────────────────────────
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative aspect-square rounded-md border transition-all duration-150 overflow-hidden',
        'flex flex-col items-center justify-center',
        'hover:scale-[1.04] active:scale-[0.97]',
        def
          ? [BUILDING_BG[cell.building!], BUILDING_BORDER[cell.building!], 'hover:brightness-110']
          : 'bg-oil-900/30 border-oil-800/30 border-dashed hover:border-crude-500/25 hover:bg-oil-800/30',
        isSelected && 'ring-2 ring-crude-400 ring-offset-1 ring-offset-oil-950 scale-[1.04]',
        isTerminal && 'shadow-[0_0_16px_rgba(234,179,8,0.3)]'
      )}
    >
      {def ? (
        <>
          {/* Level badge — top-right */}
          <div className="absolute top-0.5 right-0.5 z-10 text-[7px] font-black text-oil-400 bg-oil-900/80 px-0.5 rounded-sm leading-tight">
            {cell.level}
          </div>

          {/* Building icon */}
          <span
            className={cn(
              'text-[1.3rem] leading-none select-none',
              cell.building === 'oil_well' && 'animate-pump',
              isRefinery && 'animate-pulse',
              isTerminal && 'drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]'
            )}
          >
            {def.emoji}
          </span>

          {/* Production metric */}
          {metric && (
            <span className={cn(
              'text-[7.5px] font-bold leading-none tabular-nums mt-0.5',
              BUILDING_METRIC_COLOR[cell.building!]
            )}>
              {metric}
            </span>
          )}

          {/* Active production bar — thin bottom strip */}
          {(isProducer || isRefinery) && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-80">
              <div className={cn('h-full w-full animate-pulse', BUILDING_BAR[cell.building!])} />
            </div>
          )}

          {/* Oil terminal: inner aura border */}
          {isTerminal && (
            <div className="absolute inset-0 rounded-md border border-yellow-400/20 animate-pulse pointer-events-none" />
          )}
        </>
      ) : (
        /* Empty unlocked — tap to build */
        <span className="text-base text-oil-700/40 leading-none select-none">+</span>
      )}
    </button>
  )
}
