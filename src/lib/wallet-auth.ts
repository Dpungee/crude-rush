import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'crude-rush-dev-secret-change-in-prod'
const JWT_EXPIRES_IN = '24h'

export interface CrudeRushJWT {
  sub: string  // wallet address
  iat: number
  exp: number
}

/** Create the sign-in message that the user will sign with their wallet */
export function createSignMessage(nonce: string): string {
  return `Sign in to Crude Rush\n\nThis confirms your wallet ownership.\nNonce: ${nonce}`
}

/** Generate a random nonce string */
export function generateNonce(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Sign a JWT for the given wallet address */
export function signJWT(walletAddress: string): string {
  return jwt.sign({ sub: walletAddress }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/** Verify a JWT and return the wallet address, or null if invalid */
export function verifyJWT(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as CrudeRushJWT
    return payload.sub
  } catch {
    return null
  }
}
