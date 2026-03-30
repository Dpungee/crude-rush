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

// ── Ground colors per ring — desert gradient, lighter near center ────────────
const RING_GROUND: Record<number, string> = {
  0: '#2a2218', // HQ — warm brown earth
  1: '#241e15', // Starter — dusty ground
  2: '#1f1a12', // Expansion — darker earth
  3: '#191510', // Industrial — grey-brown
  4: '#14110d', // Deep — dark rocky
  5: '#100e0a', // Frontier — near black
}

// ── Building stat helpers ────────────────────────────────────────────────────
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

// Deterministic "prop" placement based on coords
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

  const [justBuilt, setJustBuilt] = useState(false)
  const plots = useGameStore((s) => s.plots)
  const sellFlashAt = useUiStore((s) => s.sellFlashAt)

  // Sell flash — terminal tiles briefly glow when a sell happens
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

  const isFirstEmptyPlot = cell.status === 'unlocked' && !cell.building && !cell.constructionType && (() => {
    const firstEmpty = plots.find((p) => p.status === 'unlocked' && !p.building && !p.constructionType)
    return firstEmpty?.x === cell.x && firstEmpty?.y === cell.y
  })()

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
  const groundColor = RING_GROUND[ring] ?? RING_GROUND[5]

  // Deterministic small prop variations
  const h1 = hashCoord(cell.x, cell.y, 1)
  const h2 = hashCoord(cell.x, cell.y, 2)

  // ══════════════════════════════════════════════════════════════════════════
  // LOCKED — dark fog, blends seamlessly into terrain
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'locked') {
    const fogAlpha = ring >= 5 ? 0.9 : ring >= 4 ? 0.8 : ring >= 3 ? 0.7 : 0.6
    return (
      <div className="relative aspect-square select-none"
        style={{ backgroundColor: groundColor }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(8,7,5,${fogAlpha})` }} />
        {h1 < 20 && (
          <div className="absolute rounded-full opacity-[0.04]"
            style={{ width: '40%', height: '30%', backgroundColor: '#6b5234',
              top: `${20 + (h2 % 40)}%`, left: `${15 + (h1 % 50)}%` }} />
        )}
        {isRareTile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse',
              trait === 'gusher' ? 'bg-crude-500/20' : 'bg-amber-500/12')} />
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVAILABLE — frontier land, claimable (no box — just lighter ground with price)
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square transition-all duration-200',
          'hover:brightness-130 active:scale-[0.97]',
          !canAffordUnlock && 'opacity-35'
        )}
        style={{ backgroundColor: groundColor }}
      >
        {/* Lighter haze than locked — this is frontier, not fog */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10,10,10,0.3)' }} />

        {/* Subtle survey stakes — just two tiny marks */}
        <div className="absolute top-[4px] left-[4px] w-[1px] h-[3px] bg-crude-600/25" />
        <div className="absolute bottom-[4px] right-[4px] w-[1px] h-[3px] bg-crude-600/25" />

        {/* Trait ground glow — seeps through the ground, no borders */}
        {trait === 'gusher' && canAffordUnlock && (
          <div className="absolute inset-[20%] rounded-full bg-crude-500/8 animate-pulse" />
        )}
        {trait === 'rich' && canAffordUnlock && (
          <div className="absolute inset-[25%] rounded-full bg-amber-600/5" />
        )}

        {/* Price label — floating on terrain */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {isRareTile && (
            <span className={cn(
              'text-[6px] font-black leading-none mb-0.5',
              trait === 'gusher' ? 'text-crude-400/60' : 'text-amber-400/50'
            )}>
              {trait === 'gusher' ? '★ GUSHER' : '◆ RICH'}
            </span>
          )}
          <span className={cn(
            'text-[8px] font-bold leading-none tabular-nums',
            canAffordUnlock ? 'text-crude-400/70' : 'text-oil-600/40'
          )}>
            ${formatCommas(cell.unlockCost)}
          </span>
        </div>
      </button>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UNLOCKED — owned territory. No boxes. Buildings sit on ground.
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative aspect-square transition-all duration-150',
        'hover:brightness-115 active:scale-[0.98]',
      )}
      style={{ backgroundColor: groundColor }}
    >
      {/* Selection glow — subtle ground highlight, no border ring */}
      {isSelected && (
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ boxShadow: 'inset 0 0 8px rgba(212,160,23,0.3), 0 0 6px rgba(212,160,23,0.15)' }} />
      )}

      {/* Trait ground seep — organic glow, not a box */}
      {isRareTile && (
        <div className={cn(
          'absolute inset-[15%] rounded-full pointer-events-none',
          trait === 'gusher' ? 'bg-crude-500/8' : 'bg-amber-600/5'
        )} />
      )}

      {/* Ground props — rocks, scuffs — on all owned tiles (even empty) */}
      {h1 < 30 && (
        <div className="absolute rounded-full opacity-[0.08]"
          style={{ width: '4px', height: '3px', backgroundColor: '#6b5834',
            top: `${25 + (h2 % 35)}%`, left: `${15 + (h1 % 45)}%` }} />
      )}
      {h2 > 65 && (
        <div className="absolute rounded-full opacity-[0.06]"
          style={{ width: '3px', height: '2px', backgroundColor: '#5a4a2e',
            bottom: `${18 + (h1 % 30)}%`, right: `${12 + (h2 % 35)}%` }} />
      )}

      {/* ── Building content ────────────────────────────────────────────── */}
      {def ? (
        <>
          {/* Building shadow on ground — grounds the building visually */}
          <div className="absolute inset-[15%] bottom-[5%] top-[25%] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)' }} />

          {/* Building visual — larger, sits on ground */}
          <div className="absolute inset-[2%]">
            <BuildingRenderer
              type={cell.building!}
              level={cell.level}
              isUpgrading={isUnderConstruction}
            />
          </div>

          {/* Level badge — small, unobtrusive */}
          <div className="absolute top-[1px] right-[2px] z-10 text-[5px] font-black text-oil-400/70 leading-tight">
            L{cell.level}
          </div>

          {/* Trait badge */}
          {isRareTile && (
            <div className={cn(
              'absolute top-[1px] left-[2px] z-10 text-[5px] font-black leading-tight',
              trait === 'gusher' ? 'text-crude-400/60' : 'text-amber-400/50'
            )}>
              {trait === 'gusher' ? '★' : '◆'}
            </div>
          )}

          {/* Production metric — floating below building */}
          {metric && (
            <span className={cn(
              'absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[6px] font-bold leading-none tabular-nums z-10',
              METRIC_COLOR[cell.building!]
            )}>
              {metric}
            </span>
          )}

          {/* Terminal aura — soft, no border */}
          {isTerminal && !isUnderConstruction && (
            <div className="absolute inset-0 pointer-events-none animate-pulse"
              style={{ boxShadow: 'inset 0 0 10px rgba(234,179,8,0.08)' }} />
          )}

          {/* Sell flash */}
          {sellFlash && (
            <div className="absolute inset-0 pointer-events-none sell-flash" />
          )}
        </>
      ) : isUnderConstruction && constructionDef ? (
        /* Under construction — ghost building + caution indicator */
        <div className="absolute inset-[2%]">
          <ConstructionPreview type={cell.constructionType!} />
          {/* Caution stripe */}
          <div className="absolute bottom-0 left-[10%] right-[10%] h-[3px] overflow-hidden rounded-full">
            <div className="h-full w-[200%] animate-oil-flow"
              style={{ background: 'repeating-linear-gradient(90deg, #f59e0b33 0px, #f59e0b33 4px, transparent 4px, transparent 8px)' }} />
          </div>
        </div>
      ) : isFirstEmptyPlot ? (
        /* First empty plot — subtle beacon, no box */
        <div className="absolute inset-0 flex flex-col items-center justify-center plot-beacon">
          <span className="text-sm text-amber-500/60 leading-none select-none font-bold">+</span>
          <span className="text-[6px] font-bold text-amber-500/40 leading-none mt-0.5">BUILD</span>
        </div>
      ) : (
        /* Empty owned plot — just a tiny + on bare ground */
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] text-oil-700/20 select-none">+</span>
        </div>
      )}
    </button>
  )
}
