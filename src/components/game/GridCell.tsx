'use client'

/**
 * GridCell — renders individual grid positions.
 *
 * DESIGN RULE: The map at rest shows ONLY terrain + existing buildings.
 * No placement markers, no price labels, no circles, no "+" signs, no pads.
 * Empty cells render as pure transparent space (terrain shows through).
 * Placement feedback only appears during active placement mode.
 */

import { useState, useEffect, useMemo } from 'react'
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

function cellHash(x: number, y: number, seed: number): number {
  return ((x * 7919 + y * 6271 + seed * 1031) & 0x7fffffff) / 0x7fffffff
}

function useCellJitter(x: number, y: number) {
  return useMemo(() => {
    const h1 = cellHash(x, y, 1)
    const h2 = cellHash(x, y, 2)
    const h3 = cellHash(x, y, 3)
    return {
      offsetX: (h1 - 0.5) * 50,
      offsetY: (h2 - 0.5) * 40,
      padRotation: (h1 - 0.5) * 25,
      scaleVar: 0.88 + h3 * 0.24,
    }
  }, [x, y])
}

export function GridCell({ cell }: GridCellProps) {
  const unlockTile = useGameStore((s) => s.unlockTile)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const selectCell = useUiStore((s) => s.selectCell)
  const selectedCell = useUiStore((s) => s.selectedCell)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)
  const sellFlashAt = useUiStore((s) => s.sellFlashAt)

  const [sellFlash, setSellFlash] = useState(false)
  useEffect(() => {
    if (!sellFlashAt || !cell.building) return
    if (cell.building !== 'oil_terminal' && cell.building !== 'refinery') return
    setSellFlash(true)
    const t = setTimeout(() => setSellFlash(false), 600)
    return () => clearTimeout(t)
  }, [sellFlashAt, cell.building])

  const jitter = useCellJitter(cell.x, cell.y)
  const isSelected = selectedCell?.x === cell.x && selectedCell?.y === cell.y
  const dist = Math.sqrt((cell.x - 5) ** 2 + (cell.y - 5) ** 2) / 7.07

  const handleClick = () => {
    if (cell.status === 'locked') return

    // Available = buy land (clicking empty terrain purchases the plot)
    if (cell.status === 'available') {
      const canAfford = petrodollars >= cell.unlockCost
      if (!canAfford) {
        addToast({ message: `Need $${formatCommas(cell.unlockCost)} to unlock this land`, type: 'error' })
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

    // Unlocked = select for building/upgrade
    selectCell(cell.x, cell.y)
  }

  const isUnderConstruction = !!cell.constructionEndsAt
  const def = cell.building ? BUILDING_DEFINITIONS[cell.building] : null
  const isTerminal = cell.building === 'oil_terminal'
  const metric = def ? getBuildingMetric(cell.building!, cell.level) : ''

  // ══════════════════════════════════════════════════════════════════════════
  // LOCKED — transparent with distance-based fog. NO markers, NO glow dots.
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'locked') {
    const fogAlpha = Math.min(0.95, 0.4 + dist * 0.6)
    return (
      <div className="relative aspect-square select-none">
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${fogAlpha.toFixed(2)})` }} />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVAILABLE — pure transparent land. NO price labels, NO circles, NO pads.
  // Just clickable terrain. Subtle hover brightness is the only hint.
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'available') {
    const lightFog = 0.05 + dist * 0.15
    return (
      <button onClick={handleClick}
        className="relative aspect-square transition-all duration-200 hover:brightness-[1.8] active:scale-[0.97] cursor-pointer">
        {/* Very subtle fog — lighter than locked, darker than unlocked */}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${lightFog.toFixed(2)})` }} />
      </button>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UNLOCKED — if building exists, show it. If empty, show NOTHING.
  // The map at rest = terrain + buildings only. No empty slot indicators.
  // ══════════════════════════════════════════════════════════════════════════

  // Empty unlocked cell — completely invisible. Just a clickable transparent area.
  if (!def && !isUnderConstruction) {
    return (
      <button onClick={handleClick}
        className="relative aspect-square transition-all duration-150 hover:brightness-[1.5] active:scale-[0.98] cursor-pointer">
        {/* Selection indicator — only shows when actively selected */}
        {isSelected && (
          <div className="absolute inset-[10%] rounded-full pointer-events-none"
            style={{ boxShadow: '0 0 12px rgba(212,160,23,0.25)' }} />
        )}
      </button>
    )
  }

  // Under construction (no finished building yet) — show ghost
  if (!def && isUnderConstruction) {
    return (
      <button onClick={handleClick}
        className="relative aspect-square transition-all duration-150 hover:brightness-120 active:scale-[0.98]"
        style={{ transform: `translate(${jitter.offsetX}%, ${jitter.offsetY}%) scale(${jitter.scaleVar})` }}>
        <div className="absolute inset-0">
          <ConstructionPreview type={cell.constructionType!} />
        </div>
      </button>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HAS BUILDING — the only cells that render visible content at rest.
  // Building sits on terrain, jittered to break alignment.
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <button onClick={handleClick}
      className="relative aspect-square transition-all duration-150 hover:brightness-120 active:scale-[0.98]"
      style={{ transform: `translate(${jitter.offsetX}%, ${jitter.offsetY}%) scale(${jitter.scaleVar})` }}>

      {/* Selection glow */}
      {isSelected && (
        <div className="absolute inset-[5%] rounded-full pointer-events-none z-[1]"
          style={{ boxShadow: '0 0 14px rgba(212,160,23,0.3)' }} />
      )}

      {/* Building — no pad underneath, sits directly on terrain */}
      <div className="absolute inset-0">
        <BuildingRenderer type={cell.building!} level={cell.level} isUpgrading={isUnderConstruction} />
      </div>

      {/* Level badge */}
      <div className="absolute top-[2px] right-[3px] z-10 text-[5px] font-black text-oil-400/50">
        L{cell.level}
      </div>

      {/* Production metric */}
      {metric && (
        <span className={cn('absolute bottom-[2px] left-1/2 -translate-x-1/2 z-10 text-[6px] font-bold leading-none tabular-nums', METRIC_COLOR[cell.building!])}>
          {metric}
        </span>
      )}

      {/* Terminal glow */}
      {isTerminal && !isUnderConstruction && (
        <div className="absolute inset-[8%] rounded-full pointer-events-none animate-pulse"
          style={{ boxShadow: '0 0 10px rgba(234,179,8,0.08)' }} />
      )}

      {/* Sell flash */}
      {sellFlash && <div className="absolute inset-[5%] rounded-full pointer-events-none sell-flash" />}
    </button>
  )
}
