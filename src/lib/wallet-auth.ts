import jwt from 'jsonwebtoken'

// ── JWT Secret ─────────────────────────────────────────────────────────────────
// Resolved lazily (inside signJWT / verifyJWT) so `next build` doesn't throw
// when collecting page data with no env vars present. Enforcement happens at
// actual request time.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Hard fail in production — never silently use an insecure default.
      throw new Error('JWT_SECRET environment variable must be set in production.')
    }
    // Warn once per process in dev
    const g = global as Record<string, unknown>
    if (!g.__jwtWarnedOnce) {
      console.warn(
        '[auth] ⚠️  JWT_SECRET not set — using insecure dev default. ' +
          'Set JWT_SECRET in .env.local before deploying.'
      )
      g.__jwtWarnedOnce = true
    }
    return 'crude-rush-dev-secret-change-in-prod'
  }
  if (secret.length < 32) {
    console.warn('[auth] ⚠️  JWT_SECRET is short (< 32 chars). Use a long random value.')
  }
  return secret
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
