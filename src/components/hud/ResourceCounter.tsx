'use client'

import { formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ResourceCounterProps {
  emoji: string
  label: string
  value: number
  maxValue?: number
  color?: string
}

export function ResourceCounter({ emoji, label, value, maxValue, color = 'text-foreground' }: ResourceCounterProps) {
  const percentage = maxValue ? pct(value, maxValue) : null

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{emoji}</span>
      <div className="flex flex-col">
        <span className={cn('text-sm font-bold tabular-nums', color)}>
          {formatNumber(value)}
          {maxValue && (
            <span className="text-muted-foreground font-normal text-xs">
              /{formatNumber(maxValue)}
            </span>
          )}
        </span>
        {percentage !== null && (
          <div className="w-16 h-1 bg-oil-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                percentage > 90 ? 'bg-flame' : percentage > 60 ? 'bg-crude-400' : 'bg-petro-green'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
