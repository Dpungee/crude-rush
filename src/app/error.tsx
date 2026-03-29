'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Crude Rush error:', error)
  }, [error])

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-oil-950 text-foreground p-8">
      <div className="text-5xl mb-4">💥</div>
      <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
      <pre className="text-xs text-red-300/80 bg-red-950/30 border border-red-900/50 rounded-lg p-4 max-w-lg overflow-auto mb-4 whitespace-pre-wrap">
        {error.message}
        {error.stack && '\n\n' + error.stack.split('\n').slice(0, 5).join('\n')}
      </pre>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-crude-600 text-oil-950 font-bold rounded-lg hover:bg-crude-500 transition-all"
      >
        Try Again
      </button>
    </div>
  )
}
