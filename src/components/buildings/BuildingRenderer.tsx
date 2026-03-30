'use client'

/**
 * BuildingRenderer — 2.5D isometric-style industrial buildings.
 *
 * Depth illusion created via:
 * - Main body (front face) with vertical gradient
 * - Top cap (lighter, slightly offset up)
 * - Right side face (darker, gives thickness)
 * - Angled drop shadow (offset right+down)
 * - Level-reactive animations and scale
 *
 * No 3D engine. Pure CSS transforms, gradients, and layering.
 */

import type { BuildingType } from '@/engine/types'
import { cn } from '@/lib/utils'

interface BuildingProps {
  type: BuildingType
  level: number
  isUpgrading: boolean
}

function pumpDur(level: number): string {
  return `${Math.max(0.8, 2 - level * 0.12).toFixed(2)}s`
}

// ── Oil Well — small rig with rocking beam ────────────────────────────────────
function OilWell({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Ground shadow */}
      <div className="absolute bottom-[5%] left-[15%] w-[70%] h-[20%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)' }} />

      {/* Base platform — 3D slab */}
      <div className="absolute bottom-[12%] left-[15%] w-[70%] h-[10%]">
        <div className="w-full h-full bg-gradient-to-b from-stone-500 to-stone-700 rounded-[2px]" />
        {/* Side face */}
        <div className="absolute top-full left-0 w-full h-[3px] bg-stone-800 rounded-b-[1px]" />
      </div>

      {/* Vertical mast */}
      <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-[5%] h-[45%] bg-gradient-to-r from-amber-700 to-amber-900">
        <div className="absolute top-0 right-0 w-[2px] h-full bg-amber-950/40" />
      </div>

      {/* Rocking pump beam */}
      <div className="absolute top-[28%] left-[15%] w-[70%] h-[6%] origin-center"
        style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined}>
        <div className="w-full h-full bg-gradient-to-b from-amber-500 to-amber-700 rounded-[2px]" />
        {/* Beam thickness */}
        <div className="absolute top-full left-0 w-full h-[2px] bg-amber-900 rounded-b-[1px]" />
        {/* Horsehead weight */}
        <div className="absolute -right-[2px] top-0 w-[12%] h-[150%] bg-gradient-to-b from-amber-600 to-amber-800 rounded-[1px]" />
      </div>

      {/* Status light */}
      {!isUpgrading && (
        <div className="absolute top-[22%] right-[22%] w-[3px] h-[3px] rounded-full bg-green-400/70 animate-pulse" />
      )}
    </div>
  )
}

// ── Pump Jack — larger A-frame with depth ─────────────────────────────────────
function PumpJack({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Ground shadow */}
      <div className="absolute bottom-[3%] left-[10%] w-[80%] h-[18%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)' }} />

      {/* Base slab */}
      <div className="absolute bottom-[10%] left-[12%] w-[76%] h-[10%]">
        <div className="w-full h-full bg-gradient-to-b from-sky-600/80 to-sky-800 rounded-[2px]" />
        <div className="absolute top-full left-0 w-full h-[3px] bg-sky-950 rounded-b-[1px]" />
      </div>

      {/* A-frame legs */}
      <div className="absolute bottom-[20%] left-[22%] w-[4%] h-[50%] bg-gradient-to-b from-sky-500 to-sky-800 origin-bottom rotate-[6deg]">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-sky-950/30" />
      </div>
      <div className="absolute bottom-[20%] right-[22%] w-[4%] h-[50%] bg-gradient-to-b from-sky-500 to-sky-800 origin-bottom -rotate-[6deg]">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-sky-950/30" />
      </div>

      {/* Cross brace */}
      <div className="absolute bottom-[42%] left-[28%] w-[44%] h-[3%] bg-sky-600/50" />

      {/* Walking beam */}
      <div className="absolute top-[20%] left-[10%] w-[80%] h-[6%] origin-center"
        style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined}>
        <div className="w-full h-full bg-gradient-to-b from-sky-400 to-sky-600 rounded-[2px]" />
        <div className="absolute top-full left-0 w-full h-[2px] bg-sky-800" />
        {/* Counterweight */}
        <div className="absolute -left-[1px] top-[-2px] w-[15%] h-[180%] bg-gradient-to-b from-sky-700 to-sky-900 rounded-[1px]" />
      </div>

      {/* Motor housing */}
      <div className="absolute bottom-[20%] right-[18%] w-[14%] h-[12%] bg-gradient-to-b from-sky-700 to-sky-900 rounded-[1px]">
        <div className="absolute top-0 right-0 w-[2px] h-full bg-sky-950/40" />
      </div>

      {!isUpgrading && (
        <div className="absolute top-[15%] left-[18%] w-[3px] h-[3px] rounded-full bg-sky-300/60 animate-pulse" />
      )}
    </div>
  )
}

