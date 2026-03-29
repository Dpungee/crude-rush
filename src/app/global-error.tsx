'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ background: '#0c0a09', color: '#fafaf9', fontFamily: 'system-ui', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
          <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Crude Rush crashed</h2>
          <pre style={{
            background: 'rgba(127,29,29,0.2)',
            border: '1px solid rgba(127,29,29,0.5)',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '11px',
            color: '#fca5a5',
            textAlign: 'left',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            marginBottom: '1rem',
          }}>
            {error.message}
            {error.stack && '\n\n' + error.stack.split('\n').slice(0, 8).join('\n')}
          </pre>
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
