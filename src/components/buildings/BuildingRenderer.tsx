'use client'

/**
 * BuildingRenderer — CSS-drawn industrial buildings with living animations.
 *
 * Each building has:
 * - Level-scaled sizing (L1=1.0x → L10=1.2x)
 * - Production-reactive animation speed (higher level = faster pumping)
 * - State-aware visuals (producing, upgrading, idle)
 * - Environmental details (smoke, heat, lights, oil puddles, gauges)
 */

import type { BuildingType } from '@/engine/types'
import { cn } from '@/lib/utils'

interface BuildingProps {
  type: BuildingType
  level: number
  isUpgrading: boolean
}

function levelScale(level: number): string {
  const s = 1 + (level - 1) * 0.022
  return `scale(${s.toFixed(3)})`
}

function levelGlow(level: number, r: number, g: number, b: number, baseAlpha: number): string {
  const a = Math.min(baseAlpha + level * 0.03, 0.7)
  return `0 0 ${4 + level * 1.5}px rgba(${r},${g},${b},${a})`
}

// Higher level = faster pump (2s at L1, 0.8s at L10)
function pumpDur(level: number): string {
  return `${Math.max(0.8, 2 - level * 0.12).toFixed(2)}s`
}

// ── Oil Well ──────────────────────────────────────────────────────────────────
function OilWell({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[60%] h-[75%] flex flex-col items-center justify-end', isUpgrading && 'opacity-40')}>
        <div className="absolute -top-[2px] w-[85%] h-[3px] rounded-full origin-left bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700"
          style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined} />
        <div className="w-[3px] h-full bg-gradient-to-b from-amber-600 to-amber-900 rounded-sm" />
        <div className="absolute bottom-0 w-full h-[4px] bg-gradient-to-r from-stone-700 via-stone-500 to-stone-700 rounded-sm" />
        {!isUpgrading && level >= 2 && (
          <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-amber-800/50 animate-pulse" />
        )}
        {!isUpgrading && level >= 5 && (
          <div className="absolute -bottom-[2px] w-[70%] h-[2px] rounded-full bg-amber-900/20" />
        )}
      </div>
      {!isUpgrading && (
        <>
          <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: levelGlow(level, 217, 119, 6, 0.12) }} />
          <div className="absolute top-[8%] right-[12%] w-[2px] h-[2px] rounded-full bg-green-500/60 animate-pulse" />
        </>
      )}
    </div>
  )
}

// ── Pump Jack ─────────────────────────────────────────────────────────────────
function PumpJack({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[70%] h-[70%] flex flex-col items-center', isUpgrading && 'opacity-40')}>
        <div className="w-[95%] h-[3px] rounded-full origin-center bg-gradient-to-r from-sky-600 via-sky-400 to-sky-600"
          style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined} />
        <div className="relative w-full flex-1 flex items-end justify-center">
          <div className="absolute left-[18%] bottom-0 w-[2px] h-[92%] bg-sky-700 rotate-[8deg] origin-bottom" />
          <div className="absolute right-[18%] bottom-0 w-[2px] h-[92%] bg-sky-700 -rotate-[8deg] origin-bottom" />
          <div className="absolute top-[28%] w-[55%] h-[2px] bg-sky-600/50" />
          <div className="absolute left-[10%] top-[40%] w-[4px] h-[4px] rounded-sm bg-sky-800/60" />
        </div>
        <div className="w-full h-[4px] bg-gradient-to-r from-sky-900 via-sky-600 to-sky-900 rounded-sm" />
        {level >= 3 && <div className="absolute bottom-[4px] right-[10%] w-[5px] h-[4px] rounded-[1px] bg-sky-800/50" />}
      </div>
      {!isUpgrading && (
        <>
          <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: levelGlow(level, 3, 105, 161, 0.12) }} />
          <div className="absolute top-[8%] left-[12%] w-[2px] h-[2px] rounded-full bg-sky-400/50 animate-pulse" />
        </>
      )}
    </div>
  )
}

