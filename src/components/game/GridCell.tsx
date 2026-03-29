'use client'

import { useState } from 'react'
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
import { RING_NAMES } from '@/engine/constants'
import { BuildingRenderer, ConstructionPreview } from '@/components/buildings/BuildingRenderer'

interface GridCellProps {
  cell: GridCellType
}

// ── Ring terrain — each ring has a distinct ground color for zone identity ──
const RING_GROUND: Record<number, string> = {
  0: 'bg-amber-950/20',   // HQ — warm core
  1: 'bg-amber-950/12',   // Starter Fields
  2: 'bg-orange-950/10',  // Expansion Zone
  3: 'bg-stone-900/12',   // Industrial Belt — grey/industrial
  4: 'bg-slate-900/12',   // Deep Reserves — cool steel
  5: 'bg-zinc-900/10',    // Frontier — dark, distant
}

const RING_LOCKED_BORDER: Record<number, string> = {
  0: 'border-amber-900/15',
  1: 'border-amber-900/10',
  2: 'border-orange-900/8',
  3: 'border-stone-800/10',
  4: 'border-slate-800/8',
  5: 'border-zinc-800/6',
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

const BUILDING_GLOW: Record<BuildingType, string> = {
  oil_well:     'shadow-[0_0_8px_rgba(217,119,6,0.25)]',
  pump_jack:    'shadow-[0_0_8px_rgba(3,105,161,0.25)]',
  derrick:      'shadow-[0_0_10px_rgba(124,58,237,0.25)]',
  oil_terminal: 'shadow-[0_0_14px_rgba(234,179,8,0.3)]',
  storage_tank: 'shadow-[0_0_8px_rgba(4,120,87,0.2)]',
  refinery:     'shadow-[0_0_10px_rgba(220,38,38,0.25)]',
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

  const [justBuilt, setJustBuilt] = useState(false)
  const plots = useGameStore((s) => s.plots)

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
        const regionName = RING_NAMES[cell.ring ?? 0] ?? 'Unknown'
        addToast({
          message: `🔓 ${regionName} plot claimed! -$${formatCommas(cell.unlockCost)}`,
          type: 'success',
          duration: 4000,
        })
      }
      return
    }

    selectCell(cell.x, cell.y)
  }

  // Detect if this is the first empty buildable tile (beacon hint for new players)
  const isFirstEmptyPlot = cell.status === 'unlocked' && !cell.building && !cell.constructionType && (() => {
    const firstEmpty = plots.find((p) => p.status === 'unlocked' && !p.building && !p.constructionType)
    return firstEmpty?.x === cell.x && firstEmpty?.y === cell.y
  })()

  // Construction state
  const isUnderConstruction = !!cell.constructionEndsAt
  const constructionDef = cell.constructionType ? BUILDING_DEFINITIONS[cell.constructionType] : null

  const def = cell.building ? BUILDING_DEFINITIONS[cell.building] : null
  const isProducer = cell.building && ['oil_well', 'pump_jack', 'derrick'].includes(cell.building)
  const isRefinery = cell.building === 'refinery'
  const isTerminal = cell.building === 'oil_terminal'
  const metric = def ? getBuildingMetric(cell.building!, cell.level) : ''

  const ring = cell.ring ?? 0
  const trait = cell.trait ?? 'normal'
  const isRareTile = trait === 'rich' || trait === 'gusher'

  // ── LOCKED — terrain visible through fog, deeper rings darker ─────────────
  if (cell.status === 'locked') {
    const fogOpacity = ring >= 5 ? 'opacity-[0.12]' : ring >= 4 ? 'opacity-[0.20]' : ring >= 3 ? 'opacity-[0.30]' : 'opacity-[0.35]'
    const groundColor = RING_GROUND[ring] ?? RING_GROUND[5]
    const borderColor = RING_LOCKED_BORDER[ring] ?? RING_LOCKED_BORDER[5]
    return (
      <div className={cn(
        'relative aspect-square rounded-sm flex items-center justify-center select-none',
        groundColor, borderColor, 'border',
        fogOpacity
      )}>
        {/* Terrain hint — shows what zone this is even when locked */}
        {isRareTile && (
          <div className="w-1.5 h-1.5 rounded-full bg-crude-500/40" />
        )}
        {!isRareTile && ring <= 3 && (
          <div className="w-1 h-1 rounded-full bg-oil-700/30" />
        )}
      </div>
    )
  }

  // ── AVAILABLE (purchasable) ───────────────────────────────────────────────
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square rounded-sm border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-0.5',
          'hover:scale-[1.05] active:scale-[0.97]',
          canAffordUnlock
            ? trait === 'gusher'
              ? 'border-crude-400/60 bg-crude-950/25 hover:bg-crude-900/35 hover:border-crude-300/80'
              : trait === 'rich'
                ? 'border-amber-500/50 bg-amber-950/15 hover:bg-amber-900/25 hover:border-amber-400/70'
                : 'border-crude-500/40 bg-crude-950/15 hover:bg-crude-900/25 hover:border-crude-400/60'
            : 'border-oil-700/20 bg-oil-950/10 opacity-30'
        )}
      >
        {/* Trait indicator for rare tiles */}
        {isRareTile && (
          <span className={cn(
            'absolute top-0 left-0 text-[6px] px-0.5 rounded-br font-black leading-tight',
            trait === 'gusher' ? 'bg-crude-500/30 text-crude-300' : 'bg-amber-500/20 text-amber-400'
          )}>
            {trait === 'gusher' ? '★' : '◆'}
          </span>
        )}
        <span className="text-[9px] leading-none select-none">🔓</span>
        <span className={cn(
          'text-[7px] font-bold leading-none tabular-nums',
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
        'relative aspect-square rounded-sm border transition-all duration-150 overflow-hidden',
        'flex flex-col items-center justify-center',
        'hover:scale-[1.04] active:scale-[0.97]',
        def
          ? [BUILDING_BG[cell.building!], BUILDING_BORDER[cell.building!], BUILDING_GLOW[cell.building!], 'hover:brightness-110']
          : isFirstEmptyPlot
            ? 'bg-amber-950/25 border-amber-600/50 border-dashed hover:bg-amber-900/30 plot-beacon'
            : cn('border-dashed hover:border-crude-500/30 hover:bg-oil-800/20', RING_GROUND[ring] ?? 'bg-oil-900/20', 'border-oil-800/25'),
        isSelected && 'ring-2 ring-crude-400 ring-offset-1 ring-offset-oil-950 scale-[1.04]',
        isTerminal && 'shadow-[0_0_16px_rgba(234,179,8,0.3)]'
      )}
    >
      {def ? (
        <>
          {/* Level badge — top-right */}
          <div className="absolute top-0 right-0 z-10 text-[6px] font-black text-oil-300 bg-oil-950/80 px-0.5 rounded-bl leading-tight">
            {cell.level}
          </div>

          {/* Trait badge — top-left (only for special tiles) */}
          {isRareTile && (
            <div className={cn(
              'absolute top-0 left-0 z-10 text-[5px] px-0.5 rounded-br leading-tight font-black',
              trait === 'gusher' ? 'bg-crude-500/30 text-crude-300' : 'bg-amber-500/20 text-amber-400'
            )}>
              {trait === 'gusher' ? '★' : '◆'}
            </div>
          )}

          {/* Visual building component */}
          <BuildingRenderer
            type={cell.building!}
            level={cell.level}
            isUpgrading={isUnderConstruction}
          />

          {/* Production metric */}
          {metric && (
            <span className={cn(
              'absolute bottom-[2px] text-[7px] font-bold leading-none tabular-nums',
              BUILDING_METRIC_COLOR[cell.building!]
            )}>
              {metric}
            </span>
          )}

          {/* Active production bar — thin bottom strip */}
          {(isProducer || isRefinery) && !isUnderConstruction && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-80">
              <div className={cn('h-full w-full animate-pulse', BUILDING_BAR[cell.building!])} />
            </div>
          )}
        </>
      ) : (
        /* Empty or under construction */
        isUnderConstruction && constructionDef ? (
          <div className="w-full h-full flex items-center justify-center">
            <ConstructionPreview type={cell.constructionType!} />
          </div>
        ) : isFirstEmptyPlot ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-lg text-amber-500/80 leading-none select-none">+</span>
            <span className="text-[7px] font-bold text-amber-500/60 leading-none">TAP</span>
          </div>
        ) : (
          <span className="text-base text-oil-700/40 leading-none select-none">+</span>
        )
      )}
    </button>
  )
}
