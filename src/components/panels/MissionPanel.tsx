'use client'

import { useMissionStore } from '@/stores/missionStore'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { MISSION_DEFINITIONS } from '@/data/missions'
import { formatCommas, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function MissionPanel() {
  const missions = useMissionStore((s) => s.missions)
  const claimMission = useMissionStore((s) => s.claimMission)
  const addToast = useUiStore((s) => s.addToast)

  const handleClaim = (key: string) => {
    const reward = claimMission(key)
    if (reward > 0) {
      // Add reward to game store
      const current = useGameStore.getState().petrodollars
      useGameStore.setState({ petrodollars: current + reward })
      addToast({ message: `Mission complete! +$${formatCommas(reward)}`, type: 'reward' })
    }
  }

  // Sort: unclaimed completed first, then in-progress, then claimed
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
              <span className="text-xs text-crude-400 font-bold">
                +${formatCommas(def.rewardAmount)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{def.description}</p>

            {/* Progress bar */}
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
                className="mt-2 w-full py-1.5 rounded-md text-xs font-bold bg-crude-600 text-oil-950 hover:bg-crude-500 active:scale-[0.98] transition-all"
              >
                Claim Reward
              </button>
            )}

            {mission.claimed && (
              <div className="mt-2 text-center text-xs text-petro-green font-semibold">
                Claimed
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