// ── Derrick — tall tower with cross-bracing ───────────────────────────────────
function Derrick({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Shadow */}
      <div className="absolute bottom-[2%] left-[12%] w-[76%] h-[15%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)' }} />

      {/* Base */}
      <div className="absolute bottom-[8%] left-[18%] w-[64%] h-[8%]">
        <div className="w-full h-full bg-gradient-to-b from-violet-600/80 to-violet-800 rounded-[2px]" />
        <div className="absolute top-full left-0 w-full h-[3px] bg-violet-950 rounded-b-[1px]" />
      </div>

      {/* Tower body — front face */}
      <div className="absolute bottom-[16%] left-[28%] w-[44%] h-[70%]">
        {/* Left strut */}
        <div className="absolute left-0 top-0 bottom-0 w-[5%] bg-gradient-to-b from-violet-300 via-violet-500 to-violet-700 origin-bottom rotate-[3deg]" />
        {/* Right strut */}
        <div className="absolute right-0 top-0 bottom-0 w-[5%] bg-gradient-to-b from-violet-300 via-violet-500 to-violet-700 origin-bottom -rotate-[3deg]" />
        {/* Cross braces */}
        <div className="absolute top-[15%] left-[5%] right-[5%] h-[2px] bg-violet-400/40" />
        <div className="absolute top-[35%] left-[5%] right-[5%] h-[2px] bg-violet-400/50" />
        <div className="absolute top-[55%] left-[5%] right-[5%] h-[2px] bg-violet-400/40" />
        <div className="absolute top-[75%] left-[5%] right-[5%] h-[2px] bg-violet-400/30" />
      </div>

      {/* Crown block */}
      <div className="absolute top-[10%] left-[32%] w-[36%] h-[5%] bg-violet-400 rounded-t-[2px]">
        <div className="absolute top-full left-0 w-full h-[2px] bg-violet-600" />
      </div>

      {/* Warning light */}
      {!isUpgrading && (
        <div className="absolute top-[7%] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-red-500/60"
          style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
      )}

      {/* Drill pipe */}
      {!isUpgrading && (
        <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 w-[2px] h-[40%] bg-violet-300/25 animate-pulse" />
      )}
    </div>
  )
}

// ── Storage Tank — 3D cylinder with dome ──────────────────────────────────────
function StorageTank({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  const fillPct = Math.min(85, 20 + level * 7)
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Shadow */}
      <div className="absolute bottom-[3%] left-[10%] w-[80%] h-[18%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)' }} />

      {/* Tank body — front face */}
      <div className="absolute bottom-[10%] left-[15%] w-[60%] h-[60%] rounded-[3px] overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #047857 0%, #065f46 40%, #064e3b 100%)' }}>
        {/* Fill level */}
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
          style={{ height: `${fillPct}%`, background: 'linear-gradient(to top, rgba(52,211,153,0.4), rgba(16,185,129,0.15), transparent)' }} />
        {/* Cylindrical highlight */}
        <div className="absolute left-[8%] top-[5%] bottom-[5%] w-[4px] bg-emerald-400/10 rounded-full" />
      </div>

      {/* Tank side face (right edge — gives depth) */}
      <div className="absolute bottom-[10%] left-[75%] w-[10%] h-[60%] rounded-r-[2px]"
        style={{ background: 'linear-gradient(90deg, #064e3b, #022c22)' }} />

      {/* Dome top */}
      <div className="absolute bottom-[70%] left-[12%] w-[66%] h-[8%] rounded-t-full"
        style={{ background: 'linear-gradient(180deg, #34d399aa, #059669)' }} />
      {/* Dome side */}
      <div className="absolute bottom-[70%] left-[75%] w-[6%] h-[8%] rounded-tr-[2px]"
        style={{ background: '#047857' }} />

      {/* Pipe stubs */}
      <div className="absolute top-[40%] -right-[2px] w-[8px] h-[3px] bg-emerald-700 rounded-r-[2px]" />
    </div>
  )
}

