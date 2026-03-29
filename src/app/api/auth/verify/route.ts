import { NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { createSignMessage, signJWT } from '@/lib/wallet-auth'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getNonce, clearNonce, verifySignedNonce } from '@/lib/nonce-store'
import { createInitialGrid } from '@/engine/prestige'
import { STARTING_PETRODOLLARS, STARTING_STORAGE } from '@/engine/constants'

export async function POST(request: Request) {
  try {
    const { publicKey, signature, nonce } = await request.json()

    if (!publicKey || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing publicKey, signature, or nonce' },
        { status: 400 }
      )
    }

    // Basic format check: Solana public keys are 32–44 base58 chars
    if (typeof publicKey !== 'string' || publicKey.length < 32 || publicKey.length > 44) {
      return NextResponse.json({ error: 'Invalid publicKey format' }, { status: 400 })
    }

    // Verify the nonce — supports both stateful (Supabase/memory) and stateless (signed) modes
    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME
    const useSignedNonce = !isSupabaseConfigured() && isServerless

    if (useSignedNonce) {
      // Stateless mode: verify the HMAC signature embedded in the nonce
      const validRandom = verifySignedNonce(publicKey, nonce)
      if (!validRandom) {
        console.error('[auth] Signed nonce invalid:', { publicKey: publicKey.slice(0, 8) })
        return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 })
      }
    } else {
      const storedNonce = await getNonce(publicKey)
      if (!storedNonce || storedNonce !== nonce) {
        console.error('[auth] Nonce mismatch:', {
          publicKey: publicKey.slice(0, 8),
          stored: !!storedNonce,
          match: storedNonce === nonce,
        })
        return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 })
      }
    }

    // Verify the signature cryptographically
    const message = createSignMessage(nonce)
    const messageBytes = new TextEncoder().encode(message)
    let signatureBytes: Uint8Array
    let publicKeyBytes: Uint8Array
    try {
      signatureBytes = bs58.decode(signature)
      publicKeyBytes = bs58.decode(publicKey)
    } catch (e) {
      console.error('[auth] Base58 decode failed:', e)
      return NextResponse.json({ error: 'Invalid signature encoding' }, { status: 401 })
    }

    console.log('[auth] Verifying:', {
      sigLen: signatureBytes.length,
      keyLen: publicKeyBytes.length,
      msgLen: messageBytes.length,
    })

    // nacl requires exactly 64-byte signature and 32-byte public key
    if (signatureBytes.length !== 64 || publicKeyBytes.length !== 32) {
      console.error('[auth] Wrong byte sizes:', {
        sigLen: signatureBytes.length,
        keyLen: publicKeyBytes.length,
      })
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 })
    }

    let isValid = false
    try {
      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    } catch (e) {
      console.error('[auth] nacl.verify threw:', e)
      return NextResponse.json({ error: 'Signature verification error' }, { status: 401 })
    }

    if (!isValid) {
      console.error('[auth] Signature invalid')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Mark nonce as used — single-use replay protection
    await clearNonce(publicKey)

    // Issue signed JWT — all subsequent API calls use this as Bearer token
    const token = signJWT(publicKey)

    // ── Dev mode: skip Supabase when not configured ──────────────────────
    if (!isSupabaseConfigured()) {
      console.warn('[dev] Supabase not configured — skipping DB operations')
      return NextResponse.json({
        success: true,
        token,
        walletAddress: publicKey,
        loginStreak: 1,
        isNewPlayer: true,
      })
    }

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
        // diffDays > 1: streak broken, reset to 1 (default above)
      }

      await supabase
        .from('players')
        .update({
          last_seen_at: new Date().toISOString(),
          last_login_date: today,
          login_streak: loginStreak,
        })
        .eq('wallet_address', publicKey)
    } else {
      // New player — insert player + fully-initialized game state in parallel.
      // CRITICAL: must insert real initial values (not an empty row) so the
      // load route never receives NULL for numeric fields.
      const [playerResult, gameResult] = await Promise.all([
        supabase.from('players').insert({
          wallet_address: publicKey,
          last_seen_at: new Date().toISOString(),
          last_login_date: today,
          login_streak: 1,
        }),
        supabase.from('game_states').insert({
          wallet_address: publicKey,
          crude_oil: 0,
          refined_oil: 0,
          petrodollars: STARTING_PETRODOLLARS,
          plots_data: createInitialGrid(),
          unlocked_tile_count: 1,
          upgrades_data: {
            extraction_speed: 0,
            storage_expansion: 0,
            refinery_efficiency: 0,
            auto_sell: 0,
            offline_duration: 0,
          },
          production_rate: 0,
          storage_capacity: STARTING_STORAGE,
          refinery_rate: 0,
          last_tick_at: new Date().toISOString(),
          version: 1,
        }),
      ])

      if (playerResult.error) console.error('[auth] Player insert error:', playerResult.error)
      if (gameResult.error) console.error('[auth] Game state insert error:', gameResult.error)
    }

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
