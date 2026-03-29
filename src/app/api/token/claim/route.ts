import { NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { buildClaimTransaction } from '@/lib/treasury'
import { MIN_CLAIM_AMOUNT, MAX_CLAIMS_PER_DAY, CRUDE_TOKEN_MINT } from '@/lib/solana'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  // Token must be deployed before claims work
  if (!CRUDE_TOKEN_MINT) {
    return NextResponse.json(
      { error: 'Token not yet deployed. Claims open at TGE.' },
      { status: 503 }
    )
  }

  try {
    const supabase = getServiceSupabase()

    // ── Rate limiting (true 24h sliding window) ─────────────────────
    const now = new Date()
    const { data: cooldown } = await supabase
      .from('claim_cooldowns')
      .select('last_claim_at, claim_count_24h, window_start')
      .eq('wallet_address', walletAddress)
      .single()

    if (cooldown) {
      const lastClaim = new Date(cooldown.last_claim_at)
      const hoursSince = (now.getTime() - lastClaim.getTime()) / 3_600_000

      if (hoursSince < 24 && (cooldown.claim_count_24h ?? 0) >= MAX_CLAIMS_PER_DAY) {
        const hoursUntil = Math.ceil(24 - hoursSince)
        const expiresAt = new Date(lastClaim.getTime() + 24 * 3_600_000).toISOString()
        return NextResponse.json(
          { error: `Claim cooldown active. Try again in ${hoursUntil}h.`, cooldownExpiresAt: expiresAt },
          { status: 429 }
        )
      }
    }

    // ── Block if there's already a pending claim ────────────────────
    // Prevents race condition: user opens 2 tabs, both submit claims
    // before the first is confirmed. Without this, both would succeed
    // and the same ledger entries would be double-settled.
    const { data: pendingClaim } = await supabase
      .from('on_chain_claims')
      .select('id, created_at')
      .eq('wallet_address', walletAddress)
      .eq('status', 'pending')
      .single()

    if (pendingClaim) {
      const pendingAge = Date.now() - new Date(pendingClaim.created_at).getTime()
      if (pendingAge < 3_600_000) {
        return NextResponse.json(
          { error: 'You have a pending claim. Complete it or wait for it to expire.' },
          { status: 409 }
        )
      }
      // Stale pending claim (>1h) — mark as failed so we can proceed
      await supabase
        .from('on_chain_claims')
        .update({ status: 'failed' })
        .eq('id', pendingClaim.id)
        .eq('status', 'pending')
    }

    // ── Calculate claimable balance ──────────────────────────────────
    const { data: ledger, error: ledgerError } = await supabase
      .from('token_ledger')
      .select('id, amount')
      .eq('wallet_address', walletAddress)
      .eq('settled', false)

    if (ledgerError || !ledger?.length) {
      return NextResponse.json({ error: 'No claimable balance' }, { status: 400 })
    }

    const totalAmount = ledger.reduce((sum, row) => sum + BigInt(Math.round(row.amount ?? 0)), 0n)

    if (totalAmount < BigInt(MIN_CLAIM_AMOUNT)) {
      return NextResponse.json(
        { error: `Minimum claim is ${MIN_CLAIM_AMOUNT / 1_000_000} $CRUDE` },
        { status: 400 }
      )
    }

    // ── Build partially-signed transaction ───────────────────────────
    const playerKey = new PublicKey(walletAddress)
    const txBase64 = await buildClaimTransaction(playerKey, totalAmount)

    // ── Create pending claim record ──────────────────────────────────
    const { data: claim } = await supabase
      .from('on_chain_claims')
      .insert({
        wallet_address: walletAddress,
        amount: totalAmount.toString(),
        transaction_b64: txBase64,
        status: 'pending',
      })
      .select('id')
      .single()

    // ── Update rate limit (sliding window) ───────────────────────────
    // Use a true 24h window based on last_claim_at, not calendar day.
    const newCount = cooldown
      ? ((now.getTime() - new Date(cooldown.last_claim_at).getTime()) / 3_600_000 >= 24
        ? 1  // window expired — reset count
        : (cooldown.claim_count_24h ?? 0) + 1)
      : 1

    await supabase.from('claim_cooldowns').upsert(
      {
        wallet_address: walletAddress,
        last_claim_at: now.toISOString(),
        claim_count_24h: newCount,
        window_start: cooldown && newCount > 1
          ? cooldown.window_start ?? cooldown.last_claim_at
          : now.toISOString(),
      },
      { onConflict: 'wallet_address' }
    )

    // ── Audit log ────────────────────────────────────────────────────
    await supabase.from('token_audit_log').insert({
      wallet_address: walletAddress,
      action: 'claim_initiated',
      amount: Number(totalAmount),
      reference_id: claim?.id,
      metadata: { ledgerEntryCount: ledger.length },
    })

    return NextResponse.json({
      transaction: txBase64,
      amount: totalAmount.toString(),
      claimId: claim?.id,
      ledgerIds: ledger.map((r) => r.id),
    })
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json({ error: 'Failed to build claim transaction' }, { status: 500 })
  }
}
