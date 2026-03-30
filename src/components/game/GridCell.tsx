'use client'

import { useState, useEffect } from 'react'
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

const METRIC_COLOR: Record<BuildingType, string> = {
  oil_well:     'text-amber-400/90',
  pump_jack:    'text-sky-400/90',
  derrick:      'text-violet-400/90',
  oil_terminal: 'text-yellow-400/90',
  storage_tank: 'text-emerald-400/90',
  refinery:     'text-red-400/90',
}

function getBuildingMetric(type: BuildingType, level: number): string {
  if (type === 'oil_terminal') return '↑20%'
  const storage = getBuildingStorageBonus(type, level)
  if (storage > 0) return `+${formatNumber(storage, 0)}`
  const refRate = getBuildingRefineryRate(type, level)
  if (refRate > 0) return `${formatNumber(refRate / 2, 1)}/s`
  const prod = getBuildingProduction(type, level)
  if (prod > 0) return `+${formatNumber(prod, 1)}/s`
  return ''
}

function hashCoord(x: number, y: number, seed: number): number {
  return ((x * 7919 + y * 6271 + seed * 1031) & 0x7fffffff) % 100
}

export function GridCell({ cell }: GridCellProps) {
  const unlockTile = useGameStore((s) => s.unlockTile)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const selectCell = useUiStore((s) => s.selectCell)
  const selectedCell = useUiStore((s) => s.selectedCell)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)
  const plots = useGameStore((s) => s.plots)
  const sellFlashAt = useUiStore((s) => s.sellFlashAt)

  const [sellFlash, setSellFlash] = useState(false)
  useEffect(() => {
    if (!sellFlashAt || !cell.building) return
    if (cell.building !== 'oil_terminal' && cell.building !== 'refinery') return
    setSellFlash(true)
    const t = setTimeout(() => setSellFlash(false), 600)
    return () => clearTimeout(t)
  }, [sellFlashAt, cell.building])

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
        addToast({ message: `🔓 ${regionName} plot claimed! -$${formatCommas(cell.unlockCost)}`, type: 'success', duration: 4000 })
      }
      return
    }
    selectCell(cell.x, cell.y)
  }

  const isFirstEmptyPlot = cell.status === 'unlocked' && !cell.building && !cell.constructionType && (() => {
    const firstEmpty = plots.find((p) => p.status === 'unlocked' && !p.building && !p.constructionType)
    return firstEmpty?.x === cell.x && firstEmpty?.y === cell.y
  })()

  const isUnderConstruction = !!cell.constructionEndsAt
  const constructionDef = cell.constructionType ? BUILDING_DEFINITIONS[cell.constructionType] : null
  const def = cell.building ? BUILDING_DEFINITIONS[cell.building] : null
  const isTerminal = cell.building === 'oil_terminal'
  const metric = def ? getBuildingMetric(cell.building!, cell.level) : ''
  const trait = cell.trait ?? 'normal'
  const isRareTile = trait === 'rich' || trait === 'gusher'

  // Distance from center for smooth fog
  const dist = Math.sqrt((cell.x - 5) ** 2 + (cell.y - 5) ** 2) / 7.07

  // ════════════════════════════════════════════════════════════════════════════
  // LOCKED — TRANSPARENT cell with dark fog overlay. No background color.
  // ════════════════════════════════════════════════════════════════════════════
  if (cell.status === 'locked') {
    const fogAlpha = Math.min(0.95, 0.4 + dist * 0.6)
    return (
      <div className="relative aspect-square select-none">
        {/* Dark fog — sits on the transparent cell, terrain shows through faintly */}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${fogAlpha.toFixed(2)})` }} />
        {isRareTile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse',
              trait === 'gusher' ? 'bg-crude-500/20' : 'bg-amber-500/12')} />
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AVAILABLE — TRANSPARENT cell, just price label floating on terrain
  // ════════════════════════════════════════════════════════════════════════════
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square transition-all duration-200',
          'hover:brightness-150 active:scale-[0.97]',
          !canAffordUnlock && 'opacity-30'
        )}
      >
        {/* Light fog — transparent base, terrain shows through */}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${(0.15 + dist * 0.3).toFixed(2)})` }} />

        {/* Circular claim marker — NOT a square */}
        <div className="absolute inset-[15%] rounded-full border border-dashed pointer-events-none"
          style={{ borderColor: `rgba(212,160,23,${canAffordUnlock ? 0.2 : 0.08})` }} />

        {/* Trait glow */}
        {trait === 'gusher' && canAffordUnlock && (
          <div className="absolute inset-[20%] rounded-full bg-crude-500/10 animate-pulse" />
        )}

        {/* Price */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {isRareTile && (
            <span className={cn('text-[6px] font-black leading-none mb-0.5',
              trait === 'gusher' ? 'text-crude-400/60' : 'text-amber-400/50')}>
              {trait === 'gusher' ? '★' : '◆'}
            </span>
          )}
          <span className={cn('text-[7px] font-bold leading-none tabular-nums',
            canAffordUnlock ? 'text-crude-400/60' : 'text-oil-600/30')}>
            ${formatCommas(cell.unlockCost)}
          </span>
        </div>
      </button>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UNLOCKED — TRANSPARENT cell. Buildings sit on circular pads.
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <button
      onClick={handleClick}
      className="relative aspect-square transition-all duration-150 hover:brightness-120 active:scale-[0.98]"
    >
      {/* Selection = circular ground glow */}
      {isSelected && (
        <div className="absolute inset-[5%] rounded-full z-[1] pointer-events-none"
          style={{ boxShadow: '0 0 12px rgba(212,160,23,0.35), inset 0 0 8px rgba(212,160,23,0.15)' }} />
      )}

      {/* ── Building on circular pad ──────────────────────────────────── */}
      {def ? (
        <>
          {/* Circular foundation pad — the building sits ON this */}
          <div className="absolute inset-[8%] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(40,35,25,0.7) 0%, rgba(30,25,18,0.4) 60%, transparent 100%)',
            }}
          />

          {/* Ground shadow */}
          <div className="absolute inset-[20%] bottom-[8%] top-[30%] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)' }} />

          {/* Building */}
          <div className="absolute inset-[2%]">
            <BuildingRenderer type={cell.building!} level={cell.level} isUpgrading={isUnderConstruction} />
          </div>

          {/* Level */}
          <div className="absolute top-[1px] right-[3px] z-10 text-[5px] font-black text-oil-400/60">
            L{cell.level}
          </div>

          {/* Trait */}
          {isRareTile && (
            <div className={cn('absolute top-[1px] left-[3px] z-10 text-[5px] font-black',
              trait === 'gusher' ? 'text-crude-400/50' : 'text-amber-400/40')}>
              {trait === 'gusher' ? '★' : '◆'}
            </div>
          )}

          {/* Metric */}
          {metric && (
            <span className={cn('absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[6px] font-bold leading-none tabular-nums z-10',
              METRIC_COLOR[cell.building!])}>
              {metric}
            </span>
          )}

          {/* Terminal glow */}
          {isTerminal && !isUnderConstruction && (
            <div className="absolute inset-[5%] rounded-full pointer-events-none animate-pulse"
              style={{ boxShadow: '0 0 10px rgba(234,179,8,0.1)' }} />
          )}

          {/* Sell flash */}
          {sellFlash && (
            <div className="absolute inset-[5%] rounded-full pointer-events-none sell-flash" />
          )}
        </>
      ) : isUnderConstruction && constructionDef ? (
        /* Construction site — circular pad with ghost building */
        <>
          <div className="absolute inset-[12%] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(40,35,20,0.5) 0%, transparent 80%)' }} />
          <div className="absolute inset-[2%]">
            <ConstructionPreview type={cell.constructionType!} />
          </div>
          {/* Caution ring instead of caution stripe */}
          <div className="absolute inset-[10%] rounded-full border border-dashed border-amber-500/20 pointer-events-none animate-pulse" />
        </>
      ) : isFirstEmptyPlot ? (
        /* First build site — circular pad with + marker */
        <>
          <div className="absolute inset-[15%] rounded-full pointer-events-none plot-beacon"
            style={{ background: 'radial-gradient(circle, rgba(50,40,20,0.4) 0%, transparent 80%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-amber-500/60 leading-none select-none font-bold">+</span>
            <span className="text-[5px] font-bold text-amber-500/35 leading-none mt-0.5">BUILD</span>
          </div>
        </>
      ) : (
        /* Empty owned — faint circular pad */
        <>
          <div className="absolute inset-[20%] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(35,30,20,0.25) 0%, transparent 80%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[7px] text-oil-700/15 select-none">+</span>
          </div>
        </>
      )}
    </button>
  )
}
