'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { canPrestige, getPrestigeThreshold, getPrestigeMultiplier, performPrestige } from '@/engine/prestige'
import { formatCommas, formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PrestigePanel() {
  const state = useGameStore.getState()
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const prestigeMultiplier = useGameStore((s) => s.prestigeMultiplier)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const threshold = getPrestigeThreshold(prestigeLevel)
  const canDoPrestige = canPrestige(state)
  const nextMultiplier = getPrestigeMultiplier(prestigeLevel + 1)
  const progress = pct(lifetimeBarrels, threshold)

  const handlePrestige = () => {
    if (!canDoPrestige) return

    const newState = performPrestige(useGameStore.getState())
    useGameStore.setState(newState)
    trackEvent('prestige_reset', 1)
    addToast({
      message: `Wildcatter Reset! Now at ${nextMultiplier.toFixed(1)}x multiplier!`,
      type: 'reward',
      duration: 5000,
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">Wildcatter Reset</h3>

      <div className="bg-oil-800/50 rounded-lg p-4 border border-oil-700/50 text-center">
        <div className="text-4xl mb-2">🌟</div>
        <div className="text-lg font-bold text-crude-400">
          Prestige Level {prestigeLevel}
        </div>
        <div className="text-sm text-muted-foreground">
          Current multiplier: <span className="text-crude-400 font-bold">{prestigeMultiplier.toFixed(1)}x</span>
        </div>
      </div>

      <div className="bg-oil-800/50 rounded-lg p-4 border border-oil-700/50">
        <p className="text-xs text-muted-foreground mb-3">
          Reset all buildings, upgrades, and resources for a permanent production multiplier.
          Your lifetime stats are preserved.
        </p>

        <div className="mb-2 text-xs text-muted-foreground">
          Progress to next prestige:
        </div>
        <div className="w-full h-2 bg-oil-700 rounded-full overflow-hidden mb-1">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              canDoPrestige ? 'bg-crude-400 animate-pulse' : 'bg-crude-600'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right mb-4">
          {formatNumber(lifetimeBarrels)} / {formatNumber(threshold)} barrels
        </div>

        {canDoPrestige && (
          <div className="text-center mb-3">
            <span className="text-sm text-petro-green font-bold">
              New multiplier: {nextMultiplier.toFixed(1)}x (+{((nextMultiplier - prestigeMultiplier) * 100).toFixed(0)}%)
            </span>
          </div>
        )}

        <button
          onClick={handlePrestige}
          disabled={!canDoPrestige}
          className={cn(
            'w-full py-3 rounded-lg text-sm font-bold transition-all',
            canDoPrestige
              ? 'bg-gradient-to-r from-crude-600 to-flame text-white hover:from-crude-500 hover:to-flame-light active:scale-[0.98] shadow-lg shadow-crude-500/25'
              : 'bg-oil-700 text-muted-foreground cursor-not-allowed'
          )}
        >
          {canDoPrestige ? 'Perform Wildcatter Reset' : 'Not enough barrels yet'}
        </button>
      </div>
    </div>
  )
}
