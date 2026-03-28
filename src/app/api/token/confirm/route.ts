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

    if (!claimId || !txSignature || !Array.isArray(ledgerIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the transaction actually landed on-chain
    const connection = getConnection()
    const result = await connection.getSignatureStatus(txSignature, {
      searchTransactionHistory: true,
    })

    const status = result?.value?.confirmationStatus
    const err = result?.value?.err

    if (!status || err) {
      return NextResponse.json(
        { error: 'Transaction not confirmed or failed on-chain' },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    // Update claim record
    await supabase
      .from('on_chain_claims')
      .update({
        tx_signature: txSignature,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('wallet_address', walletAddress)

    // Mark all ledger entries as settled
    await supabase
      .from('token_ledger')
      .update({ settled: true, settled_at: new Date().toISOString() })
      .in('id', ledgerIds)
      .eq('wallet_address', walletAddress)

    return NextResponse.json({ success: true, txSignature })
  } catch (error) {
    console.error('Confirm error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
