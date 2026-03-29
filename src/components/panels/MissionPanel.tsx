'use client'

import { useMissionStore } from '@/stores/missionStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { MISSION_DEFINITIONS } from '@/data/missions'
import { formatCommas, pct } from '@/lib/utils'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MICRO = 1_000_000

export function MissionPanel() {
  const missions = useMissionStore((s) => s.missions)
  const claimMission = useMissionStore((s) => s.claimMission)
  const addToast = useUiStore((s) => s.addToast)
  const authToken = usePlayerStore((s) => s.authToken)
  const addPendingTokens = usePlayerStore((s) => s.addPendingTokens)

  const handleClaim = async (key: string) => {
    if (!authToken) return

    const result = await claimMission(key, authToken)
    if (!result) {
      addToast({ message: 'Claim failed — try again', type: 'error' })
      return
    }

    const { petrodollarReward, tokenMicroReward } = result

    // Apply petrodollars to game store
    if (petrodollarReward > 0) {
      const current = useGameStore.getState().petrodollars
      useGameStore.setState({ petrodollars: current + petrodollarReward })
    }

    // Add token reward to pending balance
    if (tokenMicroReward > 0) {
      addPendingTokens(tokenMicroReward)
    }

    // Toast message
    const parts: string[] = []
    if (petrodollarReward > 0) parts.push(`+$${formatCommas(petrodollarReward)}`)
    if (tokenMicroReward > 0) parts.push(`+${formatNumber(tokenMicroReward / MICRO, 1)} $CRUDE`)
    addToast({
      message: `Mission complete! ${parts.join(' · ')}`,
      type: 'reward',
    })
  }

  const sorted = [...missions].sort((a, b) => {
    if (a.completed && !a.claimed && !(b.completed && !b.claimed)) return -1
    if (b.completed && !b.claimed && !(a.completed && !a.claimed)) return 1
    if (a.claimed && !b.claimed) return 1
    if (b.claimed && !a.claimed) return -1
    return 0
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground">Missions</h3>

      {sorted.map((mission) => {
        const def = MISSION_DEFINITIONS.find((d) => d.key === mission.missionKey)
        if (!def) return null

        const percentage = pct(mission.progress, mission.target)
        const canClaim = mission.completed && !mission.claimed
        const hasTokenReward = (def.tokenMicroReward ?? 0) > 0

        return (
          <div
            key={mission.missionKey}
            className={cn(
              'bg-oil-800/50 rounded-lg p-3 border transition-all',
              canClaim
                ? 'border-crude-500/50 animate-pulse-glow'
                : mission.claimed
                  ? 'border-oil-700/30 opacity-50'
                  : 'border-oil-700/50'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">{def.name}</h4>
              <div className="text-right">
                <span className="text-xs text-petro-green font-bold">
                  +${formatCommas(def.rewardAmount)}
                </span>
                {hasTokenReward && (
                  <span className="ml-1.5 text-xs text-crude-400 font-bold">
                    +{formatNumber((def.tokenMicroReward ?? 0) / MICRO, 0)} $CRUDE
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{def.description}</p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-oil-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    mission.completed ? 'bg-petro-green' : 'bg-crude-500'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {formatCommas(mission.progress)}/{formatCommas(mission.target)}
              </span>
            </div>

            {canClaim && (
              <button
                onClick={() => handleClaim(mission.missionKey)}
                className="mt-2 w-full py-2.5 rounded-lg text-sm font-black bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 hover:from-crude-500 hover:to-crude-400 active:scale-[0.97] transition-all shadow-lg shadow-crude-500/20 upgrade-shine"
              >
                🎁 Claim Reward
              </button>
            )}

            {mission.claimed && (
              <div className="mt-2 text-center text-xs text-emerald-400/70 font-semibold">
                ✓ Claimed
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
