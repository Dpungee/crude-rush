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

    // ── Fetch unreserved, unsettled ledger rows ─────────────────────
    const { data: ledger, error: ledgerError } = await supabase
      .from('token_ledger')
      .select('id, amount')
      .eq('wallet_address', walletAddress)
      .eq('settled', false)
      .is('reserved_by_claim_id', null)  // only unreserved rows

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

    // ── Create pending claim record FIRST (gets us the claim ID) ─────
    const ledgerIds = ledger.map((r) => r.id)
    const { data: claim, error: claimInsertErr } = await supabase
      .from('on_chain_claims')
      .insert({
        wallet_address: walletAddress,
        amount: totalAmount.toString(),
        status: 'pending',
        ledger_ids: ledgerIds,
      })
      .select('id')
      .single()

    if (claimInsertErr || !claim) {
      return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 })
    }

    // ── ATOMIC RESERVATION: mark ledger rows as reserved ─────────────
    // This UPDATE with WHERE conditions ensures no row can be reserved
    // by two claims simultaneously. If another claim grabbed them first,
    // the update affects 0 rows and we detect the mismatch.
    const nowIso = now.toISOString()
    const { data: reserved, error: reserveErr } = await supabase
      .from('token_ledger')
      .update({ reserved_by_claim_id: claim.id, reserved_at: nowIso })
      .in('id', ledgerIds)
      .eq('wallet_address', walletAddress)
      .eq('settled', false)
      .is('reserved_by_claim_id', null)  // only grab unreserved rows
      .select('id')

    if (reserveErr || !reserved || reserved.length !== ledgerIds.length) {
      // Reservation failed — some rows were grabbed by another claim.
      // Mark our claim as failed and clean up.
      await supabase.from('on_chain_claims').update({ status: 'failed' }).eq('id', claim.id)
      if (reserved && reserved.length > 0) {
        // Release any rows we did manage to reserve
        await supabase.from('token_ledger')
          .update({ reserved_by_claim_id: null, reserved_at: null })
          .eq('reserved_by_claim_id', claim.id)
      }
      return NextResponse.json(
        { error: 'Claim conflict — some rewards were already claimed. Try again.' },
        { status: 409 }
      )
    }

    // ── Build partially-signed transaction ───────────────────────────
    const playerKey = new PublicKey(walletAddress)
    let txBase64: string
    try {
      txBase64 = await buildClaimTransaction(playerKey, totalAmount)
    } catch (txErr) {
      // Transaction build failed — release reservations
      await supabase.from('token_ledger')
        .update({ reserved_by_claim_id: null, reserved_at: null })
        .eq('reserved_by_claim_id', claim.id)
      await supabase.from('on_chain_claims').update({ status: 'failed' }).eq('id', claim.id)
      throw txErr
    }

    // Store the transaction on the claim
    await supabase.from('on_chain_claims')
      .update({ transaction_b64: txBase64 })
      .eq('id', claim.id)

    // ── Update rate limit (sliding window) ───────────────────────────
    const newCount = cooldown
      ? ((now.getTime() - new Date(cooldown.last_claim_at).getTime()) / 3_600_000 >= 24
        ? 1
        : (cooldown.claim_count_24h ?? 0) + 1)
      : 1

    await supabase.from('claim_cooldowns').upsert(
      {
        wallet_address: walletAddress,
        last_claim_at: nowIso,
        claim_count_24h: newCount,
        window_start: cooldown && newCount > 1
          ? cooldown.window_start ?? cooldown.last_claim_at
          : nowIso,
      },
      { onConflict: 'wallet_address' }
    )

    // ── Audit log ────────────────────────────────────────────────────
    await supabase.from('token_audit_log').insert({
      wallet_address: walletAddress,
      action: 'claim_initiated',
      amount: Number(totalAmount),
      reference_id: claim.id,
      metadata: { ledgerEntryCount: ledgerIds.length, reservedCount: reserved.length },
    })

    return NextResponse.json({
      transaction: txBase64,
      amount: totalAmount.toString(),
      claimId: claim.id,
      ledgerIds,
    })
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json({ error: 'Failed to build claim transaction' }, { status: 500 })
  }
}
