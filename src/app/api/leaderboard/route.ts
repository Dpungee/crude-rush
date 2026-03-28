import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('players')
      .select('wallet_address, display_name, lifetime_barrels, prestige_level, lifetime_petrodollars')
      .order('lifetime_barrels', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Leaderboard error:', error)
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
    }

    const leaderboard = (data || []).map((row, index) => ({
      walletAddress: row.wallet_address,
      displayName: row.display_name,
      totalBarrels: row.lifetime_barrels || 0,
      empireValue: row.lifetime_petrodollars || 0,
      prestigeLevel: row.prestige_level || 0,
      rankBarrels: index + 1,
      rankEmpire: 0, // calculated client-side for now
    }))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
