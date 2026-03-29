import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'

// ── In-process cache (same pattern as existing leaderboard route) ─────────────
let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL_MS = 30_000

export async function GET() {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ seasonNumber: 0, endsAt: null, leaderboard: [] })
  }

  try {
    const supabase = getServiceSupabase()

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, season_number, ends_at')
      .eq('status', 'active')
      .single()

    if (!season) {
      return NextResponse.json({ seasonNumber: 0, endsAt: null, leaderboard: [] })
    }

    // Top 100 by score
    const { data: entries } = await supabase
      .from('season_entries')
      .select('wallet_address, score, season_barrels, season_prestiges')
      .eq('season_id', season.id)
      .gt('score', 0)
      .order('score', { ascending: false })
      .limit(100)

    if (!entries?.length) {
      const result = { seasonNumber: season.season_number, endsAt: season.ends_at, leaderboard: [] }
      cache = { data: result, ts: Date.now() }
      return NextResponse.json(result)
    }

    // Fetch display names for these wallets
    const wallets = entries.map((e) => e.wallet_address)
    const { data: players } = await supabase
      .from('players')
      .select('wallet_address, display_name, prestige_level')
      .in('wallet_address', wallets)

    const playerMap = new Map(players?.map((p) => [p.wallet_address, p]) ?? [])

    const leaderboard = entries.map((e, i) => {
      const player = playerMap.get(e.wallet_address)
      return {
        rank: i + 1,
        walletAddress: e.wallet_address,
        displayName: player?.display_name ?? null,
        score: e.score,
        seasonBarrels: e.season_barrels,
        seasonPrestiges: e.season_prestiges,
        prestigeLevel: player?.prestige_level ?? 0,
      }
    })

    const result = {
      seasonNumber: season.season_number,
      endsAt: season.ends_at,
      leaderboard,
    }

    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('[season/leaderboard] Error:', error)
    if (cache) return NextResponse.json(cache.data)
    return NextResponse.json({ seasonNumber: 0, endsAt: null, leaderboard: [] })
  }
}