// ── Refinery — multi-column with smoke ────────────────────────────────────────
function Refinery({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Shadow */}
      <div className="absolute bottom-[2%] left-[8%] w-[84%] h-[16%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)' }} />

      {/* Base platform */}
      <div className="absolute bottom-[8%] left-[8%] w-[84%] h-[8%]">
        <div className="w-full h-full bg-gradient-to-b from-stone-500 to-stone-700 rounded-[2px]" />
        <div className="absolute top-full left-0 w-full h-[3px] bg-stone-900" />
      </div>

      {/* Main column — front */}
      <div className="absolute bottom-[16%] left-[10%] w-[28%] h-[68%]">
        <div className="w-full h-full rounded-t-[3px]"
          style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)' }} />
        {/* Side face */}
        <div className="absolute top-0 left-full w-[4px] h-full rounded-tr-[2px]"
          style={{ background: 'linear-gradient(90deg, #7f1d1d, #450a0a)' }} />
        {/* Column rings */}
        <div className="absolute top-[20%] w-full h-[2px] bg-red-400/20" />
        <div className="absolute top-[45%] w-full h-[2px] bg-red-400/15" />
        <div className="absolute top-[70%] w-full h-[2px] bg-red-400/20" />
      </div>

      {/* Secondary column */}
      <div className="absolute bottom-[16%] left-[42%] w-[22%] h-[52%]">
        <div className="w-full h-full rounded-t-[2px]"
          style={{ background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)' }} />
        <div className="absolute top-0 left-full w-[3px] h-full"
          style={{ background: 'linear-gradient(90deg, #991b1b, #450a0a)' }} />
      </div>

      {/* Tertiary pipe */}
      <div className="absolute bottom-[16%] left-[68%] w-[16%] h-[38%]">
        <div className="w-full h-full rounded-t-[2px] bg-gradient-to-b from-red-700 to-red-950" />
      </div>

      {/* Connecting pipe between columns */}
      <div className="absolute bottom-[38%] left-[38%] w-[30%] h-[4%] bg-red-800/60 rounded-[1px]" />

      {/* Smoke */}
      {!isUpgrading && (
        <>
          <div className="absolute -top-[2%] left-[18%] w-[5px] h-[5px] rounded-full bg-stone-500/30 animate-smoke" />
          <div className="absolute -top-[1%] left-[35%] w-[4px] h-[4px] rounded-full bg-stone-500/20 animate-smoke" style={{ animationDelay: '0.7s' }} />
          {level >= 3 && (
            <div className="absolute -top-[1%] left-[50%] w-[3px] h-[3px] rounded-full bg-stone-400/15 animate-smoke" style={{ animationDelay: '1.3s' }} />
          )}
        </>
      )}

      {/* Heat glow */}
      {!isUpgrading && (
        <div className="absolute bottom-[8%] left-[8%] w-[84%] h-[12%]"
          style={{ background: 'linear-gradient(to top, rgba(220,38,38,0.2), transparent)' }} />
      )}

      {/* Flare at high level */}
      {!isUpgrading && level >= 4 && (
        <div className="absolute top-[8%] right-[12%] w-[4px] h-[3px] rounded-full bg-orange-500/40 animate-pulse" />
      )}
    </div>
  )
}

