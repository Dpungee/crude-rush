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
  /**
   * Claim a mission reward server-side.
   * Returns { petrodollarReward, tokenMicroReward } on success, null on failure.
   * Caller is responsible for applying petrodollars to game store.
   */
  claimMission: (missionKey: string, authToken: string) => Promise<{ petrodollarReward: number; tokenMicroReward: number } | null>
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

  claimMission: async (missionKey, authToken) => {
    const state = get()
    const mission = state.missions.find((m) => m.missionKey === missionKey)
    if (!mission || !mission.completed || mission.claimed) return null

    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ missionKey }),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[missions] Claim failed:', error)
        return null
      }

      const { petrodollarReward, tokenMicroReward } = await res.json()

      // Mark claimed in local store — server is the source of truth but
      // optimistic UI update avoids a re-fetch
      set({
        missions: state.missions.map((m) =>
          m.missionKey === missionKey ? { ...m, claimed: true } : m
        ),
      })

      return { petrodollarReward: petrodollarReward ?? 0, tokenMicroReward: tokenMicroReward ?? 0 }
    } catch (err) {
      console.error('[missions] Claim error:', err)
      return null
    }
  },

  setDailyReward: (available, day) =>
    set({ dailyRewardAvailable: available, dailyRewardDay: day }),

  hydrate: (missions) => {
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
