'use client'

import { useGameStore } from '@/stores/gameStore'
import { useMarketStore } from '@/stores/marketStore'
import { useUiStore } from '@/stores/uiStore'
import { useMissionStore } from '@/stores/missionStore'
import { CRUDE_OIL_SELL_RATE, REFINED_OIL_SELL_RATE } from '@/engine/constants'
import { MARKET_STATE_LABELS } from '@/engine/market'
import { formatCommas, formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

/** Tiny inline sparkline — 48 data points, pure SVG */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const w = 120
  const h = 28
  const min = Math.min(...data) - 0.02
  const max = Math.max(...data) + 0.02
  const range = max - min || 0.01

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  // Gradient fill under line
  const firstY = h - ((data[0] - min) / range) * h
  const lastY = h - ((data[data.length - 1] - min) / range) * h
  const fillPoints = `0,${firstY} ${points} ${w},${lastY} ${w},${h} 0,${h}`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#sparkFill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SellPanel() {
  const crudeOil = useGameStore((s) => s.crudeOil)
  const refinedOil = useGameStore((s) => s.refinedOil)
  const storageCapacity = useGameStore((s) => s.storageCapacity)
  const productionRate = useGameStore((s) => s.productionRate)
  const refineryRate = useGameStore((s) => s.refineryRate)
  const streakMultiplier = useGameStore((s) => s.streakMultiplier)
  const milestoneCashBonus = useGameStore((s) => s.milestoneCashBonus)
  const sellCrudeOil = useGameStore((s) => s.sellCrudeOil)
  const sellRefinedOil = useGameStore((s) => s.sellRefinedOil)
  const addToast = useUiStore((s) => s.addToast)
  const trackEvent = useMissionStore((s) => s.trackEvent)

  // Server-authoritative market data
  const crudeMult = useMarketStore((s) => s.crudeMult)
  const refinedMult = useMarketStore((s) => s.refinedMult)
  const marketState = useMarketStore((s) => s.state)
  const trendDirection = useMarketStore((s) => s.trendDirection)
  const nextTickIn = useMarketStore((s) => s.nextTickIn)
  const history = useMarketStore((s) => s.history)

  const storagePercent = pct(crudeOil, storageCapacity)
  const stateInfo = MARKET_STATE_LABELS[marketState]

  // Effective sell rates (market × streak × milestone)
  const effectiveCrudeRate = CRUDE_OIL_SELL_RATE * crudeMult * streakMultiplier * milestoneCashBonus
  const effectiveRefinedRate = REFINED_OIL_SELL_RATE * refinedMult * streakMultiplier * milestoneCashBonus
  const totalCrudeValue = Math.floor(crudeOil * effectiveCrudeRate)
  const totalRefinedValue = Math.floor(refinedOil * effectiveRefinedRate)

  const crudeDelta = (crudeMult - 1) * 100
  const refinedDelta = (refinedMult - 1) * 100

  const isBoom = marketState === 'boom' || marketState === 'bull'
  const isCrash = marketState === 'crash' || marketState === 'bear'

  const handleSellCrude = () => {
    if (crudeOil < 1) return
    sellCrudeOil(crudeOil)
    trackEvent('oil_sold', 1)
    addToast({
      message: `💰 +$${formatCommas(totalCrudeValue)} from ${formatNumber(crudeOil)} bbl crude`,
      type: 'reward',
      duration: 4000,
    })
  }

  const handleSellRefined = () => {
    if (refinedOil < 1) return
    sellRefinedOil(refinedOil)
    trackEvent('oil_sold', 1)
    addToast({
      message: `💰 +$${formatCommas(totalRefinedValue)} from ${formatNumber(refinedOil)} bbl refined`,
      type: 'reward',
      duration: 4000,
    })
  }

  // Sparkline color based on market state
  const sparkColor = isBoom ? '#34d399' : isCrash ? '#f87171' : '#94a3b8'

  return (
    <div className="space-y-3">
      {/* ── Market Status Card ─────────────────────────────────────────── */}
      <div
        className={cn(
          'rounded-lg border p-3',
          isBoom
            ? 'bg-emerald-950/40 border-emerald-800/40'
            : isCrash
              ? 'bg-red-950/40 border-red-900/40'
              : 'bg-oil-800/40 border-oil-700/50'
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{stateInfo.emoji}</span>
            <span className={cn('text-xs font-bold uppercase tracking-wider', stateInfo.color)}>
              {stateInfo.label}
            </span>
            {trendDirection !== 0 && (
              <span className={cn('text-[10px]', trendDirection > 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trendDirection > 0 ? '▲ Rising' : '▼ Falling'}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground tabular-nums">
            Next update: {formatTime(nextTickIn)}
          </div>
        </div>

        {/* Sparkline */}
        {history.length > 1 && (
          <div className="mb-2">
            <Sparkline data={history} color={sparkColor} />
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between text-[11px]">
          <div>
            <span className="text-muted-foreground">Crude: </span>
            <span className={cn('font-bold tabular-nums', crudeDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {crudeDelta >= 0 ? '+' : ''}{crudeDelta.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Refined: </span>
            <span className={cn('font-bold tabular-nums', refinedDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {refinedDelta >= 0 ? '+' : ''}{refinedDelta.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Advice banner */}
        {isBoom && (
          <div className="mt-2 text-[10px] text-emerald-300 bg-emerald-900/30 rounded px-2 py-1 text-center font-semibold animate-pulse">
            🔥 Prices surging — sell now for max profit!
          </div>
        )}
        {isCrash && (
          <div className="mt-2 text-[10px] text-red-300 bg-red-900/30 rounded px-2 py-1 text-center font-semibold">
            ⚠️ Market crash — consider holding until recovery
          </div>
        )}
      </div>

      {/* ── Crude Oil Card ─────────────────────────────────────────────── */}
      <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛢️</span>
            <div>
              <div className="text-xs font-semibold text-amber-300">Crude Oil</div>
              <div className="text-[10px] text-muted-foreground tabular-nums">
                ${effectiveCrudeRate.toFixed(2)}/bbl
                {Math.abs(crudeDelta) >= 1 && (
                  <span className={crudeDelta > 0 ? 'text-emerald-500 ml-1' : 'text-red-500 ml-1'}>
                    ({crudeDelta >= 0 ? '+' : ''}{crudeDelta.toFixed(0)}%)
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
            Rate: <span className="text-amber-400 font-semibold tabular-nums">+{formatNumber(productionRate)}/s</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            Value: <span className="text-crude-400 font-semibold tabular-nums">${formatCommas(totalCrudeValue)}</span>
          </span>
        </div>

        <button
          onClick={handleSellCrude}
          disabled={crudeOil < 1}
          className={cn(
            'w-full py-2 rounded-lg text-xs font-bold transition-all',
            crudeOil >= 1
              ? isBoom
                ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/40 active:scale-[0.97] animate-pulse'
                : 'bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30 active:scale-[0.97]'
              : 'bg-oil-800/30 text-muted-foreground/40 cursor-not-allowed'
          )}
        >
          {crudeOil >= 1
            ? isBoom
              ? `🔥 Sell Now — +$${formatCommas(totalCrudeValue)}`
              : `Sell All Crude — +$${formatCommas(totalCrudeValue)}`
            : 'No crude to sell'}
        </button>
      </div>

      {/* ── Refined Oil Card ───────────────────────────────────────────── */}
      {(refinedOil > 0.1 || refineryRate > 0) && (
        <div className="bg-oil-800/50 rounded-lg p-3 border border-oil-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚗️</span>
              <div>
                <div className="text-xs font-semibold text-sky-300">Refined Oil</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  ${effectiveRefinedRate.toFixed(2)}/bbl
                  {Math.abs(refinedDelta) >= 1 && (
                    <span className={refinedDelta > 0 ? 'text-emerald-500 ml-1' : 'text-red-500 ml-1'}>
                      ({refinedDelta >= 0 ? '+' : ''}{refinedDelta.toFixed(0)}%)
                    </span>
                  )}
                </div>
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
                ? isBoom
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/40 active:scale-[0.97] animate-pulse'
                  : 'bg-sky-900/30 text-sky-300 border border-sky-800/40 hover:bg-sky-900/50 active:scale-[0.97]'
                : 'bg-oil-800/30 text-muted-foreground/40 cursor-not-allowed'
            )}
          >
            {refinedOil >= 1
              ? isBoom
                ? `🔥 Sell Now — +$${formatCommas(totalRefinedValue)}`
                : `Sell All Refined — +$${formatCommas(totalRefinedValue)}`
              : 'Refinery processing…'}
          </button>
        </div>
      )}

      {productionRate === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Build oil wells on your unlocked plots to start producing.</p>
        </div>
      )}
    </div>
  )
}
