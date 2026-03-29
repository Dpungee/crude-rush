'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ background: '#0c0a09', color: '#fafaf9', fontFamily: 'system-ui', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', margin: '6rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛢️</div>
          <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Try reloading.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              background: '#ca8a04',
              color: '#0c0a09',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
