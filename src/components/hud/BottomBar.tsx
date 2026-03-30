'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/lib/utils'
import { NextGoalCard } from './NextGoalCard'

export function BottomBar() {
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)

  return (
    <div className="px-3 py-1 flex items-center gap-2 flex-shrink-0"
      style={{
        background: 'linear-gradient(0deg, rgba(12,11,9,0.95) 0%, rgba(12,11,9,0.85) 100%)',
        borderTop: '1px solid rgba(50,45,35,0.2)',
      }}
    >
      <div className="flex-1 min-w-0">
        <NextGoalCard />
      </div>
      <span className="text-[9px] text-oil-600 tabular-nums shrink-0">
        {formatNumber(lifetimeBarrels)} bbl lifetime
      </span>
    </div>
  )
}
