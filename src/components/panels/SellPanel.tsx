'use client'

import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { CRUDE_OIL_SELL_RATE, REFINED_OIL_SELL_RATE } from '@/engine/constants'
import { formatCommas, formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function SellPanel() {
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const storageCapacity = useGameStore((s) => s.storageCapacity)
  const productionRate = useGameStore((s) => s.productionRate)
  const refineryRate = useGameStore((s) => s.refineryRate)
  const marketMultiplier = useGameStore((s) => s.marketMultiplier)
  const streakMultiplier = useGameStore((s) => s.streakMultiplier)
  const milestoneCashBonus = useGameStore((s) => s.milestoneCashBonus)
  const sellCrudeOil = useGameStore((s) => s.sellCrudeOil)
  const sellRefinedOil = useGameStore((s) => s.sellRefinedOil)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  const storagePercent = pct(crudeOil, storageCapacity)

  // Apply all active multipliers to the sell rate
  const effectiveCrudeRate = CRUDE_OIL_SELL_RATE * marketMultiplier * streakMultiplier * milestoneCashBonus
  const effectiveRefinedRate = REFINED_OIL_SELL_RATE * marketMultiplier * streakMultiplier * milestoneCashBonus
  const totalCrudeValue = Math.floor(crudeOil * effectiveCrudeRate)
  const totalRefinedValue = Math.floor(refinedOil * effectiveRefinedRate)

  const marketDelta = (marketMultiplier - 1) * 100
  const isMarketHot = marketMultiplier >= 1.1
  const isMarketCold = marketMultiplier <= 0.9

  const handleSellCrude = () => {
    if (crudeOil < 1) return
    sellCrudeOil(crudeOil)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(crudeOil)} bbl → +$${formatCommas(totalCrudeValue)}`, type: 'reward' })
  }

  const handleSellRefined = () => {
    if (refinedOil < 1) return
    sellRefinedOil(refinedOil)
    trackEvent('oil_sold', 1)
    addToast({ message: `Sold ${formatNumber(refinedOil)} bbl refined → +$${formatCommas(totalRefinedValue)}`, type: 'reward' })
  }

  return (
    <div className="space-y-3">
      {/* Market status banner */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg border text-xs',
        isMarketHot
          ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
          : isMarketCold
            ? 'bg-red-950/40 border-red-900/40 text-red-400'
            : 'bg-oil-800/40 border-oil-700/50 text-muted-foreground'
      )}>
        <span className="font-semibold">
          {isMarketHot ? '📈 MARKET HOT' : isMarketCold ? '📉 MARKET COLD' : '📊 Market'}
        </span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-bold">
            {marketDelta >= 0 ? '+' : ''}{marketDelta.toFixed(1)}%
          </span>
          <span className="opacity-50 tabular-nums">{marketMultiplier.toFixed(3)}x</span>
        </div>
      </div>

      {/* Crude Oil card */}
      <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛢️</span>
            <div>
              <div className="text-xs font-semibold text-amber-300">Crude Oil</div>
              <div className="text-[10px] text-muted-foreground tabular-nums">
                ${effectiveCrudeRate.toFixed(2)}/bbl
                {Math.abs(marketDelta) >= 1 && (
                  <span className={marketDelta > 0 ? 'text-emerald-500 ml-1' : 'text-red-500 ml-1'}>
                    ({marketDelta >= 0 ? '+' : ''}{marketDelta.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-amber-400 tabular-nums">{formatNumber(crudeOil)}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">/{formatNumber(storageCapacity)} bbl</div>
          </div>
        </div>

        {/* Storage fill bar */}
        <div className="w-full h-1.5 bg-oil-700 rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              storagePercent > 90 ? 'bg-flame' : storagePercent > 70 ? 'bg-amber-500' : 'bg-amber-600'
            )}
            style={{ width: `${storagePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] text-muted-foreground">
            Rate:{' '}
            <span className="text-amber-400 font-semibold tabular-nums">+{formatNumber(productionRate)}/s</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            Value:{' '}
            <span className="text-crude-400 font-semibold tabular-nums">${formatCommas(totalCrudeValue)}</span>
          </span>
        </div>

        <button
          onClick={handleSellCrude}
          disabled={crudeOil < 1}
          className={cn(
            'w-full py-2 rounded-lg text-xs font-bold transition-all',
            crudeOil >= 1
              ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30 active:scale-[0.97]'
              : 'bg-oil-800/30 text-muted-foreground/40 cursor-not-allowed'
          )}
        >
          {crudeOil >= 1 ? `Sell All Crude — +$${formatCommas(totalCrudeValue)}` : 'No crude to sell'}
        </button>
      </div>

      {/* Refined Oil card — only shown when refinery exists */}
      {(refinedOil > 0.1 || refineryRate > 0) && (
        <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚗️</span>
              <div>
                <div className="text-xs font-semibold text-sky-300">Refined Oil</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">${effectiveRefinedRate.toFixed(2)}/bbl</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-sky-400 tabular-nums">{formatNumber(refinedOil)}</div>
              {refineryRate > 0 && (
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  +{formatNumber(refineryRate / 2)}/s
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSellRefined}
            disabled={refinedOil < 1}
            className={cn(
              'w-full py-2 rounded-lg text-xs font-bold transition-all',
              refinedOil >= 1
                ? 'bg-sky-900/30 text-sky-300 border border-sky-800/40 hover:bg-sky-900/50 active:scale-[0.97]'
                : 'bg-oil-800/30 text-muted-foreground/40 cursor-not-allowed'
            )}
          >
            {refinedOil >= 1
              ? `Sell All Refined — +$${formatCommas(totalRefinedValue)}`
              : 'Refinery processing…'}
          </button>
        </div>
      )}

      {productionRate === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Build oil wells on your unlocked plots to start producing.
          </p>
        </div>
      )}
    </div>
  )
}
