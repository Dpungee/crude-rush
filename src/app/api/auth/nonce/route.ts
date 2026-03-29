import { NextResponse } from 'next/server'
import { generateNonce } from '@/lib/wallet-auth'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { storeNonce, createSignedNonce } from '@/lib/nonce-store'

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json()

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'Missing publicKey' }, { status: 400 })
    }

    // Basic format check: Solana public keys are 32–44 base58 chars
    if (publicKey.length < 32 || publicKey.length > 44) {
      return NextResponse.json({ error: 'Invalid publicKey format' }, { status: 400 })
    }

    const randomPart = generateNonce()

    // On serverless without Supabase, use self-verifying signed nonces
    // so the verify lambda can validate without shared state.
    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME
    if (!isSupabaseConfigured() && isServerless) {
      const signedNonce = createSignedNonce(publicKey, randomPart)
      return NextResponse.json({ nonce: signedNonce })
    }

    await storeNonce(publicKey, randomPart)
    return NextResponse.json({ nonce: randomPart })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
