import { NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { createSignMessage, signJWT } from '@/lib/wallet-auth'
import { getServiceSupabase } from '@/lib/supabase-server'
import { getNonce, clearNonce } from '../nonce/route'

export async function POST(request: Request) {
  try {
    const { publicKey, signature, nonce } = await request.json()

    if (!publicKey || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing publicKey, signature, or nonce' },
        { status: 400 }
      )
    }

    // Verify the nonce matches and hasn't expired
    const storedNonce = getNonce(publicKey)
    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 })
    }

    // Verify the signature cryptographically
    const message = createSignMessage(nonce)
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = bs58.decode(publicKey)

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Mark nonce as used — single-use, replay protection
    clearNonce(publicKey)

    const supabase = getServiceSupabase()
    const today = new Date().toISOString().split('T')[0]

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('wallet_address', publicKey)
      .single()

    let loginStreak = 1

    if (existingPlayer) {
      const lastLogin = existingPlayer.last_login_date
      if (lastLogin) {
        const diffDays = Math.floor(
          (new Date(today).getTime() - new Date(lastLogin).getTime()) / 86_400_000
        )
        if (diffDays === 1) loginStreak = (existingPlayer.login_streak || 0) + 1
        else if (diffDays === 0) loginStreak = existingPlayer.login_streak || 1
      }

      await supabase
        .from('players')
        .update({ last_seen_at: new Date().toISOString(), last_login_date: today, login_streak: loginStreak })
        .eq('wallet_address', publicKey)
    } else {
      await supabase.from('players').insert({
        wallet_address: publicKey,
        last_seen_at: new Date().toISOString(),
        last_login_date: today,
        login_streak: 1,
      })
      await supabase.from('game_states').insert({ wallet_address: publicKey })
    }

    // Issue signed JWT — all subsequent API calls use this as Bearer token
    const token = signJWT(publicKey)

    return NextResponse.json({
      success: true,
      token,
      walletAddress: publicKey,
      loginStreak,
      isNewPlayer: !existingPlayer,
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