// ── Oil Terminal — 3D building with roof ──────────────────────────────────────
function OilTerminal({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-40')}>
      {/* Shadow */}
      <div className="absolute bottom-[3%] left-[8%] w-[84%] h-[18%] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)' }} />

      {/* Main building front face */}
      <div className="absolute bottom-[10%] left-[10%] w-[65%] h-[50%] rounded-[2px]"
        style={{ background: 'linear-gradient(90deg, #ca8a04 0%, #a16207 40%, #854d0e 100%)' }}>
        {/* Windows */}
        <div className="absolute top-[15%] left-[10%] w-[80%] flex gap-[3px]">
          <div className="flex-1 h-[4px] bg-yellow-300/30 rounded-[1px]" />
          <div className="flex-1 h-[4px] bg-yellow-300/40 rounded-[1px] animate-pulse" />
          <div className="flex-1 h-[4px] bg-yellow-300/30 rounded-[1px]" />
        </div>
        {/* Door */}
        <div className="absolute bottom-0 left-[35%] w-[30%] h-[35%] bg-yellow-900/50 rounded-t-[2px]" />
      </div>

      {/* Side face */}
      <div className="absolute bottom-[10%] left-[75%] w-[15%] h-[50%] rounded-r-[2px]"
        style={{ background: 'linear-gradient(90deg, #854d0e, #422006)' }} />

      {/* Roof — top face */}
      <div className="absolute bottom-[60%] left-[8%] w-[70%] h-[6%] rounded-t-[2px]"
        style={{ background: 'linear-gradient(180deg, #fbbf24, #ca8a04)' }} />
      {/* Roof side */}
      <div className="absolute bottom-[60%] left-[75%] w-[15%] h-[6%]"
        style={{ background: '#854d0e' }} />

      {/* Antenna */}
      <div className="absolute bottom-[66%] left-[30%] w-[3px] h-[12%] bg-yellow-600/60" />
      <div className="absolute bottom-[78%] left-[28%] w-[7px] h-[2px] bg-yellow-500/40" />

      {/* Loading docks */}
      <div className="absolute bottom-[10%] -left-[3px] w-[6px] h-[4px] bg-yellow-800/40 rounded-l-[2px]" />
      <div className="absolute bottom-[10%] left-[90%] w-[6px] h-[4px] bg-yellow-900/30 rounded-r-[2px]" />

      {/* Aura glow */}
      {!isUpgrading && (
        <div className="absolute inset-[5%] rounded-full pointer-events-none animate-pulse"
          style={{ boxShadow: `0 0 ${8 + level * 2}px rgba(234,179,8,${0.12 + level * 0.02})` }} />
      )}

      {/* Status lights */}
      {!isUpgrading && (
        <>
          <div className="absolute top-[18%] right-[6%] w-[3px] h-[3px] rounded-full bg-green-400/60 animate-pulse" />
          {level >= 3 && (
            <div className="absolute top-[18%] right-[14%] w-[3px] h-[3px] rounded-full bg-yellow-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
          )}
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

  // Level scale: L1=1.0, L10=1.15
  const scale = 1 + (level - 1) * 0.017

  return (
    <div className="w-full h-full relative" style={{ transform: `scale(${scale.toFixed(3)})` }}>
      <Component level={level} isUpgrading={isUpgrading} />
      {/* Scaffold overlay when upgrading */}
      {isUpgrading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scaffold poles */}
          <div className="absolute left-[10%] top-[10%] w-[2px] h-[80%] bg-amber-600/30" />
          <div className="absolute right-[10%] top-[10%] w-[2px] h-[80%] bg-amber-600/30" />
          {/* Scaffold planks */}
          <div className="absolute top-[30%] left-[10%] right-[10%] h-[2px] bg-amber-500/25" />
          <div className="absolute top-[55%] left-[10%] right-[10%] h-[2px] bg-amber-500/20" />
          {/* Tarp overlay */}
          <div className="absolute inset-[8%] bg-amber-900/10 rounded-[2px]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-amber-400/40 font-black">⚒️</span>
        </div>
      )}
    </div>
  )
}

export function ConstructionPreview({ type }: { type: BuildingType }) {
  const Component = BUILDING_COMPONENTS[type]
  if (!Component) return null
  return (
    <div className="w-full h-full opacity-20 production-pulse">
      <Component level={1} isUpgrading={false} />
    </div>
  )
}
