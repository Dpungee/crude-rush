'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { CRUDE_OIL_SELL_RATE, REFINED_OIL_SELL_RATE } from '@/engine/constants'
import { formatCommas, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function SellPanel() {
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const sellCrudeOil = useGameStore((s) => s.sellCrudeOil)
  const sellRefinedOil = useGameStore((s) => s.sellRefinedOil)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const handleSellCrude = () => {
    const amount = crudeOil
    if (amount <= 0) return
    const earned = Math.floor(amount * CRUDE_OIL_SELL_RATE)
    sellCrudeOil(amount)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(amount)} crude for $${formatCommas(earned)}`, type: 'reward' })
  }

  const handleSellRefined = () => {
    const amount = refinedOil
    if (amount <= 0) return
    const earned = Math.floor(amount * REFINED_OIL_SELL_RATE)
    sellRefinedOil(amount)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(amount)} refined for $${formatCommas(earned)}`, type: 'reward' })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleSellCrude}
        disabled={crudeOil < 1}
        className={cn(
          'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all',
          crudeOil >= 1
            ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30 active:scale-[0.97]'
            : 'bg-oil-800/30 text-muted-foreground cursor-not-allowed'
        )}
      >
        Sell Crude ({formatNumber(crudeOil)})
      </button>
      <button
        onClick={handleSellRefined}
        disabled={refinedOil < 1}
        className={cn(
          'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all',
          refinedOil >= 1
            ? 'bg-petro-blue/20 text-petro-blue border border-petro-blue/30 hover:bg-petro-blue/30 active:scale-[0.97]'
            : 'bg-oil-800/30 text-muted-foreground cursor-not-allowed'
        )}
      >
        Sell Refined ({formatNumber(refinedOil)})
      </button>
    </div>
  )
}
