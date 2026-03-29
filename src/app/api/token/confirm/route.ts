import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { getConnection } from '@/lib/solana'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const { claimId, txSignature, ledgerIds } = await request.json()

    if (!claimId || !txSignature || !Array.isArray(ledgerIds) || ledgerIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate txSignature format (base58, 87-88 chars)
    if (typeof txSignature !== 'string' || txSignature.length < 80 || txSignature.length > 100) {
      return NextResponse.json({ error: 'Invalid transaction signature format' }, { status: 400 })
    }

    // Cap ledgerIds to prevent abuse (no legitimate claim has 1000+ entries)
    if (ledgerIds.length > 500) {
      return NextResponse.json({ error: 'Too many ledger entries' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // ── Replay protection ─────────────────────────────────────────────────
    const { data: existingClaim } = await supabase
      .from('on_chain_claims')
      .select('id, status, tx_signature, amount')
      .eq('id', claimId)
      .eq('wallet_address', walletAddress)
      .single()

    if (!existingClaim) {
      return NextResponse.json({ error: 'Claim record not found' }, { status: 404 })
    }

    if (existingClaim.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        txSignature: existingClaim.tx_signature,
        alreadyConfirmed: true,
      })
    }

    if (existingClaim.status === 'failed') {
      return NextResponse.json(
        { error: 'This claim was previously marked as failed. Start a new claim.' },
        { status: 409 }
      )
    }

    // ── Check for tx_signature reuse (replay with someone else's tx) ────
    // A confirmed claim with this signature already exists → someone is
    // trying to replay a valid transaction to settle a different claim.
    const { data: existingSig } = await supabase
      .from('on_chain_claims')
      .select('id')
      .eq('tx_signature', txSignature)
      .eq('status', 'confirmed')
      .single()

    if (existingSig) {
      // Audit this attempt — it's likely malicious
      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'claim_failed',
        reference_id: claimId,
        metadata: { reason: 'tx_signature_reuse', txSignature, existingClaimId: existingSig.id },
      })

      return NextResponse.json(
        { error: 'Transaction signature already used for a different claim' },
        { status: 409 }
      )
    }

    // ── On-chain verification ─────────────────────────────────────────────
    const connection = getConnection()
    const result = await connection.getSignatureStatus(txSignature, {
      searchTransactionHistory: true,
    })

    const confirmStatus = result?.value?.confirmationStatus
    const txErr = result?.value?.err

    if (!confirmStatus || txErr) {
      await supabase
        .from('on_chain_claims')
        .update({ status: 'failed' })
        .eq('id', claimId)
        .eq('wallet_address', walletAddress)

      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'claim_failed',
        reference_id: claimId,
        metadata: { reason: txErr ? 'tx_error' : 'not_confirmed', txSignature, txErr },
      })

      return NextResponse.json(
        { error: 'Transaction not confirmed or failed on-chain. Please try claiming again.' },
        { status: 400 }
      )
    }

    // ── Sequential settlement (NOT parallel) ────────────────────────────
    // Step 1: Mark claim as confirmed FIRST.
    // If step 2 fails, the claim is marked confirmed but ledger isn't settled.
    // This is recoverable: a support script can re-settle based on confirmed claims.
    // The CRITICAL thing is we never have settled ledger entries for an unconfirmed claim.
    const { error: claimUpdateError } = await supabase
      .from('on_chain_claims')
      .update({
        tx_signature: txSignature,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('wallet_address', walletAddress)
      .eq('status', 'pending') // CAS guard — only update if still pending

    if (claimUpdateError) {
      console.error('[confirm] Claim update failed:', claimUpdateError)
      return NextResponse.json({ error: 'Settlement failed — try again' }, { status: 500 })
    }

    // Step 2: Settle ledger entries.
    const nowIso = new Date().toISOString()
    const { error: ledgerError } = await supabase
      .from('token_ledger')
      .update({ settled: true, settled_at: nowIso })
      .in('id', ledgerIds)
      .eq('wallet_address', walletAddress)
      .eq('settled', false) // only settle unsettled entries

    if (ledgerError) {
      // Claim is confirmed but ledger settlement failed.
      // Log for manual recovery — tokens are already on-chain.
      console.error('[confirm] Ledger settlement failed:', ledgerError)
      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'settlement',
        reference_id: claimId,
        metadata: { error: 'ledger_update_failed', txSignature, ledgerIds },
      })
    }

    // ── Audit log ──────────────────────────────────────────────────────
    await supabase.from('token_audit_log').insert({
      wallet_address: walletAddress,
      action: 'claim_confirmed',
      amount: Number(BigInt(existingClaim.amount ?? 0)),
      reference_id: claimId,
      metadata: { txSignature, ledgerCount: ledgerIds.length },
    })

    return NextResponse.json({ success: true, txSignature })
  } catch (error) {
    console.error('Confirm error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
