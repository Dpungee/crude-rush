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

    // ── Rate limiting ────────────────────────────────────────────────────
    const now = new Date()
    const { data: cooldown } = await supabase
      .from('claim_cooldowns')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (cooldown) {
      const lastClaim = new Date(cooldown.last_claim_at)
      const hoursSince = (now.getTime() - lastClaim.getTime()) / 3_600_000

      if (hoursSince < 24 && cooldown.claim_count_24h >= MAX_CLAIMS_PER_DAY) {
        const hoursUntil = Math.ceil(24 - hoursSince)
        return NextResponse.json(
          { error: `Claim cooldown active. Try again in ${hoursUntil}h.` },
          { status: 429 }
        )
      }
    }

    // ── Calculate claimable balance ──────────────────────────────────────
    const { data: ledger, error: ledgerError } = await supabase
      .from('token_ledger')
      .select('id, amount')
      .eq('wallet_address', walletAddress)
      .eq('settled', false)

    if (ledgerError || !ledger?.length) {
      return NextResponse.json({ error: 'No claimable balance' }, { status: 400 })
    }

    const totalAmount = ledger.reduce((sum, row) => sum + BigInt(row.amount), 0n)

    if (totalAmount < BigInt(MIN_CLAIM_AMOUNT)) {
      return NextResponse.json(
        { error: `Minimum claim is ${MIN_CLAIM_AMOUNT / 1_000_000} $CRUDE` },
        { status: 400 }
      )
    }

    // ── Build partially-signed transaction ───────────────────────────────
    const playerKey = new PublicKey(walletAddress)
    const txBase64 = await buildClaimTransaction(playerKey, totalAmount)

    // ── Create pending claim record ──────────────────────────────────────
    const { data: claim } = await supabase
      .from('on_chain_claims')
      .insert({
        wallet_address: walletAddress,
        amount: totalAmount.toString(),
        status: 'pending',
      })
      .select('id')
      .single()

    // ── Update rate limit ────────────────────────────────────────────────
    await supabase.from('claim_cooldowns').upsert({
      wallet_address: walletAddress,
      last_claim_at: now.toISOString(),
      claim_count_24h: (cooldown?.claim_count_24h ?? 0) + 1,
    })

    return NextResponse.json({
      transaction: txBase64,      // base64 serialized tx for player to sign + submit
      amount: totalAmount.toString(),
      claimId: claim?.id,
      ledgerIds: ledger.map((r) => r.id), // will be marked settled on confirmation
    })
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json({ error: 'Failed to build claim transaction' }, { status: 500 })
  }
}
