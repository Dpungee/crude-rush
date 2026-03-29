'use client'

import { useUiStore } from '@/stores/uiStore'
import { formatNumber, formatDuration } from '@/lib/utils'

export function OfflineIncomeModal() {
  const showOfflineIncome = useUiStore((s) => s.showOfflineIncome)
  const data = useUiStore((s) => s.offlineIncomeData)
  const setOfflineIncome = useUiStore((s) => s.setOfflineIncome)

  if (!showOfflineIncome || !data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-oil-800 border border-crude-600/40 rounded-2xl p-6 w-80 shadow-2xl text-center milestone-flash">
        <div className="text-5xl mb-3 drop-shadow-[0_0_12px_rgba(212,160,23,0.4)]">🌙</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Welcome Back, Tycoon!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your empire pumped for <span className="text-crude-400 font-semibold">{formatDuration(data.seconds)}</span>
        </p>

        <div className="space-y-2.5 mb-6">
          {data.crude > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/30 rounded-lg py-3 px-4">
              <span className="text-amber-400 font-bold text-2xl tabular-nums text-glow-gold">
                +{formatNumber(data.crude)}
              </span>
              <span className="text-xs text-amber-400/60 block mt-0.5">barrels of crude oil</span>
            </div>
          )}
          {data.refined > 0 && (
            <div className="bg-sky-950/30 border border-sky-800/30 rounded-lg py-3 px-4">
              <span className="text-sky-400 font-bold text-2xl tabular-nums">
                +{formatNumber(data.refined)}
              </span>
              <span className="text-xs text-sky-400/60 block mt-0.5">barrels of refined oil</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setOfflineIncome(null)}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 font-bold text-sm hover:from-crude-500 hover:to-crude-400 active:scale-[0.97] transition-all shadow-lg shadow-crude-500/20"
        >
          Collect & Continue →
        </button>
      </div>
    </div>
  )
}
