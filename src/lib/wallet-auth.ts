/**
 * Wallet authentication helpers.
 *
 * MVP auth flow:
 * 1. Client requests nonce from server
 * 2. User signs message with Phantom
 * 3. Client sends signature to server for verification
 * 4. Server verifies and creates/returns session
 */

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