// ── Derrick ───────────────────────────────────────────────────────────────────
function Derrick({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[55%] h-[80%]', isUpgrading && 'opacity-40')}>
        <div className="absolute inset-x-[12%] top-0 bottom-[8%]">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-violet-300 via-violet-500 to-violet-800 rotate-[5deg] origin-bottom" />
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-violet-300 via-violet-500 to-violet-800 -rotate-[5deg] origin-bottom" />
          <div className="absolute top-[20%] w-full h-[1px] bg-violet-500/35" />
          <div className="absolute top-[40%] w-full h-[1px] bg-violet-500/45" />
          <div className="absolute top-[60%] w-full h-[1px] bg-violet-500/35" />
          <div className="absolute top-[80%] w-full h-[1px] bg-violet-500/25" />
          <div className="absolute -top-[2px] left-[20%] right-[20%] h-[3px] bg-violet-400 rounded-t-sm" />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-[4px] bg-gradient-to-r from-violet-900 via-violet-600 to-violet-900 rounded-sm" />
        {!isUpgrading && (
          <>
            <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[1px] h-[55%] bg-violet-300/30 animate-pulse" />
            {level >= 4 && <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-violet-400/20 animate-pulse" />}
          </>
        )}
      </div>
      {!isUpgrading && (
        <>
          <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: levelGlow(level, 124, 58, 237, 0.12) }} />
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[2px] h-[2px] rounded-full bg-red-500/50" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
        </>
      )}
    </div>
  )
}

// ── Storage Tank ──────────────────────────────────────────────────────────────
function StorageTank({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  const fillPct = Math.min(85, 20 + level * 7)
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[65%] h-[60%]', isUpgrading && 'opacity-40')}>
        <div className="w-full h-full rounded-[3px] bg-gradient-to-b from-emerald-600 via-emerald-800 to-emerald-950 border border-emerald-500/25 overflow-hidden">
          <div className="absolute left-[12%] top-[8%] bottom-[8%] w-[2px] bg-emerald-300/15 rounded-full" />
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
            style={{ height: `${fillPct}%`, background: 'linear-gradient(to top, rgba(16,185,129,0.35), rgba(16,185,129,0.15), transparent)' }} />
          <div className="absolute left-0 right-0 h-[1px] bg-emerald-400/20" style={{ bottom: `${fillPct}%` }} />
        </div>
        <div className="absolute -top-[2px] inset-x-[8%] h-[4px] bg-gradient-to-r from-emerald-800 via-emerald-500 to-emerald-800 rounded-t-full" />
        <div className="absolute top-[25%] -right-[4px] w-[5px] h-[2px] bg-emerald-600 rounded-r-sm" />
        <div className="absolute top-[55%] -left-[4px] w-[5px] h-[2px] bg-emerald-700 rounded-l-sm" />
        {level >= 5 && <div className="absolute top-[15%] right-[15%] w-[3px] h-[3px] rounded-full border border-emerald-400/30 bg-emerald-900/50" />}
      </div>
      {!isUpgrading && (
        <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: levelGlow(level, 16, 185, 129, 0.08) }} />
      )}
    </div>
  )
}

// ── Refinery ──────────────────────────────────────────────────────────────────
function Refinery({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[70%] h-[75%] flex items-end gap-[2px]', isUpgrading && 'opacity-40')}>
        <div className="w-[35%] h-full bg-gradient-to-b from-red-500 via-red-700 to-red-950 rounded-t-[2px] border-x border-t border-red-400/20">
          <div className="absolute top-[20%] w-full h-[1px] bg-red-400/15" />
          <div className="absolute top-[40%] w-full h-[1px] bg-red-400/10" />
          <div className="absolute top-[60%] w-full h-[1px] bg-red-400/15" />
        </div>
        <div className="w-[25%] h-[78%] bg-gradient-to-b from-red-600 via-red-800 to-red-950 rounded-t-[2px] border-x border-t border-red-500/15" />
        <div className="w-[22%] h-[55%] bg-gradient-to-b from-red-700 to-red-950 rounded-t-[1px]" />
        {!isUpgrading && (
          <>
            <div className="absolute -top-[5px] left-[12%] w-[3px] h-[4px] rounded-full bg-stone-500/35 animate-smoke" />
            <div className="absolute -top-[4px] left-[30%] w-[2px] h-[3px] rounded-full bg-stone-500/25 animate-smoke" style={{ animationDelay: '0.8s' }} />
            {level >= 3 && <div className="absolute -top-[3px] left-[48%] w-[2px] h-[2px] rounded-full bg-stone-400/20 animate-smoke" style={{ animationDelay: '1.4s' }} />}
            {level >= 6 && <div className="absolute -top-[4px] left-[22%] w-[2px] h-[3px] rounded-full bg-stone-400/15 animate-smoke" style={{ animationDelay: '0.4s' }} />}
            <div className="absolute bottom-0 left-0 right-0 h-[6px]" style={{ background: 'linear-gradient(to top, rgba(220,38,38,0.25), rgba(234,88,12,0.1), transparent)' }} />
            {level >= 4 && (
              <div className="absolute -top-[4px] right-[5%] flex flex-col items-center">
                <div className="w-[2px] h-[3px] bg-red-600/40" />
                <div className="w-[3px] h-[2px] rounded-full bg-orange-500/30 animate-pulse" />
              </div>
            )}
          </>
        )}
      </div>
      {!isUpgrading && (
        <>
          <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: levelGlow(level, 220, 38, 38, 0.15) }} />
          <div className="absolute bottom-[12%] right-[10%] w-[2px] h-[2px] rounded-full bg-red-400/50 animate-pulse" />
        </>
      )}
    </div>
  )
}

