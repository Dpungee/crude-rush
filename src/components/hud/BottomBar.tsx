'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/lib/utils'
import { NextGoalCard } from './NextGoalCard'

export function BottomBar() {
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)

  return (
    <div className="flex items-center gap-2 px-3 py-1"
      style={{
        background: 'linear-gradient(0deg, rgba(10,9,7,0.85) 0%, rgba(10,9,7,0.5) 80%, transparent 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="flex-1 min-w-0">
        <NextGoalCard />
      </div>
      <span className="text-[8px] text-oil-600/40 tabular-nums shrink-0">
        {formatNumber(lifetimeBarrels)} bbl
      </span>
    </div>
  )
}
