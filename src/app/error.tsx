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
    // Log to console only — never expose stack traces to users in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Crude Rush error:', error)
    }
  }, [error])

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-oil-950 text-foreground p-8">
      <div className="text-5xl mb-4">🛢️</div>
      <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
        An unexpected error occurred. Try reloading.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-crude-600 text-oil-950 font-bold rounded-lg hover:bg-crude-500 transition-all"
      >
        Try Again
      </button>
    </div>
  )
}
