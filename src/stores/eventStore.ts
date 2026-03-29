import { create } from 'zustand'
import type { GlobalEvent, EventModifiers } from '@/engine/types'

interface EventState {
  activeEvents: GlobalEvent[]
  fetchEvents: () => Promise<void>
  getEffectiveModifiers: () => EventModifiers
}

export const useEventStore = create<EventState>((set, get) => ({
  activeEvents: [],

  fetchEvents: async () => {
    try {
      const res = await fetch('/api/events/active')
      if (res.ok) {
        const data = await res.json()
        const events = (data.events ?? []).map((e: Record<string, unknown>) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          emoji: e.emoji,
          startsAt: e.starts_at,
          endsAt: e.ends_at,
          modifiers: (e.modifiers ?? {}) as EventModifiers,
        }))
        set({ activeEvents: events })
      }
    } catch {
      // Non-critical
    }
  },

  /** Merge all active event modifiers multiplicatively */
  getEffectiveModifiers: (): EventModifiers => {
    const events = get().activeEvents
    if (events.length === 0) return {}

    const result: EventModifiers = {}
    for (const event of events) {
      const m = event.modifiers
      if (m.productionMultiplier) result.productionMultiplier = (result.productionMultiplier ?? 1) * m.productionMultiplier
      if (m.sellPriceMultiplier) result.sellPriceMultiplier = (result.sellPriceMultiplier ?? 1) * m.sellPriceMultiplier
      if (m.refinerySpeedMultiplier) result.refinerySpeedMultiplier = (result.refinerySpeedMultiplier ?? 1) * m.refinerySpeedMultiplier
      if (m.upgradeTimeMultiplier) result.upgradeTimeMultiplier = (result.upgradeTimeMultiplier ?? 1) * m.upgradeTimeMultiplier
      if (m.tokenRewardMultiplier) result.tokenRewardMultiplier = (result.tokenRewardMultiplier ?? 1) * m.tokenRewardMultiplier
    }
    return result
  },
}))