// ── Oil Terminal ──────────────────────────────────────────────────────────────
function OilTerminal({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ transform: levelScale(level) }}>
      <div className={cn('relative w-[70%] h-[60%]', isUpgrading && 'opacity-40')}>
        <div className="w-full h-full rounded-[2px] bg-gradient-to-b from-yellow-500/70 via-yellow-700 to-yellow-950 border border-yellow-400/25">
          <div className="absolute top-[18%] inset-x-[12%] flex gap-[2px]">
            <div className="flex-1 h-[3px] bg-yellow-300/25 rounded-[1px]" />
            <div className="flex-1 h-[3px] bg-yellow-300/35 rounded-[1px] animate-pulse" />
            <div className="flex-1 h-[3px] bg-yellow-300/25 rounded-[1px]" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-[25%] bg-yellow-900/40 rounded-t-[1px]" />
        </div>
        <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[2px] h-[6px] bg-yellow-500/50" />
        <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[3px] h-[1px] bg-yellow-400/40" />
        <div className="absolute bottom-0 -left-[3px] w-[4px] h-[2px] bg-yellow-800/30 rounded-l-sm" />
        <div className="absolute bottom-0 -right-[3px] w-[4px] h-[2px] bg-yellow-800/30 rounded-r-sm" />
        {!isUpgrading && (
          <>
            <div className="absolute -inset-[3px] rounded-[4px] border border-yellow-400/12 animate-pulse pointer-events-none" />
            {level >= 4 && <div className="absolute -inset-[6px] rounded-[6px] border border-yellow-400/6 animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }} />}
          </>
        )}
      </div>
      {!isUpgrading && (
        <>
          <div className="absolute inset-0 rounded-sm pointer-events-none animate-pulse-glow" style={{ boxShadow: `0 0 ${6 + level * 2}px rgba(234,179,8,${0.18 + level * 0.025})` }} />
          <div className="absolute top-[6%] right-[8%] w-[2px] h-[2px] rounded-full bg-green-400/50 animate-pulse" />
          <div className="absolute top-[6%] right-[15%] w-[2px] h-[2px] rounded-full bg-yellow-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
        </>
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
      {isUpgrading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-amber-900/15 rounded-sm" />
          <div className="absolute top-[8%] left-[8%] right-[8%] h-[1px] bg-amber-500/25" />
          <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[1px] bg-amber-500/25" />
          <div className="absolute top-[8%] left-[8%] w-[1px] h-[84%] bg-amber-500/25" />
          <div className="absolute top-[8%] right-[8%] w-[1px] h-[84%] bg-amber-500/25" />
          <span className="text-[7px] text-amber-400/50 font-bold z-10">⚒️</span>
        </div>
      )}
    </div>
  )
}

export function ConstructionPreview({ type }: { type: BuildingType }) {
  const Component = BUILDING_COMPONENTS[type]
  if (!Component) return null
  return (
    <div className="w-full h-full opacity-25 production-pulse">
      <Component level={1} isUpgrading={false} />
    </div>
  )
}
