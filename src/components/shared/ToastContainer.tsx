'use client'

import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const typeStyles = {
  success: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
  error: 'bg-red-950/80 border-red-500/40 text-red-300',
  info: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
  reward: 'bg-crude-950/80 border-crude-500/50 text-crude-300',
}

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  reward: '✦',
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-xs pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'px-4 py-2.5 rounded-lg border text-sm font-semibold shadow-xl backdrop-blur-md',
            'toast-enter pointer-events-auto',
            typeStyles[toast.type]
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0',
              toast.type === 'success' && 'bg-emerald-500/20',
              toast.type === 'error' && 'bg-red-500/20',
              toast.type === 'info' && 'bg-sky-500/20',
              toast.type === 'reward' && 'bg-crude-500/20 text-crude-400',
            )}>
              {typeIcons[toast.type]}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
