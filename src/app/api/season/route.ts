import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { DEFAULT_REWARD_TIERS } from '@/engine/season'

/**
 * GET /api/season
 * Returns current season info + player's season entry if authenticated.
 */
export async function GET(request: Request) {
  // Auth is optional for season info
  const auth = requireAuth(request)
  const walletAddress = auth instanceof NextResponse ? null : auth.walletAddress

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ season: null, myEntry: null, rewards: DEFAULT_REWARD_TIERS })
  }

  try {
    const supabase = getServiceSupabase()

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single()

    if (!season) {
      return NextResponse.json({ season: null, myEntry: null, rewards: DEFAULT_REWARD_TIERS })
    }

    const timeRemainingMs = Math.max(0, new Date(season.ends_at).getTime() - Date.now())

    // Get player's entry if authenticated
    let myEntry = null
    let myRank = null

    if (walletAddress) {
      const { data: entry } = await supabase
        .from('season_entries')
        .select('*')
        .eq('season_id', season.id)
        .eq('wallet_address', walletAddress)
        .single()

      if (entry) {
        // Get rank: count players with higher score + 1
        const { count } = await supabase
          .from('season_entries')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', season.id)
          .gt('score', entry.score)

        myRank = (count ?? 0) + 1
        myEntry = {
          score: entry.score,
          rank: myRank,
          seasonBarrels: entry.season_barrels,
          seasonPetrodollars: entry.season_petrodollars,
          seasonTilesUnlocked: entry.season_tiles_unlocked,
          seasonUpgradesBought: entry.season_upgrades_bought,
          seasonPrestiges: entry.season_prestiges,
        }
      }
    }

    return NextResponse.json({
      season: {
        id: season.id,
        seasonNumber: season.season_number,
        startsAt: season.starts_at,
        endsAt: season.ends_at,
        timeRemainingMs,
        status: season.status,
      },
      myEntry,
      rewards: DEFAULT_REWARD_TIERS,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch (error) {
    console.error('[season] Error:', error)
    return NextResponse.json({ season: null, myEntry: null, rewards: DEFAULT_REWARD_TIERS })
  }
}
