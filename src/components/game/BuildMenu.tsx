'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { BUILDING_DEFINITIONS, getBuildingCost, getBuildingUpgradeCost, getAvailableBuildings } from '@/engine/buildings'
import type { BuildingType } from '@/engine/types'
import { formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

  // If cell has a building, show upgrade menu
  if (plot.building) {
    const def = BUILDING_DEFINITIONS[plot.building]
    const upgradeCost = getBuildingUpgradeCost(plot.building, plot.level)
    const canAfford = petrodollars >= upgradeCost

    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-72">
        <div className="bg-oil-800 border border-oil-600 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{def.emoji}</span>
              <div>
                <h3 className="font-bold text-foreground text-sm">{def.name}</h3>
                <p className="text-xs text-muted-foreground">Level {plot.level}</p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={!canAfford}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg text-sm font-bold transition-all',
              canAfford
                ? 'bg-crude-600 text-oil-950 hover:bg-crude-500 active:scale-[0.98]'
                : 'bg-oil-700 text-muted-foreground cursor-not-allowed'
            )}
          >
            Upgrade to Lv.{plot.level + 1} — ${formatCommas(upgradeCost)}
          </button>
        </div>
      </div>
    )
  }

  // Empty unlocked cell — show build options
  const availableBuildings = getAvailableBuildings(unlockedTileCount)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-80">
      <div className="bg-oil-800 border border-oil-600 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">Build Structure</h3>
          <button
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-1.5">
          {availableBuildings.map((type) => {
            const def = BUILDING_DEFINITIONS[type]
            const cost = getBuildingCost(type, 1)
            const canAfford = petrodollars >= cost

            return (
              <button
                key={type}
                onClick={() => handleBuild(type)}
                disabled={!canAfford}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all',
                  canAfford
                    ? 'bg-oil-700/50 hover:bg-oil-700 active:scale-[0.98]'
                    : 'bg-oil-900/30 opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-xl">{def.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{def.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{def.description}</div>
                </div>
                <div className="text-xs font-bold text-crude-400 whitespace-nowrap">
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
