'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import {
  UPGRADE_DEFINITIONS,
  getUpgradeCost,
  canPurchaseUpgrade,
  getExtractionSpeedMultiplier,
  getStorageExpansionMultiplier,
  getRefineryEfficiencyMultiplier,
  getAutoSellRate,
  getMaxOfflineSeconds,
} from '@/engine/upgrades'
import type { UpgradeType } from '@/engine/types'
import { formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Stat helpers ──────────────────────────────────────────────────────────

function getUpgradeStatLabel(type: UpgradeType, level: number): { current: string; next: string } {
  switch (type) {
    case 'extraction_speed': {
      const cur = getExtractionSpeedMultiplier(level)
      const nxt = getExtractionSpeedMultiplier(level + 1)
      return { current: `${cur.toFixed(2)}× output`, next: `${nxt.toFixed(2)}×` }
    }
    case 'storage_expansion': {
      const cur = getStorageExpansionMultiplier(level)
      const nxt = getStorageExpansionMultiplier(level + 1)
      return { current: `${cur.toFixed(2)}× capacity`, next: `${nxt.toFixed(2)}×` }
    }
    case 'refinery_efficiency': {
      const cur = getRefineryEfficiencyMultiplier(level)
      const nxt = getRefineryEfficiencyMultiplier(level + 1)
      return { current: `${cur.toFixed(2)}× throughput`, next: `${nxt.toFixed(2)}×` }
    }
    case 'auto_sell': {
      if (level === 0) return { current: 'Off', next: '50% rate' }
      const cur = getAutoSellRate(level)
      const nxt = getAutoSellRate(level + 1)
      return { current: `${Math.round(cur * 100)}% sell rate`, next: `${Math.round(nxt * 100)}%` }
    }
    case 'offline_duration': {
      const cur = getMaxOfflineSeconds(level) / 3600
      const nxt = getMaxOfflineSeconds(level + 1) / 3600
      return { current: `${cur.toFixed(0)}h offline`, next: `${nxt.toFixed(0)}h` }
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────

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
        const stat = getUpgradeStatLabel(type, currentLevel)
        const progressPct = (currentLevel / def.maxLevel) * 100

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
              <span className="text-xl mt-0.5 shrink-0">{def.emoji}</span>

              <div className="flex-1 min-w-0">
                {/* Name + level */}
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-xs font-bold text-foreground">{def.name}</h4>
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded tabular-nums',
                    isMaxed
                      ? 'bg-crude-600/20 text-crude-400 border border-crude-600/30'
                      : 'bg-oil-700/60 text-muted-foreground border border-oil-600/30'
                  )}>
                    {isMaxed ? 'MAX' : `${currentLevel}/${def.maxLevel}`}
                  </span>
                </div>

                {/* Current stat + next preview */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] text-crude-400 font-semibold tabular-nums">
                    {stat.current}
                  </span>
                  {!isMaxed && (
                    <>
                      <span className="text-[9px] text-muted-foreground/50">→</span>
                      <span className="text-[10px] text-crude-300/70 font-semibold tabular-nums">
                        {stat.next}
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-oil-700 rounded-full mb-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isMaxed ? 'bg-crude-500' : 'bg-crude-600'
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Action button */}
                <button
                  onClick={handleBuy}
                  disabled={!canAfford}
                  className={cn(
                    'w-full py-1.5 rounded-md text-xs font-bold transition-all',
                    isMaxed
                      ? 'bg-crude-800/20 text-crude-400/60 border border-crude-700/20 cursor-not-allowed'
                      : canAfford
                        ? 'bg-crude-600/20 text-crude-300 border border-crude-600/40 hover:bg-crude-600/30 active:scale-[0.98]'
                        : 'bg-oil-700/30 text-muted-foreground/40 border border-oil-700/20 cursor-not-allowed'
                  )}
                >
                  {isMaxed ? (
                    '✓ Maxed Out'
                  ) : canAfford ? (
                    <span>Upgrade → Lv.{currentLevel + 1} — <span className="tabular-nums">${formatCommas(cost)}</span></span>
                  ) : (
                    <span>Need <span className="tabular-nums">${formatCommas(cost - petrodollars)}</span> more</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
