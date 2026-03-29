'use client'

import { useEventStore } from '@/stores/eventStore'
import { cn } from '@/lib/utils'

export function EventBanner() {
  const activeEvents = useEventStore((s) => s.activeEvents)

  if (activeEvents.length === 0) return null

  const event = activeEvents[0] // Show the first active event
  const endsAt = new Date(event.endsAt).getTime()
  const now = Date.now()
  const hoursLeft = Math.max(0, Math.floor((endsAt - now) / 3_600_000))
  const minsLeft = Math.max(0, Math.floor(((endsAt - now) % 3_600_000) / 60_000))

  // Build a short modifier summary
  const m = event.modifiers
  const mods: string[] = []
  if (m.productionMultiplier && m.productionMultiplier > 1) mods.push(`${m.productionMultiplier}x Production`)
  if (m.sellPriceMultiplier && m.sellPriceMultiplier > 1) mods.push(`${m.sellPriceMultiplier}x Sell Price`)
  if (m.refinerySpeedMultiplier && m.refinerySpeedMultiplier > 1) mods.push(`${m.refinerySpeedMultiplier}x Refinery`)
  if (m.upgradeTimeMultiplier && m.upgradeTimeMultiplier < 1) mods.push(`${Math.round((1 - m.upgradeTimeMultiplier) * 100)}% Faster Builds`)

  return (
    <div className="bg-gradient-to-r from-crude-950/60 via-crude-900/40 to-crude-950/60 border-b border-crude-700/30 px-4 py-1.5 flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-2">
        <span className="text-sm">{event.emoji}</span>
        <span className="font-bold text-crude-300">{event.name}</span>
        {mods.length > 0 && (
          <span className="text-crude-400/80 font-semibold">{mods.join(' · ')}</span>
        )}
      </div>
      <div className="flex items-center gap-1 text-crude-400/60 tabular-nums">
        <span>{hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`}</span>
        <span className="opacity-50">left</span>
      </div>
    </div>
  )
}
