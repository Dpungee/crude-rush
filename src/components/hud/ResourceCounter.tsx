'use client'

import { useRef, useEffect, useState } from 'react'
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
  const prevValueRef = useRef(value)
  const [isPopping, setIsPopping] = useState(false)

  // Detect significant value changes and trigger pop animation
  useEffect(() => {
    const prev = prevValueRef.current
    const delta = Math.abs(value - prev)
    const threshold = Math.max(prev * 0.01, 1) // 1% change or at least 1
    
    if (delta >= threshold && prev > 0) {
      setIsPopping(true)
      const timer = setTimeout(() => setIsPopping(false), 350)
      return () => clearTimeout(timer)
    }
    prevValueRef.current = value
  }, [value])

  const isStorageFull = percentage !== null && percentage >= 95
  const isStorageHigh = percentage !== null && percentage >= 75

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{emoji}</span>
      <div className="flex flex-col">
        <span className={cn(
          'text-sm font-bold tabular-nums transition-transform duration-150',
          color,
          isPopping && 'number-pop',
          isStorageFull && 'text-red-400 storage-warning'
        )}>
          {formatNumber(value)}
          {maxValue && (
            <span className={cn(
              'font-normal text-xs ml-0.5',
              isStorageFull ? 'text-red-500/70' : 'text-muted-foreground'
            )}>
              /{formatNumber(maxValue)}
            </span>
          )}
        </span>
        {percentage !== null && (
          <div className={cn(
            'w-16 h-1 rounded-full overflow-hidden',
            isStorageFull ? 'bg-red-900/50' : 'bg-oil-700'
          )}>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isStorageFull ? 'bg-red-500 production-pulse' :
                isStorageHigh ? 'bg-amber-500' :
                percentage > 50 ? 'bg-crude-400' : 'bg-emerald-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
