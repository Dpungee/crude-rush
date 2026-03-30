'use client'

/**
 * BuildingRenderer — Polished 2.5D industrial buildings.
 *
 * Design rules:
 * - Light source: top-left. Lit faces = top + left. Shadow = right + bottom.
 * - Silhouette-first: each building recognizable by shape alone, no reliance on color/glow.
 * - Materials: steel (cool gray), concrete (warm gray), oil metal (amber/rust), pipes (dark).
 * - Scale: buildings fill 85-90% of cell to feel substantial.
 * - Minimal decoration: no status lights, no heat shimmers. Only essential detail.
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

// Consistent shadow for all buildings — offset bottom-right (light from top-left)
const SHADOW = 'radial-gradient(ellipse 80% 60%, rgba(0,0,0,0.45) 0%, transparent 70%)'

// ── Oil Well — vertical mast + rocking horsehead beam ─────────────────────────
// Silhouette: tall thin vertical with angled arm on top. Unmistakable pump shape.
function OilWell({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      {/* Ground shadow */}
      <div className="absolute bottom-[2%] left-[8%] w-[84%] h-[16%] rounded-full" style={{ background: SHADOW }} />

      {/* Concrete pad */}
      <div className="absolute bottom-[8%] left-[10%] w-[80%] h-[8%]">
        <div className="w-full h-full" style={{ background: '#6b6560' }} />
        <div className="absolute top-0 left-0 w-full h-[40%]" style={{ background: '#7d7873' }} /> {/* top-lit face */}
        <div className="absolute top-full left-0 w-full h-[4px]" style={{ background: '#3d3a37' }} /> {/* depth */}
      </div>

      {/* Mast — tall vertical steel beam */}
      <div className="absolute bottom-[16%] left-[42%] w-[8%] h-[55%]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(90deg, #a8a29e 0%, #78716c 50%, #57534e 100%)' }} />
      </div>

      {/* Samson post (shorter, right of mast) */}
      <div className="absolute bottom-[16%] left-[56%] w-[6%] h-[35%]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(90deg, #8d8680, #635e58)' }} />
      </div>

      {/* Walking beam — the iconic rocking arm */}
      <div className="absolute top-[22%] left-[12%] w-[76%] h-[7%] origin-[60%_50%]"
        style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined}>
        {/* Beam body */}
        <div className="w-full h-full rounded-[1px]" style={{ background: 'linear-gradient(180deg, #b45309 0%, #92400e 60%, #78350f 100%)' }} />
        {/* Beam depth (bottom face) */}
        <div className="absolute top-full left-0 w-full h-[3px]" style={{ background: '#5c2d0e' }} />
        {/* Horsehead (right end — hangs down) */}
        <div className="absolute right-0 top-[80%] w-[10%] h-[200%] rounded-b-[2px]" style={{ background: 'linear-gradient(90deg, #a16207, #78350f)' }} />
        {/* Counterweight (left end — heavier block) */}
        <div className="absolute left-0 top-[-50%] w-[14%] h-[250%] rounded-[2px]" style={{ background: 'linear-gradient(90deg, #78716c, #57534e)' }} />
      </div>

      {/* Polished rod (vertical cable from horsehead to ground) */}
      <div className="absolute bottom-[16%] right-[16%] w-[2px] h-[30%]" style={{ background: '#a8a29e' }} />
    </div>
  )
}

