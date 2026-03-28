import { NextResponse } from 'next/server'
import { generateNonce } from '@/lib/wallet-auth'
import { storeNonce } from '@/lib/nonce-store'

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json()

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'Missing publicKey' }, { status: 400 })
    }

    const nonce = generateNonce()
    storeNonce(publicKey, nonce)

    return NextResponse.json({ nonce })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
