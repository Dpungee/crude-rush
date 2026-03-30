'use client'

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

// Deterministic hash per cell — breaks grid alignment
function cellHash(x: number, y: number, seed: number): number {
  return ((x * 7919 + y * 6271 + seed * 1031) & 0x7fffffff) / 0x7fffffff
}

function useCellJitter(x: number, y: number) {
  return useMemo(() => {
    const h1 = cellHash(x, y, 1)
    const h2 = cellHash(x, y, 2)
    const h3 = cellHash(x, y, 3)
    const h4 = cellHash(x, y, 4)
    const h5 = cellHash(x, y, 5)
    return {
      // LARGE offsets — ±25% of cell — enough to truly break row/column alignment
      offsetX: (h1 - 0.5) * 50,
      offsetY: (h2 - 0.5) * 40,
      padSize: 60 + h3 * 25,
      padStretchX: 0.8 + h4 * 0.4,
      padStretchY: 0.8 + h5 * 0.4,
      padRotation: (h1 - 0.5) * 25,
      padType: Math.floor(h2 * 3),
      // Scale variation — some pads slightly bigger/smaller
      scaleVar: 0.88 + h3 * 0.24,
    }
  }, [x, y])
}

const PAD_STYLES = [
  'radial-gradient(ellipse, rgba(55,42,25,0.55) 0%, rgba(40,32,18,0.3) 50%, transparent 80%)',
  'radial-gradient(ellipse, rgba(70,65,55,0.45) 0%, rgba(50,45,35,0.25) 50%, transparent 80%)',
  'radial-gradient(ellipse, rgba(45,38,28,0.5) 0%, rgba(35,30,20,0.28) 50%, transparent 80%)',
]

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

  const jitter = useCellJitter(cell.x, cell.y)
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
  const dist = Math.sqrt((cell.x - 5) ** 2 + (cell.y - 5) ** 2) / 7.07
  const padBg = PAD_STYLES[jitter.padType]

  // LOCKED
  if (cell.status === 'locked') {
    const fogAlpha = Math.min(0.95, 0.4 + dist * 0.6)
    return (
      <div className="relative aspect-square select-none">
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${fogAlpha.toFixed(2)})` }} />
        {isRareTile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse',
              trait === 'gusher' ? 'bg-crude-500/15' : 'bg-amber-500/8')} />
          </div>
        )}
      </div>
    )
  }

  // AVAILABLE — irregular dirt marking, entire cell shifted by jitter
  if (cell.status === 'available') {
    return (
      <button onClick={handleClick}
        className={cn('relative aspect-square transition-all duration-200 hover:brightness-150 active:scale-[0.97]',
          !canAffordUnlock && 'opacity-25')}
        style={{ transform: `translate(${jitter.offsetX}%, ${jitter.offsetY}%) scale(${jitter.scaleVar})` }}>
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${(0.1 + dist * 0.25).toFixed(2)})` }} />
        <div className="absolute pointer-events-none"
          style={{
            inset: `${(100 - jitter.padSize) / 2}%`,
            background: padBg,
            transform: `rotate(${jitter.padRotation}deg) scaleX(${jitter.padStretchX}) scaleY(${jitter.padStretchY})`,
            borderRadius: '40% 50% 45% 55%',
          }} />
        {trait === 'gusher' && canAffordUnlock && (
          <div className="absolute inset-[25%] rounded-full bg-crude-500/8 animate-pulse" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {isRareTile && (
            <span className={cn('text-[6px] font-black leading-none mb-0.5',
              trait === 'gusher' ? 'text-crude-400/50' : 'text-amber-400/35')}>
              {trait === 'gusher' ? '★' : '◆'}
            </span>
          )}
          <span className={cn('text-[7px] font-bold leading-none tabular-nums',
            canAffordUnlock ? 'text-crude-400/50' : 'text-oil-600/20')}>
            ${formatCommas(cell.unlockCost)}
          </span>
        </div>
      </button>
    )
  }

  // UNLOCKED — entire cell shifted by jitter so buildings don't align in rows
  return (
    <button onClick={handleClick}
      className="relative aspect-square transition-all duration-150 hover:brightness-120 active:scale-[0.98]"
      style={{ transform: `translate(${jitter.offsetX}%, ${jitter.offsetY}%) scale(${jitter.scaleVar})` }}>
      {isSelected && (
        <div className="absolute pointer-events-none z-[1]"
          style={{
            inset: '3%', borderRadius: '40% 50% 45% 55%',
            boxShadow: '0 0 14px rgba(212,160,23,0.3), inset 0 0 8px rgba(212,160,23,0.12)',
            transform: `rotate(${jitter.padRotation}deg)`,
          }} />
      )}

      {def ? (
        <>
          <div className="absolute pointer-events-none"
            style={{
              inset: `${(100 - jitter.padSize) / 2}%`, background: padBg,
              transform: `rotate(${jitter.padRotation}deg) scaleX(${jitter.padStretchX}) scaleY(${jitter.padStretchY})`,
              borderRadius: '40% 50% 45% 55%',
            }} />
          <div className="absolute inset-0"
            >
            <BuildingRenderer type={cell.building!} level={cell.level} isUpgrading={isUnderConstruction} />
          </div>
          <div className="absolute top-[2px] right-[3px] z-10 text-[5px] font-black text-oil-400/50">
            L{cell.level}
          </div>
          {isRareTile && (
            <div className={cn('absolute top-[2px] left-[3px] z-10 text-[5px] font-black',
              trait === 'gusher' ? 'text-crude-400/40' : 'text-amber-400/30')}>
              {trait === 'gusher' ? '★' : '◆'}
            </div>
          )}
          {metric && (
            <span className={cn('absolute bottom-[2px] left-1/2 -translate-x-1/2 z-10 text-[6px] font-bold leading-none tabular-nums', METRIC_COLOR[cell.building!])}>
              {metric}
            </span>
          )}
          {isTerminal && !isUnderConstruction && (
            <div className="absolute inset-[8%] rounded-full pointer-events-none animate-pulse"
              style={{ boxShadow: '0 0 10px rgba(234,179,8,0.08)' }} />
          )}
          {sellFlash && <div className="absolute inset-[5%] rounded-full pointer-events-none sell-flash" />}
        </>
      ) : isUnderConstruction && constructionDef ? (
        <>
          <div className="absolute pointer-events-none"
            style={{
              inset: `${(100 - jitter.padSize * 0.9) / 2}%`, background: padBg,
              transform: `rotate(${jitter.padRotation}deg)`, borderRadius: '40% 50% 45% 55%',
            }} />
          <div className="absolute inset-0" >
            <ConstructionPreview type={cell.constructionType!} />
          </div>
        </>
      ) : isFirstEmptyPlot ? (
        <>
          <div className="absolute pointer-events-none plot-beacon"
            style={{
              inset: `${(100 - jitter.padSize) / 2}%`,
              background: 'radial-gradient(ellipse, rgba(55,42,20,0.5) 0%, rgba(40,30,15,0.2) 60%, transparent 90%)',
              transform: `rotate(${jitter.padRotation}deg) scaleX(${jitter.padStretchX})`,
              borderRadius: '40% 50% 45% 55%',
            }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            >
            <span className="text-sm text-amber-500/50 leading-none select-none font-bold">+</span>
            <span className="text-[5px] font-bold text-amber-500/25 leading-none mt-0.5">BUILD</span>
          </div>
        </>
      ) : (
        <>
          <div className="absolute pointer-events-none"
            style={{
              inset: `${(100 - jitter.padSize * 0.7) / 2}%`,
              background: 'radial-gradient(ellipse, rgba(30,25,15,0.2) 0%, transparent 80%)',
              transform: `rotate(${jitter.padRotation * 1.5}deg) scaleX(${jitter.padStretchX})`,
              borderRadius: '45% 55% 40% 50%',
            }} />
          <div className="absolute inset-0 flex items-center justify-center"
            >
            <span className="text-[6px] text-oil-700/10 select-none">+</span>
          </div>
        </>
      )}
    </button>
  )
}
