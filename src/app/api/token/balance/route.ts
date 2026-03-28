import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const supabase = getServiceSupabase()

    // Sum all unsettled ledger entries = pending claimable balance
    const { data, error } = await supabase
      .from('token_ledger')
      .select('amount')
      .eq('wallet_address', walletAddress)
      .eq('settled', false)

    if (error) {
      return NextResponse.json({ error: 'Failed to load balance' }, { status: 500 })
    }

    const balance = (data || []).reduce((sum, row) => sum + (row.amount ?? 0), 0)

    // Also fetch total ever earned (including settled)
    const { data: allData } = await supabase
      .from('token_ledger')
      .select('amount')
      .eq('wallet_address', walletAddress)

    const totalEarned = (allData || []).reduce((sum, row) => sum + (row.amount ?? 0), 0)

    return NextResponse.json({ balance, totalEarned })
  } catch (error) {
    console.error('Token balance error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
