/**
 * Nonce Store — triple-mode:
 *   1. Supabase (production with DB) — persisted in `nonces` table
 *   2. Signed/stateless (production without DB) — HMAC-signed nonces
 *   3. In-memory (local dev) — simple Map on a long-running process
 *
 * WHY THIS MATTERS ON SERVERLESS:
 * Vercel may route the nonce request to lambda A and the verify request to
 * lambda B. An in-memory Map on process A is invisible to process B.
 *
 * The signed/stateless mode solves this: the nonce itself contains all the
 * information needed to verify it (public key + expiry + HMAC signature).
 * No shared state required between lambda instances.
 *
 * Required SQL for Supabase mode (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS nonces (
 *     public_key  TEXT        PRIMARY KEY,
 *     nonce       TEXT        NOT NULL,
 *     expires_at  TIMESTAMPTZ NOT NULL
 *   );
 */

import crypto from 'crypto'
import { isSupabaseConfigured, getServiceSupabase } from './supabase-server'

// ── In-memory fallback (local dev only) ───────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __nonceStore: Map<string, { nonce: string; expiresAt: number }> | undefined
}
const memStore = (global.__nonceStore ??= new Map<string, { nonce: string; expiresAt: number }>())

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of memStore) {
    if (value.expiresAt < now) memStore.delete(key)
  }
}, 60_000)

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Signed nonce helpers (serverless without Supabase) ────────────────────────
let _ephemeralHmacKey: string | null = null

function getHmacKey(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production for signed nonces.')
  }

  // Dev: ephemeral per-process key. No hardcoded fallback.
  if (!_ephemeralHmacKey) {
    _ephemeralHmacKey = crypto.randomBytes(32).toString('hex')
    console.warn('[nonce] Using ephemeral HMAC key — set JWT_SECRET in .env.local')
  }
  return _ephemeralHmacKey
}

/** Create a self-verifying nonce: random.expiry.hmac */
function createSignedNonce(publicKey: string, randomPart: string): string {
  const expiry = Date.now() + NONCE_TTL_MS
  const payload = `${randomPart}.${expiry}`
  const hmac = crypto
    .createHmac('sha256', getHmacKey())
    .update(`${publicKey}.${payload}`)
    .digest('hex')
    .slice(0, 16)
  return `${payload}.${hmac}`
}

/** Verify a signed nonce — returns the random part if valid, null otherwise */
function verifySignedNonce(publicKey: string, nonce: string): string | null {
  const parts = nonce.split('.')
  if (parts.length !== 3) return null
  const [randomPart, expiryStr, sig] = parts
  const expiry = Number(expiryStr)
  if (isNaN(expiry) || expiry < Date.now()) return null
  const expectedHmac = crypto
    .createHmac('sha256', getHmacKey())
    .update(`${publicKey}.${randomPart}.${expiryStr}`)
    .digest('hex')
    .slice(0, 16)
  if (sig !== expectedHmac) return null
  return randomPart
}

function isServerless(): boolean {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function storeNonce(publicKey: string, nonce: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceSupabase()
    await supabase.from('nonces').upsert(
      {
        public_key: publicKey,
        nonce,
        expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
      },
      { onConflict: 'public_key' }
    )
  } else if (!isServerless()) {
    memStore.set(publicKey, { nonce, expiresAt: Date.now() + NONCE_TTL_MS })
  }
  // Signed mode: nothing to store — nonce is self-verifying
}

export async function getNonce(publicKey: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceSupabase()
    const { data } = await supabase
      .from('nonces')
      .select('nonce, expires_at')
      .eq('public_key', publicKey)
      .single()

    if (!data) return null
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await supabase.from('nonces').delete().eq('public_key', publicKey)
      return null
    }
    return data.nonce
  } else if (!isServerless()) {
    const entry = memStore.get(publicKey)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      memStore.delete(publicKey)
      return null
    }
    return entry.nonce
  }
  // Signed mode: should not be called — verify uses verifySignedNonce
  return null
}

export async function clearNonce(publicKey: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceSupabase()
    await supabase.from('nonces').delete().eq('public_key', publicKey)
  } else if (!isServerless()) {
    memStore.delete(publicKey)
  }
  // Signed mode: stateless — nothing to clear
}

export { createSignedNonce, verifySignedNonce }
