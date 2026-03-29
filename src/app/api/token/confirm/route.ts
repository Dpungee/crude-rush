import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { getConnection, CRUDE_TOKEN_MINT } from '@/lib/solana'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const { claimId, txSignature } = await request.json()

    if (!claimId || !txSignature) {
      return NextResponse.json({ error: 'Missing claimId or txSignature' }, { status: 400 })
    }

    // Validate txSignature format (base58, 87-88 chars)
    if (typeof txSignature !== 'string' || txSignature.length < 80 || txSignature.length > 100) {
      return NextResponse.json({ error: 'Invalid transaction signature format' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // ── Replay protection ─────────────────────────────────────────────────
    const { data: existingClaim } = await supabase
      .from('on_chain_claims')
      .select('id, status, tx_signature, amount, ledger_ids')
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

    // ── On-chain verification — FULL transaction inspection ──────────────
    // We don't just check if the tx exists — we verify it actually transferred
    // the correct amount of $CRUDE to the player's wallet from our treasury.
    const connection = getConnection()

    let parsedTx
    try {
      parsedTx = await connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      })
    } catch (rpcErr) {
      console.error('[confirm] RPC error fetching tx:', rpcErr)
      return NextResponse.json(
        { error: 'Unable to verify transaction on-chain. Try again.' },
        { status: 503 }
      )
    }

    if (!parsedTx || parsedTx.meta?.err) {
      await supabase
        .from('on_chain_claims')
        .update({ status: 'failed' })
        .eq('id', claimId)
        .eq('wallet_address', walletAddress)

      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'claim_failed',
        reference_id: claimId,
        metadata: { reason: parsedTx?.meta?.err ? 'tx_error' : 'not_found', txSignature, err: parsedTx?.meta?.err },
      })

      return NextResponse.json(
        { error: 'Transaction not confirmed or failed on-chain. Please try claiming again.' },
        { status: 400 }
      )
    }

    // ── Verify the actual transfer details ────────────────────────────
    // Parse the SPL token transfer instruction to confirm:
    // 1. It's a transfer of our $CRUDE token mint
    // 2. The destination is the player's wallet (or their ATA)
    // 3. The amount matches what we expect
    const claimAmountBigInt = BigInt(existingClaim.amount ?? 0)
    let transferVerified = false

    if (CRUDE_TOKEN_MINT && parsedTx.meta?.postTokenBalances && parsedTx.meta?.preTokenBalances) {
      const mintAddress = CRUDE_TOKEN_MINT.toBase58()
      const pre = parsedTx.meta.preTokenBalances
      const post = parsedTx.meta.postTokenBalances

      // Find the player's token account that received $CRUDE
      for (const postBal of post) {
        if (postBal.mint !== mintAddress) continue
        if (postBal.owner !== walletAddress) continue

        // Find matching pre-balance
        const preBal = pre.find(
          (p) => p.accountIndex === postBal.accountIndex && p.mint === mintAddress
        )
        const preAmount = BigInt(preBal?.uiTokenAmount?.amount ?? '0')
        const postAmount = BigInt(postBal.uiTokenAmount?.amount ?? '0')
        const delta = postAmount - preAmount

        // Allow small rounding tolerance (±1 micro-token)
        if (delta >= claimAmountBigInt - 1n && delta <= claimAmountBigInt + 1n) {
          transferVerified = true
          break
        }
      }
    }

    if (!transferVerified && CRUDE_TOKEN_MINT) {
      // The transaction exists and succeeded, but it didn't transfer
      // the right amount of $CRUDE to this player. Suspicious.
      await supabase
        .from('on_chain_claims')
        .update({ status: 'failed' })
        .eq('id', claimId)
        .eq('wallet_address', walletAddress)

      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'claim_failed',
        reference_id: claimId,
        metadata: {
          reason: 'transfer_mismatch',
          txSignature,
          expectedAmount: existingClaim.amount,
          expectedRecipient: walletAddress,
        },
      })

      return NextResponse.json(
        { error: 'Transaction does not contain the expected token transfer.' },
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

    // Step 2: Settle reserved ledger entries using SERVER-STORED IDs.
    // We never trust the client's ledger IDs — use the claim's ledger_ids.
    const serverLedgerIds: string[] = existingClaim.ledger_ids ?? []
    const nowIso = new Date().toISOString()

    if (serverLedgerIds.length > 0) {
      const { error: ledgerError } = await supabase
        .from('token_ledger')
        .update({ settled: true, settled_at: nowIso, reserved_by_claim_id: claimId })
        .in('id', serverLedgerIds)
        .eq('wallet_address', walletAddress)
        .eq('settled', false)

      if (ledgerError) {
        console.error('[confirm] Ledger settlement failed:', ledgerError)
        await supabase.from('token_audit_log').insert({
          wallet_address: walletAddress,
          action: 'settlement',
          reference_id: claimId,
          metadata: { error: 'ledger_update_failed', txSignature, ledgerCount: serverLedgerIds.length },
        })
      }
    }

    // ── Audit log ──────────────────────────────────────────────────────
    await supabase.from('token_audit_log').insert({
      wallet_address: walletAddress,
      action: 'claim_confirmed',
      amount: Number(BigInt(existingClaim.amount ?? 0)),
      reference_id: claimId,
      metadata: { txSignature, ledgerCount: serverLedgerIds.length },
    })

    return NextResponse.json({ success: true, txSignature })
  } catch (error) {
    console.error('Confirm error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
