import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// ── In-process leaderboard cache ──────────────────────────────────────────────
// Problem: 10,000 users viewing the leaderboard every 30s = 333 identical
// DB queries/sec, each sorting the entire players table. That's pure waste.
//
// Fix #1 — In-process module-level cache (60s TTL):
//   Each lambda instance caches its own copy. On Vercel with ~10 warm instances
//   this means at most 10 DB queries per 60s instead of 333/sec. Good enough.
//
// Fix #2 — Cache-Control: s-maxage=30, stale-while-revalidate=60:
//   Vercel's edge CDN will cache the response and serve it from the edge
//   for 30s, then serve stale while revalidating in the background for 60s.
//   In practice this means 1 DB query per 30s globally, not 333/sec.
//   These two layers combined make the leaderboard essentially free at 10K users.
interface LeaderboardCache {
  data: LeaderboardEntry[]
  fetchedAt: number
}

interface LeaderboardEntry {
  walletAddress: string
  displayName: string | null
  totalBarrels: number
  empireValue: number
  prestigeLevel: number
  rankBarrels: number
  rankEmpire: number
}

const CACHE_TTL_MS = 60_000 // 60 seconds in-process

// Anchored to `global` so Next.js HMR reloads in dev don't clear it
declare global {
  // eslint-disable-next-line no-var
  var __leaderboardCache: LeaderboardCache | undefined
}
const cache = (() => {
  const holder: { current: LeaderboardCache | null } = { current: null }
  return {
    get: () => holder.current,
    set: (data: LeaderboardEntry[]) => {
      holder.current = { data, fetchedAt: Date.now() }
      // Also store on global for dev HMR persistence
      ;(global as Record<string, unknown>).__leaderboardCache = holder.current
    },
  }
})()

// Restore from global on module init (survives HMR in dev)
if (global.__leaderboardCache) {
  cache.set(global.__leaderboardCache.data)
}

export async function GET() {
  try {
    // ── Serve from cache if fresh ────────────────────────────────────────
    const cached = cache.get()
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        { leaderboard: cached.data },
        {
          headers: {
            // Edge CDN: serve fresh for 30s, stale-while-revalidate for 60s
            // This means Vercel edge serves 0 DB queries during the s-maxage window
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        }
      )
    }

    // ── Fetch from DB ────────────────────────────────────────────────────
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('players')
      .select('wallet_address, display_name, lifetime_barrels, prestige_level, lifetime_petrodollars')
      .order('lifetime_barrels', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Leaderboard error:', error)
      // If we have stale cache, serve it rather than returning an error
      if (cached) {
        return NextResponse.json(
          { leaderboard: cached.data },
          { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' } }
        )
      }
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
    }

    const leaderboard: LeaderboardEntry[] = (data || []).map((row, index) => ({
      walletAddress: row.wallet_address,
      displayName: row.display_name,
      totalBarrels: row.lifetime_barrels || 0,
      empireValue: row.lifetime_petrodollars || 0,
      prestigeLevel: row.prestige_level || 0,
      rankBarrels: index + 1,
      rankEmpire: 0, // calculated client-side for now
    }))

    cache.set(leaderboard)

    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
