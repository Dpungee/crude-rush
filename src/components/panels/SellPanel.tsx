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
  const storageCapacity = useGameStore((s) => s.storageCapacity)
  const productionRate = useGameStore((s) => s.productionRate)
  const sellCrudeOil = useGameStore((s) => s.sellCrudeOil)
  const sellRefinedOil = useGameStore((s) => s.sellRefinedOil)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const storagePercent = storageCapacity > 0 ? Math.min((crudeOil / storageCapacity) * 100, 100) : 0

  const handleSellCrude = () => {
    const amount = crudeOil
    if (amount < 1) return
    const earned = Math.floor(amount * CRUDE_OIL_SELL_RATE)
    sellCrudeOil(amount)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(amount)} bbl crude → +$${formatCommas(earned)}`, type: 'reward' })
  }

  const handleSellRefined = () => {
    const amount = refinedOil
    if (amount < 1) return
    const earned = Math.floor(amount * REFINED_OIL_SELL_RATE)
    sellRefinedOil(amount)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(amount)} bbl refined → +$${formatCommas(earned)}`, type: 'reward' })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">Oil Market</h3>

      {/* Crude Oil */}
      <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛢️</span>
            <div>
              <div className="text-sm font-semibold text-amber-300">Crude Oil</div>
              <div className="text-xs text-muted-foreground">${CRUDE_OIL_SELL_RATE}/bbl</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-amber-400">{formatNumber(crudeOil)}</div>
            <div className="text-xs text-muted-foreground">/{formatNumber(storageCapacity)} bbl</div>
          </div>
        </div>

        {/* Storage bar */}
        <div className="w-full h-1.5 bg-oil-700 rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              storagePercent > 90 ? 'bg-flame' : storagePercent > 70 ? 'bg-amber-500' : 'bg-amber-600'
            )}
            style={{ width: `${storagePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Earning: <span className="text-amber-400 font-semibold">+{formatNumber(productionRate)} bbl/s</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Value: <span className="text-crude-400 font-semibold">${formatCommas(Math.floor(crudeOil * CRUDE_OIL_SELL_RATE))}</span>
          </span>
        </div>

        <button
          onClick={handleSellCrude}
          disabled={crudeOil < 1}
          className={cn(
            'w-full py-2 rounded-lg text-xs font-bold transition-all',
            crudeOil >= 1
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30 active:scale-[0.97]'
              : 'bg-oil-800/30 text-muted-foreground cursor-not-allowed'
          )}
        >
          Sell All Crude — ${formatCommas(Math.floor(crudeOil * CRUDE_OIL_SELL_RATE))}
        </button>
      </div>

      {/* Refined Oil */}
      {refinedOil > 0 && (
        <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚗️</span>
              <div>
                <div className="text-sm font-semibold text-sky-300">Refined Oil</div>
                <div className="text-xs text-muted-foreground">${REFINED_OIL_SELL_RATE}/bbl</div>
              </div>
            </div>
            <div className="text-sm font-bold text-sky-400">{formatNumber(refinedOil)} bbl</div>
          </div>

          <button
            onClick={handleSellRefined}
            className="w-full py-2 rounded-lg text-xs font-bold bg-sky-600/20 text-sky-400 border border-sky-600/30 hover:bg-sky-600/30 active:scale-[0.97] transition-all"
          >
            Sell All Refined — ${formatCommas(Math.floor(refinedOil * REFINED_OIL_SELL_RATE))}
          </button>
        </div>
      )}

      {productionRate === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Build oil wells on unlocked plots to start producing.
        </p>
      )}
    </div>
  )
}
