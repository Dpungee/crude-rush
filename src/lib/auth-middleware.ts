import { NextResponse } from 'next/server'
import { verifyJWT } from './wallet-auth'

/**
 * Extract and verify the Bearer JWT from a request.
 * Returns the wallet address if valid, otherwise sends a 401 response.
 *
 * Usage:
 *   const auth = requireAuth(request)
 *   if (auth instanceof NextResponse) return auth
 *   const { walletAddress } = auth
 */
export function requireAuth(
  request: Request
): { walletAddress: string } | NextResponse {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const walletAddress = verifyJWT(token)

  if (!walletAddress) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return { walletAddress }
}
