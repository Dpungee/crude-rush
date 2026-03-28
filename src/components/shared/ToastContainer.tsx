'use client'

import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const typeStyles = {
  success: 'bg-petro-green/20 border-petro-green/40 text-petro-green',
  error: 'bg-flame/20 border-flame/40 text-flame',
  info: 'bg-petro-blue/20 border-petro-blue/40 text-petro-blue',
  reward: 'bg-crude/20 border-crude/40 text-crude-400',
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'px-4 py-2.5 rounded-lg border text-sm font-semibold shadow-lg backdrop-blur-sm',
            'animate-in slide-in-from-right-5 fade-in duration-200',
            typeStyles[toast.type]
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
