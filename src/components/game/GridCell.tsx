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
  // LOCKED — fogged terrain, barely visible
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'locked') {
    const fogAlpha = ring >= 5 ? 0.85 : ring >= 4 ? 0.75 : ring >= 3 ? 0.65 : 0.55
    return (
      <div
        className="relative aspect-square select-none overflow-hidden"
        style={{ backgroundColor: groundColor }}
      >
        {/* Fog overlay */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(10,10,10,${fogAlpha})` }}
        />
        {/* Subtle terrain variation under fog */}
        {h1 < 15 && (
          <div className="absolute inset-[30%] rounded-full opacity-[0.06]"
            style={{ backgroundColor: '#8b5c2e' }} />
        )}
        {/* Rare tile shimmer visible through fog */}
        {isRareTile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse',
              trait === 'gusher' ? 'bg-crude-500/25' : 'bg-amber-500/15'
            )} />
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVAILABLE — frontier land, claimable
  // ══════════════════════════════════════════════════════════════════════════
  if (cell.status === 'available') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative aspect-square overflow-hidden transition-all duration-200',
          'hover:brightness-125 active:scale-[0.97]',
          !canAffordUnlock && 'opacity-40'
        )}
        style={{ backgroundColor: groundColor }}
      >
        {/* Frontier haze — lighter than locked */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10,10,10,0.35)' }} />

        {/* Stake markers in corners */}
        <div className="absolute top-[2px] left-[2px] w-[2px] h-[2px] bg-crude-600/40 rounded-full" />
        <div className="absolute top-[2px] right-[2px] w-[2px] h-[2px] bg-crude-600/40 rounded-full" />
        <div className="absolute bottom-[2px] left-[2px] w-[2px] h-[2px] bg-crude-600/40 rounded-full" />
        <div className="absolute bottom-[2px] right-[2px] w-[2px] h-[2px] bg-crude-600/40 rounded-full" />

        {/* Dashed claim boundary */}
        <div className="absolute inset-[3px] border border-dashed border-crude-600/30 rounded-[1px]" />

        {/* Trait glow for special tiles */}
        {trait === 'gusher' && canAffordUnlock && (
          <div className="absolute inset-0 bg-crude-500/8 animate-pulse" />
        )}
        {trait === 'rich' && canAffordUnlock && (
          <div className="absolute inset-0 bg-amber-500/5" />
        )}

        {/* Price label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {isRareTile && (
            <span className={cn(
              'text-[6px] font-black leading-none mb-0.5',
              trait === 'gusher' ? 'text-crude-400/70' : 'text-amber-400/60'
            )}>
              {trait === 'gusher' ? '★ GUSHER' : '◆ RICH'}
            </span>
          )}
          <span className={cn(
            'text-[8px] font-bold leading-none tabular-nums',
            canAffordUnlock ? 'text-crude-400/80' : 'text-oil-600/50'
          )}>
            ${formatCommas(cell.unlockCost)}
          </span>
        </div>
      </button>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UNLOCKED — owned territory
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative aspect-square overflow-hidden transition-all duration-150',
        'hover:brightness-110 active:scale-[0.97]',
        isSelected && 'ring-1 ring-crude-400 ring-offset-1 ring-offset-[#0d0b08] z-10 brightness-110',
      )}
      style={{ backgroundColor: groundColor }}
    >
      {/* ── Ground pad — concrete/steel platform for buildings ──────────── */}
      {def && (
        <>
          {/* Dirt road tracks leading to edges (where pipes connect) */}
          <div className="absolute top-0 left-[40%] right-[40%] h-[12%]"
            style={{ background: 'linear-gradient(180deg, rgba(70,60,42,0.25), transparent)' }} />
          <div className="absolute bottom-0 left-[40%] right-[40%] h-[12%]"
            style={{ background: 'linear-gradient(0deg, rgba(70,60,42,0.25), transparent)' }} />
          <div className="absolute left-0 top-[40%] bottom-[40%] w-[12%]"
            style={{ background: 'linear-gradient(90deg, rgba(70,60,42,0.25), transparent)' }} />
          <div className="absolute right-0 top-[40%] bottom-[40%] w-[12%]"
            style={{ background: 'linear-gradient(270deg, rgba(70,60,42,0.25), transparent)' }} />

          {/* Concrete pad */}
          <div className="absolute inset-[8%] rounded-[2px]"
            style={{
              background: 'linear-gradient(180deg, rgba(60,55,45,0.5) 0%, rgba(40,35,28,0.6) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.4)',
              borderBottom: '1px solid rgba(0,0,0,0.2)',
            }}
          />

          {/* Hazard corners on refinery/terminal pads */}
          {(isRefinery || isTerminal) && (
            <>
              <div className="absolute top-[7%] left-[7%] w-[4px] h-[1px]"
                style={{ background: 'repeating-linear-gradient(90deg, rgba(234,179,8,0.2) 0px, rgba(234,179,8,0.2) 1px, transparent 1px, transparent 2px)' }} />
              <div className="absolute top-[7%] right-[7%] w-[4px] h-[1px]"
                style={{ background: 'repeating-linear-gradient(90deg, rgba(234,179,8,0.2) 0px, rgba(234,179,8,0.2) 1px, transparent 1px, transparent 2px)' }} />
            </>
          )}
        </>
      )}

      {/* ── Empty plot pad (no building) ────────────────────────────────── */}
      {!def && !isUnderConstruction && (
        <>
          {/* Dirt pad */}
          <div className="absolute inset-[12%] rounded-[1px]"
            style={{
              background: `linear-gradient(180deg, rgba(50,42,30,0.3) 0%, rgba(35,28,18,0.4) 100%)`,
              borderTop: '1px solid rgba(80,65,40,0.1)',
            }}
          />
          {/* Ground props — rocks, dirt patches */}
          {h1 < 25 && (
            <div className="absolute rounded-full opacity-[0.15]"
              style={{
                width: '3px', height: '2px',
                backgroundColor: '#6b5834',
                top: `${30 + (h2 % 30)}%`,
                left: `${20 + (h1 % 40)}%`,
              }}
            />
          )}
          {h2 > 70 && (
            <div className="absolute rounded-full opacity-[0.1]"
              style={{
                width: '2px', height: '2px',
                backgroundColor: '#5a4a2e',
                bottom: `${20 + (h1 % 25)}%`,
                right: `${15 + (h2 % 30)}%`,
              }}
            />
          )}
        </>
      )}

      {/* ── Trait ground effect ─────────────────────────────────────────── */}
      {isRareTile && (
        <div className={cn(
          'absolute inset-0 pointer-events-none',
          trait === 'gusher' ? 'bg-crude-500/6' : 'bg-amber-600/4'
        )} />
      )}

      {/* ── Building content ────────────────────────────────────────────── */}
      {def ? (
        <>
          {/* Level badge */}
          <div className="absolute top-0 right-0 z-10 text-[6px] font-black text-oil-300 bg-oil-950/70 px-0.5 rounded-bl leading-tight">
            {cell.level}
          </div>

          {/* Trait badge */}
          {isRareTile && (
            <div className={cn(
              'absolute top-0 left-0 z-10 text-[5px] px-0.5 rounded-br leading-tight font-black',
              trait === 'gusher' ? 'bg-crude-900/60 text-crude-400' : 'bg-amber-900/50 text-amber-400'
            )}>
              {trait === 'gusher' ? '★' : '◆'}
            </div>
          )}

          {/* Building visual */}
          <div className="absolute inset-[5%]">
            <BuildingRenderer
              type={cell.building!}
              level={cell.level}
              isUpgrading={isUnderConstruction}
            />
          </div>

          {/* Production metric */}
          {metric && (
            <span className={cn(
              'absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[6px] font-bold leading-none tabular-nums z-10',
              METRIC_COLOR[cell.building!]
            )}>
              {metric}
            </span>
          )}

          {/* Active production strip */}
          {(isProducer || isRefinery) && !isUnderConstruction && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px]">
              <div className="h-full w-full animate-pulse"
                style={{
                  background: isRefinery
                    ? 'linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(217,119,6,0.4), transparent)',
                }}
              />
            </div>
          )}

          {/* Terminal aura */}
          {isTerminal && !isUnderConstruction && (
            <div className="absolute -inset-[2px] rounded-[2px] border border-yellow-500/10 animate-pulse pointer-events-none" />
          )}

          {/* Ground pipe stubs on developed plots */}
          {h1 < 40 && (
            <div className="absolute bottom-[15%] left-0 w-[3px] h-[2px] bg-stone-700/30 rounded-r-sm" />
          )}
          {h2 > 60 && (
            <div className="absolute top-[40%] right-0 w-[3px] h-[2px] bg-stone-700/25 rounded-l-sm" />
          )}
        </>
      ) : isUnderConstruction && constructionDef ? (
        /* Under construction */
        <div className="absolute inset-[5%]">
          <ConstructionPreview type={cell.constructionType!} />
          {/* Caution stripe at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden">
            <div className="h-full w-[200%] animate-oil-flow"
              style={{
                background: 'repeating-linear-gradient(90deg, #f59e0b33 0px, #f59e0b33 4px, transparent 4px, transparent 8px)',
              }}
            />
          </div>
        </div>
      ) : isFirstEmptyPlot ? (
        /* First empty plot — beacon */
        <div className="absolute inset-0 flex flex-col items-center justify-center plot-beacon">
          <span className="text-sm text-amber-500/70 leading-none select-none font-bold">+</span>
          <span className="text-[6px] font-bold text-amber-500/50 leading-none mt-0.5">BUILD</span>
        </div>
      ) : (
        /* Empty plot — just ground with subtle indicator */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 border border-dashed border-oil-700/15 rounded-[1px]" />
        </div>
      )}
    </button>
  )
}
