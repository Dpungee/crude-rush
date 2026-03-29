import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// ── JWT Secret ─────────────────────────────────────────────────────────────────
// SECURITY: Never falls back to a hardcoded secret. If JWT_SECRET is not set,
// we generate a per-process ephemeral secret. This means JWTs won't survive
// server restarts in dev, but it's infinitely better than a known default that
// an attacker could use to forge tokens.
let _ephemeralSecret: string | null = null

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) {
    if (secret.length < 32 && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be at least 32 characters in production.')
    }
    return secret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.')
  }

  // Dev mode: generate a random ephemeral secret per process.
  // JWTs won't survive restarts, but there's no hardcoded secret to exploit.
  if (!_ephemeralSecret) {
    _ephemeralSecret = crypto.randomBytes(48).toString('hex')
    console.warn(
      '[auth] ⚠️  JWT_SECRET not set — using ephemeral per-process secret. ' +
        'JWTs will not survive server restarts. Set JWT_SECRET in .env.local.'
    )
  }
  return _ephemeralSecret
}

const JWT_EXPIRES_IN = '24h'

export interface CrudeRushJWT {
  sub: string  // wallet address
  iat: number
  exp: number
}

/** The exact message players sign with Phantom to authenticate */
export function createSignMessage(nonce: string): string {
  return `Sign in to Crude Rush\n\nThis confirms your wallet ownership.\nNonce: ${nonce}`
}

/** Generate a cryptographically random 64-char hex nonce */
export function generateNonce(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Sign a JWT for the given wallet address */
export function signJWT(walletAddress: string): string {
  return jwt.sign({ sub: walletAddress }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

/** Verify a JWT and return the wallet address, or null if invalid/expired */
export function verifyJWT(token: string): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as CrudeRushJWT
    return payload.sub
  } catch {
    return null
  }
}
