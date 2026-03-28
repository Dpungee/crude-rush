import { create } from 'zustand'
import type { MissionProgress, GameEventType } from '@/engine/types'
import { MISSION_DEFINITIONS } from '@/data/missions'

interface MissionState {
  missions: MissionProgress[]
  dailyRewardAvailable: boolean
  dailyRewardDay: number

  // Actions
  initializeMissions: () => void
  trackEvent: (eventType: GameEventType, amount: number) => void
  claimMission: (missionKey: string) => number // returns reward amount
  setDailyReward: (available: boolean, day: number) => void
  hydrate: (missions: MissionProgress[]) => void
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  dailyRewardAvailable: false,
  dailyRewardDay: 1,

  initializeMissions: () => {
    const missions: MissionProgress[] = MISSION_DEFINITIONS.map((def) => ({
      missionKey: def.key,
      progress: 0,
      target: def.target,
      completed: false,
      claimed: false,
      rewardType: def.rewardType,
      rewardAmount: def.rewardAmount,
    }))
    set({ missions })
  },

  trackEvent: (eventType, amount) => {
    const state = get()
    const relevantDefs = MISSION_DEFINITIONS.filter((d) => d.trackEvent === eventType)
    if (relevantDefs.length === 0) return

    const updatedMissions = state.missions.map((m) => {
      const def = relevantDefs.find((d) => d.key === m.missionKey)
      if (!def || m.completed) return m

      const newProgress = Math.min(m.progress + amount, m.target)
      return {
        ...m,
        progress: newProgress,
        completed: newProgress >= m.target,
      }
    })

    set({ missions: updatedMissions })
  },

  claimMission: (missionKey) => {
    const state = get()
    const mission = state.missions.find((m) => m.missionKey === missionKey)
    if (!mission || !mission.completed || mission.claimed) return 0

    const updatedMissions = state.missions.map((m) =>
      m.missionKey === missionKey ? { ...m, claimed: true } : m
    )

    set({ missions: updatedMissions })
    return mission.rewardAmount
  },

  setDailyReward: (available, day) =>
    set({ dailyRewardAvailable: available, dailyRewardDay: day }),

  hydrate: (missions) => {
    // Merge server missions with definitions (in case new missions were added)
    const merged = MISSION_DEFINITIONS.map((def) => {
      const existing = missions.find((m) => m.missionKey === def.key)
      if (existing) return existing
      return {
        missionKey: def.key,
        progress: 0,
        target: def.target,
        completed: false,
        claimed: false,
        rewardType: def.rewardType,
        rewardAmount: def.rewardAmount,
      }
    })
    set({ missions: merged })
  },
}))
