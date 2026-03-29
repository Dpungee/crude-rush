'use client'

/**
 * BuildingRenderer — renders visual building components instead of emoji.
 *
 * Each building is a pure CSS/div composition:
 * - No images, no SVG, no heavy libraries
 * - Uses gradients, shadows, borders, and transforms
 * - Animates based on state (producing, upgrading, idle)
 * - Scales subtly with level
 *
 * Design language: dark industrial. Steel, rust, amber, heat.
 */

import type { BuildingType } from '@/engine/types'
import { cn } from '@/lib/utils'

interface BuildingProps {
  type: BuildingType
  level: number
  isUpgrading: boolean
  /** 0–1 scale factor for cell size awareness */
  size?: 'sm' | 'md'
}

// Level-based scale: L1 = 1.0, L5 = 1.1, L10 = 1.2
function levelScale(level: number): string {
  const s = 1 + (level - 1) * 0.022
  return `scale(${s.toFixed(3)})`
}

// Level-based glow intensity
function levelGlow(level: number, baseColor: string, baseAlpha: number): string {
  const alpha = Math.min(baseAlpha + level * 0.03, 0.8)
  return `0 0 ${4 + level * 1.5}px ${baseColor.replace(')', `,${alpha})`)}`
}

// ── Oil Well ──────────────────────────────────────────────────────────────────
function OilWell({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      {/* Derrick frame */}
      <div className={cn(
        'relative w-[55%] h-[70%] flex flex-col items-center justify-end',
        isUpgrading && 'opacity-50'
      )}>
        {/* Pump head — the rocking beam */}
        <div className={cn(
          'absolute -top-[2px] w-[80%] h-[3px] rounded-full origin-left',
          'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800',
          !isUpgrading && 'animate-pump'
        )} />

        {/* Vertical support */}
        <div className="w-[3px] h-full bg-gradient-to-b from-amber-700 to-amber-900 rounded-sm" />

        {/* Base platform */}
        <div className="absolute bottom-0 w-full h-[3px] bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700 rounded-sm" />

        {/* Oil drop indicator */}
        {!isUpgrading && level >= 3 && (
          <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-amber-500/60 animate-pulse" />
        )}
      </div>

      {/* Active glow */}
      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: levelGlow(level, 'rgba(217,119,6', 0.15) }}
        />
      )}
    </div>
  )
}

// ── Pump Jack ─────────────────────────────────────────────────────────────────
function PumpJack({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn(
        'relative w-[65%] h-[65%] flex flex-col items-center',
        isUpgrading && 'opacity-50'
      )}>
        {/* Horsehead beam */}
        <div className={cn(
          'w-[90%] h-[3px] rounded-full origin-center',
          'bg-gradient-to-r from-sky-700 via-sky-500 to-sky-700',
          !isUpgrading && 'animate-pump'
        )} />

        {/* Walking beam support (A-frame) */}
        <div className="relative w-full flex-1 flex items-end justify-center">
          {/* Left leg */}
          <div className="absolute left-[20%] bottom-0 w-[2px] h-[90%] bg-sky-800 rotate-[8deg] origin-bottom" />
          {/* Right leg */}
          <div className="absolute right-[20%] bottom-0 w-[2px] h-[90%] bg-sky-800 -rotate-[8deg] origin-bottom" />
          {/* Crossbar */}
          <div className="absolute top-[30%] w-[50%] h-[2px] bg-sky-700/60" />
        </div>

        {/* Base */}
        <div className="w-full h-[3px] bg-gradient-to-r from-sky-900 via-sky-700 to-sky-900 rounded-sm" />
      </div>

      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: levelGlow(level, 'rgba(3,105,161', 0.15) }}
        />
      )}
    </div>
  )
}

// ── Derrick ───────────────────────────────────────────────────────────────────
function Derrick({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn(
        'relative w-[50%] h-[75%]',
        isUpgrading && 'opacity-50'
      )}>
        {/* Tower — tapered trapezoid shape using borders */}
        <div className="absolute inset-x-[15%] top-0 bottom-[10%] flex flex-col items-center">
          {/* Left strut */}
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-violet-400 via-violet-600 to-violet-800 rotate-[4deg] origin-bottom" />
          {/* Right strut */}
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-violet-400 via-violet-600 to-violet-800 -rotate-[4deg] origin-bottom" />
          {/* Cross braces */}
          <div className="absolute top-[25%] w-full h-[1px] bg-violet-600/40" />
          <div className="absolute top-[50%] w-full h-[1px] bg-violet-600/50" />
          <div className="absolute top-[75%] w-full h-[1px] bg-violet-600/40" />
          {/* Crown block (top) */}
          <div className="absolute -top-[1px] left-[25%] right-[25%] h-[3px] bg-violet-400 rounded-t-sm" />
        </div>

        {/* Base platform */}
        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-violet-900 via-violet-700 to-violet-900 rounded-sm" />

        {/* Drill pipe (center line) */}
        {!isUpgrading && (
          <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[1px] h-[60%] bg-violet-300/40 animate-pulse" />
        )}
      </div>

      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: levelGlow(level, 'rgba(124,58,237', 0.15) }}
        />
      )}
    </div>
  )
}

