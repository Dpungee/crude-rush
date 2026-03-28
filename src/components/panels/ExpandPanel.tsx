'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { GRID_SIZES, GRID_EXPAND_COSTS } from '@/engine/constants'
import { formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function ExpandPanel() {
  const gridSize = useGameStore((s) => s.gridSize)
  const petrodollars = useGameStore((s) => s.petrodollars)
  const expandGrid = useGameStore((s) => s.expandGrid)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const currentIndex = GRID_SIZES.indexOf(gridSize as (typeof GRID_SIZES)[number])
  const isMaxSize = currentIndex >= GRID_SIZES.length - 1

  if (isMaxSize) return null

  const nextSize = GRID_SIZES[currentIndex + 1]
  const cost = GRID_EXPAND_COSTS[currentIndex + 1]
  const canAfford = petrodollars >= cost

  const handleExpand = () => {
    const success = expandGrid()
    if (success) {
      trackEvent('grid_expanded', 1)
      addToast({ message: `Expanded to ${nextSize}×${nextSize}!`, type: 'success' })
    }
  }

  return (
    <button
      onClick={handleExpand}
      disabled={!canAfford}
      className={cn(
        'w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all border',
        canAfford
          ? 'bg-petro-green/10 text-petro-green border-petro-green/30 hover:bg-petro-green/20 active:scale-[0.98]'
          : 'bg-oil-800/30 text-muted-foreground border-oil-700/30 cursor-not-allowed'
      )}
    >
      Expand to {nextSize}×{nextSize} — ${formatCommas(cost)}
    </button>
  )
}
