'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { canPrestige, getPrestigeThreshold, getPrestigeMultiplier, getBlackGoldEarned, performPrestige } from '@/engine/prestige'
import { BARRELS_PER_BLACK_GOLD } from '@/engine/constants'
import { formatCommas, formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PrestigePanel() {
  const [showConfirm, setShowConfirm] = useState(false)
  const state = useGameStore.getState()
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const prestigeMultiplier = useGameStore((s) => s.prestigeMultiplier)
  const blackGold = useGameStore((s) => s.blackGold)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const threshold = getPrestigeThreshold(prestigeLevel)
  const canDoPrestige = canPrestige(state)
  const nextMultiplier = getPrestigeMultiplier(prestigeLevel + 1)
  const progress = pct(lifetimeBarrels, threshold)
  const blackGoldPreview = getBlackGoldEarned(lifetimeBarrels)
  const multiplierGain = nextMultiplier - prestigeMultiplier

  const handlePrestige = () => {
    if (!canDoPrestige) return
    setShowConfirm(false)

    const newState = performPrestige(useGameStore.getState())
    useGameStore.setState(newState)
    trackEvent('prestige_reset', 1)
    addToast({
      message: `🌟 Wildcatter Reset! ${nextMultiplier.toFixed(1)}x production · +${blackGoldPreview} Black Gold`,
      type: 'reward',
      duration: 6000,
    })
  }

  return (
    <div className="space-y-3">
      {/* Current prestige status */}
      <div className="bg-gradient-to-br from-violet-950/30 to-oil-800/40 rounded-lg p-4 border border-violet-800/30 text-center">
        <div className="text-4xl mb-2 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">🌟</div>
        <div className="text-xl font-black text-violet-300">
          Prestige {prestigeLevel}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          <span className="text-violet-400 font-bold">{prestigeMultiplier.toFixed(1)}x</span> production multiplier
        </div>
        {blackGold > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-950/30 px-3 py-1 rounded-full border border-amber-800/30">
            <span className="text-sm">⬛</span>
            <span className="text-xs font-bold text-amber-400">{formatCommas(blackGold)} Black Gold</span>
          </div>
        )}
      </div>

      {/* Progress to next prestige */}
      <div className="bg-oil-800/40 rounded-lg p-3 border border-oil-700/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Next Prestige</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatNumber(lifetimeBarrels)} / {formatNumber(threshold)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-oil-700 rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              canDoPrestige ? 'bg-violet-400 animate-pulse' : 'bg-violet-600/60'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Reward preview */}
        {canDoPrestige ? (
          <div className="bg-violet-950/20 rounded-md p-3 border border-violet-800/20 mb-3 space-y-2">
            <div className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">You will receive:</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Production Multiplier</span>
              <span className="text-xs font-bold text-violet-400">
                {prestigeMultiplier.toFixed(1)}x → {nextMultiplier.toFixed(1)}x
                <span className="text-emerald-400 ml-1">(+{(multiplierGain * 100).toFixed(0)}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Black Gold</span>
              <span className="text-xs font-bold text-amber-400">+{formatCommas(blackGoldPreview)} ⬛</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground/60 mb-3">
            Produce {formatNumber(threshold - lifetimeBarrels)} more barrels to unlock prestige.
          </div>
        )}

        {/* What resets / what stays */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-[9px]">
          <div className="bg-red-950/10 rounded p-2 border border-red-900/15">
            <div className="font-bold text-red-400/70 mb-1">RESETS</div>
            <div className="text-muted-foreground/60 space-y-0.5">
              <div>Buildings & upgrades</div>
              <div>Crude oil & petrodollars</div>
              <div>Land ({unlockedTileCount} plots)</div>
            </div>
          </div>
          <div className="bg-emerald-950/10 rounded p-2 border border-emerald-900/15">
            <div className="font-bold text-emerald-400/70 mb-1">KEEPS</div>
            <div className="text-muted-foreground/60 space-y-0.5">
              <div>Lifetime stats & XP</div>
              <div>$CRUDE tokens</div>
              <div>Milestones & titles</div>
            </div>
          </div>
        </div>

        {/* Prestige button or confirmation */}
        {showConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-center text-amber-400 font-semibold">
              Reset your entire empire for permanent power?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-oil-700/50 text-muted-foreground border border-oil-600/30 hover:bg-oil-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePrestige}
                className="flex-1 py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 active:scale-[0.97] transition-all shadow-lg shadow-violet-500/20"
              >
                🌟 Confirm Reset
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => canDoPrestige ? setShowConfirm(true) : null}
            disabled={!canDoPrestige}
            className={cn(
              'w-full py-3 rounded-lg text-sm font-bold transition-all',
              canDoPrestige
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 active:scale-[0.98] shadow-lg shadow-violet-500/20 upgrade-shine'
                : 'bg-oil-700 text-muted-foreground cursor-not-allowed'
            )}
          >
            {canDoPrestige ? `Wildcatter Reset → ${nextMultiplier.toFixed(1)}x` : 'Not enough barrels yet'}
          </button>
        )}
      </div>
    </div>
  )
}
