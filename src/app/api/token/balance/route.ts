import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { MAX_CLAIMS_PER_DAY } from '@/lib/solana'

export async function GET(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const supabase = getServiceSupabase()

    // Run all queries in parallel
    const [
      { data: unsettled, error: unsettledError },
      { data: allLedger },
      { data: cooldown },
    ] = await Promise.all([
      supabase
        .from('token_ledger')
        .select('amount')
        .eq('wallet_address', walletAddress)
        .eq('settled', false),

      supabase
        .from('token_ledger')
        .select('amount')
        .eq('wallet_address', walletAddress),

      supabase
        .from('claim_cooldowns')
        .select('last_claim_at, claim_count_24h')
        .eq('wallet_address', walletAddress)
        .single(),
    ])

    if (unsettledError) {
      return NextResponse.json({ error: 'Failed to load balance' }, { status: 500 })
    }

    // BigInt arithmetic prevents precision loss on large balances.
    // Convert to string for JSON — client parses as BigInt or number as needed.
    const balance = (unsettled || []).reduce(
      (sum, row) => sum + BigInt(Math.round(row.amount ?? 0)),
      0n
    )
    const totalEarned = (allLedger || []).reduce(
      (sum, row) => sum + BigInt(Math.round(row.amount ?? 0)),
      0n
    )

    // Cooldown status
    let cooldownExpiresAt: string | null = null
    let claimsRemainingToday = MAX_CLAIMS_PER_DAY

    if (cooldown) {
      const lastClaim = new Date(cooldown.last_claim_at)
      const hoursSince = (Date.now() - lastClaim.getTime()) / 3_600_000

      if (hoursSince < 24 && (cooldown.claim_count_24h ?? 0) >= MAX_CLAIMS_PER_DAY) {
        const msUntil = lastClaim.getTime() + 24 * 3_600_000
        cooldownExpiresAt = new Date(msUntil).toISOString()
        claimsRemainingToday = 0
      } else if (hoursSince < 24) {
        claimsRemainingToday = Math.max(0, MAX_CLAIMS_PER_DAY - (cooldown.claim_count_24h ?? 0))
      }
    }

    return NextResponse.json({
      balance: balance.toString(),
      totalEarned: totalEarned.toString(),
      cooldownExpiresAt,
      claimsRemainingToday,
    })
  } catch (error) {
    console.error('Token balance error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
