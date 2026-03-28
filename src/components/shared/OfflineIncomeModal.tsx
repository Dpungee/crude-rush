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
      <div className="bg-oil-800 border border-oil-600 rounded-2xl p-6 w-80 shadow-2xl text-center">
        <div className="text-4xl mb-3">🌙</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Welcome Back!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your wells pumped while you were away ({formatDuration(data.seconds)})
        </p>

        <div className="space-y-2 mb-6">
          {data.crude > 0 && (
            <div className="bg-oil-700/50 rounded-lg py-2 px-4">
              <span className="text-amber-400 font-bold text-lg">
                +{formatNumber(data.crude)} bbl
              </span>
              <span className="text-xs text-muted-foreground block">Crude Oil</span>
            </div>
          )}
          {data.refined > 0 && (
            <div className="bg-oil-700/50 rounded-lg py-2 px-4">
              <span className="text-petro-blue font-bold text-lg">
                +{formatNumber(data.refined)} bbl
              </span>
              <span className="text-xs text-muted-foreground block">Refined Oil</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setOfflineIncome(null)}
          className="w-full py-3 rounded-lg bg-crude-600 text-oil-950 font-bold text-sm hover:bg-crude-500 active:scale-[0.98] transition-all"
        >
          Collect & Continue
        </button>
      </div>
    </div>
  )
}