// ── Storage Tank ──────────────────────────────────────────────────────────────
function StorageTank({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn(
        'relative w-[60%] h-[55%]',
        isUpgrading && 'opacity-50'
      )}>
        {/* Tank body — cylindrical look with gradient */}
        <div className="w-full h-full rounded-[3px] bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-950 border border-emerald-600/30 overflow-hidden">
          {/* Highlight strip (cylindrical reflection) */}
          <div className="absolute left-[15%] top-[10%] bottom-[10%] w-[2px] bg-emerald-400/20 rounded-full" />
          {/* Fill level indicator */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500/30 to-transparent"
            style={{ height: `${Math.min(90, 30 + level * 6)}%` }}
          />
        </div>

        {/* Tank top dome */}
        <div className="absolute -top-[2px] inset-x-[10%] h-[4px] bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 rounded-t-full" />

        {/* Pipe stub */}
        <div className="absolute top-[30%] -right-[3px] w-[4px] h-[2px] bg-emerald-700 rounded-r-sm" />
      </div>

      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: levelGlow(level, 'rgba(4,120,87', 0.1) }}
        />
      )}
    </div>
  )
}

// ── Refinery ──────────────────────────────────────────────────────────────────
function Refinery({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn(
        'relative w-[65%] h-[70%] flex items-end gap-[2px]',
        isUpgrading && 'opacity-50'
      )}>
        {/* Main column */}
        <div className="w-[35%] h-full bg-gradient-to-b from-red-600 via-red-800 to-red-950 rounded-t-[2px] border-x border-t border-red-500/20" />
        {/* Secondary column */}
        <div className="w-[25%] h-[75%] bg-gradient-to-b from-red-700 via-red-900 to-red-950 rounded-t-[2px] border-x border-t border-red-600/15" />
        {/* Pipe connector */}
        <div className="w-[20%] h-[50%] bg-gradient-to-b from-red-800 to-red-950 rounded-t-[1px]" />

        {/* Smoke particles */}
        {!isUpgrading && (
          <>
            <div className="absolute -top-[4px] left-[15%] w-[3px] h-[3px] rounded-full bg-stone-500/40 animate-smoke" />
            {level >= 4 && (
              <div className="absolute -top-[3px] left-[35%] w-[2px] h-[2px] rounded-full bg-stone-500/30 animate-smoke" style={{ animationDelay: '0.7s' }} />
            )}
          </>
        )}

        {/* Heat glow at base */}
        {!isUpgrading && (
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-t from-red-500/20 to-transparent" />
        )}
      </div>

      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: levelGlow(level, 'rgba(220,38,38', 0.15) }}
        />
      )}
    </div>
  )
}

// ── Oil Terminal ──────────────────────────────────────────────────────────────
function OilTerminal({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn(
        'relative w-[65%] h-[55%]',
        isUpgrading && 'opacity-50'
      )}>
        {/* Main building */}
        <div className="w-full h-full rounded-[2px] bg-gradient-to-b from-yellow-600/80 via-yellow-800 to-yellow-950 border border-yellow-500/30">
          {/* Window row */}
          <div className="absolute top-[20%] inset-x-[15%] flex gap-[2px]">
            <div className="flex-1 h-[3px] bg-yellow-400/30 rounded-[1px]" />
            <div className="flex-1 h-[3px] bg-yellow-400/40 rounded-[1px]" />
            <div className="flex-1 h-[3px] bg-yellow-400/30 rounded-[1px]" />
          </div>
        </div>

        {/* Roof/antenna */}
        <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[2px] h-[5px] bg-yellow-500/60" />

        {/* Aura ring */}
        {!isUpgrading && (
          <div className="absolute -inset-[3px] rounded-[4px] border border-yellow-400/15 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Terminal always glows — it's the aura building */}
      {!isUpgrading && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none animate-pulse-glow"
          style={{ boxShadow: `0 0 ${6 + level * 2}px rgba(234,179,8,${0.2 + level * 0.03})` }}
        />
      )}
    </div>
  )
}

// ── Main Renderer ─────────────────────────────────────────────────────────────

const BUILDING_COMPONENTS: Record<BuildingType, React.FC<{ level: number; isUpgrading: boolean }>> = {
  oil_well: OilWell,
  pump_jack: PumpJack,
  derrick: Derrick,
  storage_tank: StorageTank,
  refinery: Refinery,
  oil_terminal: OilTerminal,
}

export function BuildingRenderer({ type, level, isUpgrading }: BuildingProps) {
  const Component = BUILDING_COMPONENTS[type]
  if (!Component) return null

  return (
    <div className={cn('w-full h-full', isUpgrading && 'relative')}>
      <Component level={level} isUpgrading={isUpgrading} />
      {/* Upgrade overlay */}
      {isUpgrading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-amber-900/10 rounded-sm" />
          {/* Scaffolding lines */}
          <div className="absolute top-[10%] left-[10%] right-[10%] h-[1px] bg-amber-500/20" />
          <div className="absolute bottom-[10%] left-[10%] right-[10%] h-[1px] bg-amber-500/20" />
          <div className="absolute top-[10%] left-[10%] w-[1px] h-[80%] bg-amber-500/20" />
          <div className="absolute top-[10%] right-[10%] w-[1px] h-[80%] bg-amber-500/20" />
          {/* Hammer icon */}
          <span className="text-[7px] text-amber-400/60 font-bold">⚒️</span>
        </div>
      )}
    </div>
  )
}

/** Render a building under construction (ghost preview) */
export function ConstructionPreview({ type }: { type: BuildingType }) {
  const Component = BUILDING_COMPONENTS[type]
  if (!Component) return null

  return (
    <div className="w-full h-full opacity-30 production-pulse">
      <Component level={1} isUpgrading={false} />
    </div>
  )
}