// ── Pump Jack — heavy A-frame with prominent beam ─────────────────────────────
// Silhouette: inverted V frame with thick arm across top. Heavier than oil well.
function PumpJack({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      <div className="absolute bottom-[2%] left-[6%] w-[88%] h-[16%] rounded-full" style={{ background: SHADOW }} />

      {/* Steel base plate */}
      <div className="absolute bottom-[8%] left-[6%] w-[88%] h-[7%]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #4a90a4, #2d6a7e)' }} />
        <div className="absolute top-full left-0 w-full h-[4px]" style={{ background: '#1a4050' }} />
      </div>

      {/* A-frame left leg */}
      <div className="absolute bottom-[15%] left-[18%] w-[7%] h-[55%] origin-bottom rotate-[8deg]"
        style={{ background: 'linear-gradient(90deg, #5ba3b8, #3d8da5, #2d6a7e)' }} />
      {/* A-frame right leg */}
      <div className="absolute bottom-[15%] right-[18%] w-[7%] h-[55%] origin-bottom -rotate-[8deg]"
        style={{ background: 'linear-gradient(90deg, #5ba3b8, #3d8da5, #2d6a7e)' }} />

      {/* Apex pivot (where legs meet) */}
      <div className="absolute top-[26%] left-[40%] w-[20%] h-[8%] rounded-full"
        style={{ background: 'linear-gradient(180deg, #6bb5c9, #3d8da5)' }} />

      {/* Walking beam — thick, dominant */}
      <div className="absolute top-[18%] left-[5%] w-[90%] h-[8%] origin-[50%_50%]"
        style={!isUpgrading ? { animation: `pump ${pumpDur(level)} ease-in-out infinite` } : undefined}>
        <div className="w-full h-full rounded-[2px]" style={{ background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 30%, #0284c7 100%)' }} />
        <div className="absolute top-full left-0 w-full h-[3px]" style={{ background: '#075985' }} />
        {/* Counterweight block (left) */}
        <div className="absolute left-[2%] top-[-30%] w-[12%] h-[260%] rounded-[2px]"
          style={{ background: 'linear-gradient(90deg, #64748b, #475569, #334155)' }} />
        {/* Horsehead (right) */}
        <div className="absolute right-[2%] top-[60%] w-[8%] h-[180%] rounded-b-[3px]"
          style={{ background: 'linear-gradient(90deg, #0ea5e9, #0284c7)' }} />
      </div>

      {/* Motor box (bottom right) */}
      <div className="absolute bottom-[15%] right-[12%] w-[18%] h-[14%] rounded-[2px]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(90deg, #4a90a4, #2d6a7e)' }} />
        <div className="absolute top-0 left-full w-[3px] h-full" style={{ background: '#1a4050' }} />
      </div>
    </div>
  )
}

// ── Derrick — tall lattice tower, tallest building ────────────────────────────
// Silhouette: tall narrow triangle/trapezoid. Stands above everything else.
function Derrick({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      <div className="absolute bottom-[2%] left-[15%] w-[70%] h-[14%] rounded-full" style={{ background: SHADOW }} />

      {/* Concrete foundation */}
      <div className="absolute bottom-[6%] left-[20%] w-[60%] h-[7%]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #7c6faa, #5b4f8a)' }} />
        <div className="absolute top-full left-0 w-full h-[4px]" style={{ background: '#3b2f6a' }} />
      </div>

      {/* Tower — tapered lattice (wider at bottom, narrow at top) */}
      {/* Left leg */}
      <div className="absolute bottom-[13%] left-[25%] w-[5%] h-[78%] origin-bottom rotate-[4deg]"
        style={{ background: 'linear-gradient(90deg, #c4b5fd, #a78bfa, #7c3aed)' }} />
      {/* Right leg */}
      <div className="absolute bottom-[13%] right-[25%] w-[5%] h-[78%] origin-bottom -rotate-[4deg]"
        style={{ background: 'linear-gradient(90deg, #a78bfa, #7c3aed, #6d28d9)' }} />

      {/* Cross braces — steel X pattern */}
      {[18, 35, 52, 68].map((pct) => (
        <div key={pct} className="absolute left-[28%] right-[28%] h-[2px]"
          style={{ bottom: `${13 + pct * 0.78}%`, background: 'rgba(167,139,250,0.35)' }} />
      ))}

      {/* Crown block (top cap) */}
      <div className="absolute top-[4%] left-[35%] w-[30%] h-[5%] rounded-t-[3px]"
        style={{ background: 'linear-gradient(180deg, #e9d5ff, #c4b5fd)' }} />
      <div className="absolute top-[9%] left-[35%] w-[30%] h-[3px]" style={{ background: '#7c3aed' }} />

      {/* Drill string (center vertical) */}
      {!isUpgrading && (
        <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-[2px] h-[50%] animate-pulse"
          style={{ background: 'rgba(196,181,253,0.2)' }} />
      )}

      {/* Warning light at crown */}
      {!isUpgrading && (
        <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-red-500/50"
          style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      )}
    </div>
  )
}

// ── Storage Tank — wide cylinder with domed top ───────────────────────────────
// Silhouette: short wide rectangle with rounded top. Reads as "container".
function StorageTank({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  const fillPct = Math.min(85, 20 + level * 7)
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      <div className="absolute bottom-[2%] left-[5%] w-[90%] h-[16%] rounded-full" style={{ background: SHADOW }} />

      {/* Tank body — front face (wide, squat) */}
      <div className="absolute bottom-[8%] left-[8%] w-[68%] h-[62%] rounded-[3px] overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #059669 0%, #047857 35%, #065f46 70%, #064e3b 100%)' }}>
        {/* Fill level */}
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
          style={{ height: `${fillPct}%`, background: 'linear-gradient(to top, rgba(52,211,153,0.45), rgba(16,185,129,0.2), transparent)' }} />
        {/* Cylindrical highlight (left — lit side) */}
        <div className="absolute left-[5%] top-[5%] bottom-[5%] w-[5px] rounded-full" style={{ background: 'rgba(110,231,183,0.12)' }} />
        {/* Horizontal band (structural ring) */}
        <div className="absolute top-[30%] w-full h-[3px]" style={{ background: 'rgba(6,78,59,0.6)' }} />
        <div className="absolute top-[65%] w-full h-[3px]" style={{ background: 'rgba(6,78,59,0.5)' }} />
      </div>

      {/* Side face (right — shadow side) */}
      <div className="absolute bottom-[8%] left-[76%] w-[16%] h-[62%] rounded-r-[3px]"
        style={{ background: 'linear-gradient(90deg, #064e3b, #022c22)' }} />

      {/* Dome — top face (lit) */}
      <div className="absolute bottom-[70%] left-[5%] w-[74%] h-[8%] rounded-t-full"
        style={{ background: 'linear-gradient(180deg, #6ee7b7, #34d399, #059669)' }} />
      {/* Dome side */}
      <div className="absolute bottom-[70%] left-[76%] w-[12%] h-[8%] rounded-tr-[3px]"
        style={{ background: '#047857' }} />

      {/* Pipe stub (output) */}
      <div className="absolute top-[38%] right-[0%] w-[10px] h-[4px] rounded-r-[2px]"
        style={{ background: 'linear-gradient(180deg, #6b7280, #4b5563)' }} />
    </div>
  )
}

// ── Refinery — multi-column industrial complex ────────────────────────────────
// Silhouette: multiple vertical towers of different heights + connecting pipes. Complex.
function Refinery({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      <div className="absolute bottom-[1%] left-[4%] w-[92%] h-[15%] rounded-full" style={{ background: SHADOW }} />

      {/* Concrete slab */}
      <div className="absolute bottom-[6%] left-[4%] w-[92%] h-[7%]">
        <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #78716c, #57534e)' }} />
        <div className="absolute top-full left-0 w-full h-[4px]" style={{ background: '#3d3a37' }} />
      </div>

      {/* Main distillation column (tallest) */}
      <div className="absolute bottom-[13%] left-[6%] w-[26%] h-[72%]">
        <div className="w-full h-full rounded-t-[4px]"
          style={{ background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 40%, #b91c1c 70%, #991b1b 100%)' }} />
        {/* Right shadow face */}
        <div className="absolute top-0 left-full w-[5px] h-full rounded-tr-[3px]"
          style={{ background: 'linear-gradient(90deg, #7f1d1d, #450a0a)' }} />
        {/* Column cap */}
        <div className="absolute -top-[3px] left-[-2px] w-[calc(100%+7px)] h-[6px] rounded-t-full"
          style={{ background: 'linear-gradient(180deg, #fca5a5, #ef4444)' }} />
        {/* Ring details */}
        <div className="absolute top-[25%] w-full h-[2px]" style={{ background: 'rgba(252,165,165,0.15)' }} />
        <div className="absolute top-[50%] w-full h-[2px]" style={{ background: 'rgba(252,165,165,0.12)' }} />
        <div className="absolute top-[75%] w-full h-[2px]" style={{ background: 'rgba(252,165,165,0.15)' }} />
      </div>

      {/* Secondary column (shorter) */}
      <div className="absolute bottom-[13%] left-[38%] w-[22%] h-[55%]">
        <div className="w-full h-full rounded-t-[3px]"
          style={{ background: 'linear-gradient(90deg, #f87171 0%, #ef4444 40%, #dc2626 100%)' }} />
        <div className="absolute top-0 left-full w-[4px] h-full"
          style={{ background: 'linear-gradient(90deg, #991b1b, #7f1d1d)' }} />
        <div className="absolute -top-[2px] left-[-1px] w-[calc(100%+5px)] h-[5px] rounded-t-full"
          style={{ background: 'linear-gradient(180deg, #fecaca, #f87171)' }} />
      </div>

      {/* Tertiary column (shortest) */}
      <div className="absolute bottom-[13%] left-[66%] w-[18%] h-[40%]">
        <div className="w-full h-full rounded-t-[2px]"
          style={{ background: 'linear-gradient(90deg, #dc2626, #b91c1c, #991b1b)' }} />
        <div className="absolute top-0 left-full w-[3px] h-full" style={{ background: '#7f1d1d' }} />
      </div>

      {/* Connecting pipe (horizontal between columns) */}
      <div className="absolute bottom-[35%] left-[32%] w-[34%] h-[5%] rounded-[2px]"
        style={{ background: 'linear-gradient(180deg, #a8a29e, #78716c, #57534e)' }} />

      {/* Smoke stacks */}
      {!isUpgrading && (
        <>
          <div className="absolute -top-[4%] left-[14%] w-[6px] h-[6px] rounded-full bg-stone-500/30 animate-smoke" />
          <div className="absolute -top-[2%] left-[44%] w-[5px] h-[5px] rounded-full bg-stone-500/22 animate-smoke" style={{ animationDelay: '0.8s' }} />
          {level >= 3 && (
            <div className="absolute -top-[3%] left-[30%] w-[4px] h-[4px] rounded-full bg-stone-400/18 animate-smoke" style={{ animationDelay: '1.5s' }} />
          )}
        </>
      )}

      {/* Heat glow at base */}
      {!isUpgrading && (
        <div className="absolute bottom-[6%] left-[4%] w-[92%] h-[10%]"
          style={{ background: 'linear-gradient(to top, rgba(239,68,68,0.15), transparent)' }} />
      )}
    </div>
  )
}

// ── Oil Terminal — wide building with flat roof, loading docks ─────────────────
// Silhouette: wide rectangular building. Hub/warehouse shape. Export facility.
function OilTerminal({ level, isUpgrading }: { level: number; isUpgrading: boolean }) {
  return (
    <div className={cn('relative w-full h-full', isUpgrading && 'opacity-35')}>
      <div className="absolute bottom-[2%] left-[4%] w-[92%] h-[16%] rounded-full" style={{ background: SHADOW }} />

      {/* Main building — front face (wide, imposing) */}
      <div className="absolute bottom-[8%] left-[5%] w-[72%] h-[52%] rounded-[2px]"
        style={{ background: 'linear-gradient(90deg, #eab308 0%, #ca8a04 30%, #a16207 60%, #854d0e 100%)' }}>
        {/* Window row */}
        <div className="absolute top-[18%] left-[8%] w-[84%] flex gap-[4px]">
          <div className="flex-1 h-[5px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.35)' }} />
          <div className="flex-1 h-[5px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.45)' }} />
          <div className="flex-1 h-[5px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.3)' }} />
        </div>
        {/* Lower window row */}
        <div className="absolute top-[42%] left-[8%] w-[84%] flex gap-[4px]">
          <div className="flex-1 h-[4px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.2)' }} />
          <div className="flex-1 h-[4px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.25)' }} />
          <div className="flex-1 h-[4px] rounded-[1px]" style={{ background: 'rgba(254,240,138,0.2)' }} />
        </div>
        {/* Main door */}
        <div className="absolute bottom-0 left-[32%] w-[36%] h-[38%] rounded-t-[3px]"
          style={{ background: 'linear-gradient(180deg, #78350f, #451a03)' }} />
      </div>

      {/* Side face (right — shadow) */}
      <div className="absolute bottom-[8%] left-[77%] w-[18%] h-[52%] rounded-r-[2px]"
        style={{ background: 'linear-gradient(90deg, #854d0e, #451a03)' }} />

      {/* Roof — top face */}
      <div className="absolute bottom-[60%] left-[3%] w-[76%] h-[7%] rounded-t-[2px]"
        style={{ background: 'linear-gradient(180deg, #fde047, #eab308, #ca8a04)' }} />
      {/* Roof side */}
      <div className="absolute bottom-[60%] left-[77%] w-[18%] h-[7%]"
        style={{ background: '#92400e' }} />

      {/* Antenna tower */}
      <div className="absolute bottom-[67%] left-[25%] w-[3px] h-[16%]" style={{ background: '#a16207' }} />
      <div className="absolute bottom-[83%] left-[22%] w-[9px] h-[2px]" style={{ background: '#ca8a04' }} />

      {/* Loading dock platforms */}
      <div className="absolute bottom-[8%] -left-[4px] w-[8px] h-[6px] rounded-l-[2px]"
        style={{ background: 'linear-gradient(180deg, #78716c, #57534e)' }} />
      <div className="absolute bottom-[8%] right-[-4px] w-[8px] h-[6px] rounded-r-[2px]"
        style={{ background: 'linear-gradient(180deg, #57534e, #3d3a37)' }} />

      {/* Subtle aura for hub importance */}
      {!isUpgrading && (
        <div className="absolute inset-[8%] rounded-[4px] pointer-events-none"
          style={{ boxShadow: `0 0 ${6 + level}px rgba(234,179,8,${0.08 + level * 0.015})` }} />
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
      {/* Construction overlay */}
      {isUpgrading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scaffold poles */}
          <div className="absolute left-[6%] top-[6%] w-[2px] h-[88%]" style={{ background: '#b45309aa' }} />
          <div className="absolute right-[6%] top-[6%] w-[2px] h-[88%]" style={{ background: '#b45309aa' }} />
          <div className="absolute left-[30%] top-[3%] w-[2px] h-[75%]" style={{ background: '#92400e88' }} />
          {/* Scaffold planks */}
          <div className="absolute top-[22%] left-[6%] right-[6%] h-[2px]" style={{ background: '#d97706aa' }} />
          <div className="absolute top-[45%] left-[6%] right-[6%] h-[2px]" style={{ background: '#d9770688' }} />
          <div className="absolute top-[68%] left-[6%] right-[6%] h-[2px]" style={{ background: '#d9770666' }} />
          {/* Crane arm */}
          <div className="absolute top-[2%] left-[15%] w-[55%] h-[2px] animate-crane" style={{ background: '#b45309cc' }} />
          <div className="absolute top-[2%] left-[65%] w-[1px] h-[22%] animate-crane" style={{ background: '#d9770666' }} />
          {/* Welding sparks */}
          <div className="absolute top-[25%] left-[38%] w-[3px] h-[3px] rounded-full bg-yellow-300/80 animate-spark" />
          <div className="absolute top-[48%] right-[22%] w-[2px] h-[2px] rounded-full bg-orange-400/60 animate-spark" style={{ animationDelay: '0.5s' }} />
          {/* Construction tarp */}
          <div className="absolute inset-[4%] rounded-[2px]" style={{ background: 'rgba(120,53,15,0.06)' }} />
        </div>
      )}
    </div>
  )
}

export function ConstructionPreview({ type }: { type: BuildingType }) {
  const Component = BUILDING_COMPONENTS[type]
  if (!Component) return null
  return (
    <div className="w-full h-full opacity-18 production-pulse">
      <Component level={1} isUpgrading={false} />
    </div>
  )
}
