'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import {
  BUILDING_DEFINITIONS,
  getBuildingCost,
  getBuildingUpgradeCost,
  getBuildingProduction,
  getBuildingStorageBonus,
  getBuildingRefineryRate,
  getAvailableBuildings,
} from '@/engine/buildings'
import type { BuildingType } from '@/engine/types'
import { formatCommas, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Static Tailwind class maps (tree-shaking requires literal strings) ─────
const STAT_COLOR: Record<BuildingType, string> = {
  oil_well:     'text-amber-400',
  pump_jack:    'text-sky-400',
  derrick:      'text-violet-400',
  oil_terminal: 'text-yellow-400',
  storage_tank: 'text-emerald-400',
  refinery:     'text-red-400',
}

const BADGE_COLOR: Record<BuildingType, string> = {
  oil_well:     'bg-amber-600/20 border-amber-600/30 text-amber-300',
  pump_jack:    'bg-sky-800/20 border-sky-700/30 text-sky-300',
  derrick:      'bg-violet-800/20 border-violet-700/30 text-violet-300',
  oil_terminal: 'bg-yellow-800/20 border-yellow-700/30 text-yellow-300',
  storage_tank: 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300',
  refinery:     'bg-red-900/20 border-red-700/30 text-red-300',
}

const UPGRADE_BTN: Record<BuildingType, string> = {
  oil_well:     'bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/35',
  pump_jack:    'bg-sky-800/20 text-sky-300 border border-sky-700/40 hover:bg-sky-800/35',
  derrick:      'bg-violet-800/20 text-violet-300 border border-violet-700/40 hover:bg-violet-800/35',
  oil_terminal: 'bg-yellow-800/20 text-yellow-300 border border-yellow-700/40 hover:bg-yellow-800/35',
  storage_tank: 'bg-emerald-900/20 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900/35',
  refinery:     'bg-red-900/20 text-red-300 border border-red-700/40 hover:bg-red-900/35',
}

// ── Stat helper ────────────────────────────────────────────────────────────
interface BuildingStat {
  label: string
  value: string
  nextValue?: string
}

function getBuildingStatDisplay(type: BuildingType, level: number): BuildingStat {
  const prod = getBuildingProduction(type, level)
  if (prod > 0) {
    const next = getBuildingProduction(type, level + 1)
    return { label: 'Output', value: `+${formatNumber(prod, 1)} bbl/s`, nextValue: `+${formatNumber(next, 1)} bbl/s` }
  }
  const storage = getBuildingStorageBonus(type, level)
  if (storage > 0) {
    const next = getBuildingStorageBonus(type, level + 1)
    return { label: 'Capacity', value: `+${formatNumber(storage, 0)} bbl`, nextValue: `+${formatNumber(next, 0)} bbl` }
  }
  const refRate = getBuildingRefineryRate(type, level)
  if (refRate > 0) {
    const next = getBuildingRefineryRate(type, level + 1)
    const refined = refRate / 2
    const nextRefined = next / 2
    return {
      label: 'Refines',
      value: `${formatNumber(refined, 1)}/s refined`,
      nextValue: `${formatNumber(nextRefined, 1)}/s refined`,
    }
  }
  if (type === 'oil_terminal') {
    return { label: 'Aura', value: '+20% nearby', nextValue: '+20% nearby' }
  }
  return { label: '', value: '' }
}

// ── Component ──────────────────────────────────────────────────────────────
export function BuildMenu() {
  const selectedCell = useUiStore((s) => s.selectedCell)
  const showBuildMenu = useUiStore((s) => s.showBuildMenu)
  const clearSelection = useUiStore((s) => s.clearSelection)

  const plots = useGameStore((s) => s.plots)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const buildOnCell = useGameStore((s) => s.buildOnCell)
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding)
  const trackEvent = useMissionStore((s) => s.trackEvent)
  const addToast = useUiStore((s) => s.addToast)

  if (!showBuildMenu || !selectedCell) return null

  const plot = plots.find((p) => p.x === selectedCell.x && p.y === selectedCell.y)
  if (!plot || plot.status !== 'unlocked') return null

  const handleBuild = (type: BuildingType) => {
    const success = buildOnCell(selectedCell.x, selectedCell.y, type)
    if (success) {
      trackEvent('building_built', 1)
      addToast({ message: `Built ${BUILDING_DEFINITIONS[type].name}!`, type: 'success' })
      clearSelection()
    }
  }

  const handleUpgrade = () => {
    if (!plot.building) return
    const success = upgradeBuilding(selectedCell.x, selectedCell.y)
    if (success) {
      trackEvent('building_upgraded', 1)
      addToast({ message: `Upgraded to Lv.${plot.level + 1}!`, type: 'success' })
      clearSelection()
    }
  }

  // ── UPGRADE VIEW ─────────────────────────────────────────────────────────
  if (plot.building) {
    const def = BUILDING_DEFINITIONS[plot.building]
    const upgradeCost = getBuildingUpgradeCost(plot.building, plot.level)
    const canAfford = petrodollars >= upgradeCost
    const stat = getBuildingStatDisplay(plot.building, plot.level)

    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-72">
        <div className="bg-oil-900/95 border border-oil-600/60 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{def.emoji}</span>
              <div>
                <h3 className="font-bold text-foreground text-sm">{def.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', BADGE_COLOR[plot.building])}>
                    LV {plot.level}
                  </span>
                  <span className="text-[9px] text-muted-foreground">→</span>
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', BADGE_COLOR[plot.building], 'opacity-70')}>
                    LV {plot.level + 1}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-oil-700/50"
            >
              ×
            </button>
          </div>

          {/* Stat comparison */}
          {stat.value && (
            <div className="bg-oil-800/50 rounded-lg px-3 py-2 mb-3 border border-oil-700/40">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold tabular-nums', STAT_COLOR[plot.building])}>
                  {stat.value}
                </span>
                {stat.nextValue && stat.nextValue !== stat.value && (
                  <>
                    <span className="text-muted-foreground/50 text-xs">→</span>
                    <span className={cn('text-sm font-bold tabular-nums', STAT_COLOR[plot.building])}>
                      {stat.nextValue}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upgrade button */}
          <button
            onClick={handleUpgrade}
            disabled={!canAfford}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg text-sm font-bold transition-all active:scale-[0.98]',
              canAfford
                ? [UPGRADE_BTN[plot.building], 'opacity-100']
                : 'bg-oil-700/30 text-muted-foreground/40 cursor-not-allowed border border-oil-700/20'
            )}
          >
            {canAfford ? (
              <span>Upgrade to Lv.{plot.level + 1} — <span className="tabular-nums">${formatCommas(upgradeCost)}</span></span>
            ) : (
              <span>Need <span className="tabular-nums">${formatCommas(upgradeCost - petrodollars)}</span> more</span>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── BUILD VIEW ───────────────────────────────────────────────────────────
  const availableBuildings = getAvailableBuildings(unlockedTileCount)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-80">
      <div className="bg-oil-900/95 border border-oil-600/60 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">Build Structure</h3>
          <button
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-oil-700/50"
          >
            ×
          </button>
        </div>

        <div className="space-y-1.5">
          {availableBuildings.map((type) => {
            const def = BUILDING_DEFINITIONS[type]
            const cost = getBuildingCost(type, 1)
            const canAfford = petrodollars >= cost
            const stat = getBuildingStatDisplay(type, 1)

            return (
              <button
                key={type}
                onClick={() => handleBuild(type)}
                disabled={!canAfford}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all border',
                  canAfford
                    ? 'bg-oil-800/40 border-oil-700/40 hover:bg-oil-700/50 hover:border-oil-600/50 active:scale-[0.98]'
                    : 'bg-oil-900/30 border-oil-800/20 opacity-40 cursor-not-allowed'
                )}
              >
                <span className="text-xl shrink-0">{def.emoji}</span>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-foreground">{def.name}</span>
                    {stat.value && (
                      <span className={cn('text-[9px] font-semibold tabular-nums', STAT_COLOR[type])}>
                        {stat.value}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 truncate leading-tight mt-0.5">
                    {def.description}
                  </div>
                </div>

                {/* Cost */}
                <div className={cn(
                  'text-xs font-bold whitespace-nowrap tabular-nums shrink-0',
                  canAfford ? 'text-crude-400' : 'text-oil-600'
                )}>
                  ${formatCommas(cost)}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
