'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { UPGRADE_DEFINITIONS, getUpgradeCost, canPurchaseUpgrade } from '@/engine/upgrades'
import type { UpgradeType } from '@/engine/types'
import { formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function UpgradePanel() {
  const upgrades = useGameStore((s) => s.upgrades)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const upgradeTypes = Object.keys(UPGRADE_DEFINITIONS) as UpgradeType[]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground">Global Upgrades</h3>

      {upgradeTypes.map((type) => {
        const def = UPGRADE_DEFINITIONS[type]
        const currentLevel = upgrades[type]
        const isMaxed = !canPurchaseUpgrade(type, currentLevel)
        const cost = isMaxed ? 0 : getUpgradeCost(type, currentLevel)
        const canAfford = petrodollars >= cost && !isMaxed

        const handleBuy = () => {
          const success = purchaseUpgrade(type)
          if (success) {
            trackEvent('upgrade_purchased', 1)
            addToast({ message: `${def.name} upgraded to Lv.${currentLevel + 1}!`, type: 'success' })
          }
        }

        return (
          <div
            key={type}
            className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-xl mt-0.5">{def.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{def.name}</h4>
                  <span className="text-xs text-muted-foreground">
                    Lv.{currentLevel}/{def.maxLevel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>

                {/* Level progress bar */}
                <div className="w-full h-1 bg-oil-700 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-crude-500 rounded-full transition-all"
                    style={{ width: `${(currentLevel / def.maxLevel) * 100}%` }}
                  />
                </div>

                <button
                  onClick={handleBuy}
                  disabled={!canAfford}
                  className={cn(
                    'mt-2 w-full py-1.5 rounded-md text-xs font-bold transition-all',
                    isMaxed
                      ? 'bg-oil-700/50 text-muted-foreground cursor-not-allowed'
                      : canAfford
                        ? 'bg-crude-600 text-oil-950 hover:bg-crude-500 active:scale-[0.98]'
                        : 'bg-oil-700 text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isMaxed ? 'MAXED' : `Upgrade — $${formatCommas(cost)}`}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
