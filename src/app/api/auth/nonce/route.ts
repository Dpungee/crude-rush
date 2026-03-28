import { NextResponse } from 'next/server'
import { generateNonce } from '@/lib/wallet-auth'

// In-memory nonce store (replace with Redis/Supabase in production)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

// Clean expired nonces periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of nonceStore) {
    if (value.expiresAt < now) nonceStore.delete(key)
  }
}, 60_000)

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json()

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'Missing publicKey' }, { status: 400 })
    }

    const nonce = generateNonce()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    nonceStore.set(publicKey, { nonce, expiresAt })

    return NextResponse.json({ nonce })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Exported for use by the verify route */
export function getNonce(publicKey: string): string | null {
  const entry = nonceStore.get(publicKey)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(publicKey)
    return null
  }
  return entry.nonce
}

export function clearNonce(publicKey: string) {
  nonceStore.delete(publicKey)
}
