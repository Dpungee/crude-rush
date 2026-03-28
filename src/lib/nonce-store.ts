// In-memory nonce store (replace with Redis/Supabase in production)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

// Clean expired nonces periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of nonceStore) {
    if (value.expiresAt < now) nonceStore.delete(key)
  }
}, 60_000)

export function storeNonce(publicKey: string, nonce: string): void {
  nonceStore.set(publicKey, { nonce, expiresAt: Date.now() + 5 * 60 * 1000 })
}

export function getNonce(publicKey: string): string | null {
  const entry = nonceStore.get(publicKey)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(publicKey)
    return null
  }
  return entry.nonce
}

export function clearNonce(publicKey: string): void {
  nonceStore.delete(publicKey)
}
