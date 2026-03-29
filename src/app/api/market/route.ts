import { NextResponse } from 'next/server'
import { generateMarketSnapshot } from '@/engine/market'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'

/**
 * GET /api/market
 *
 * Returns the current global market snapshot with event modifiers applied.
 * The base prices are deterministic (seeded PRNG from tick index).
 * Active events with sellPriceMultiplier stack multiplicatively on top.
 *
 * Cached at Vercel edge for the remainder of the current market tick.
 */
export async function GET() {
  const snapshot = generateMarketSnapshot()

  // Apply active event sell-price modifiers
  let eventSellMult = 1.0
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase()
      const now = new Date().toISOString()
      const { data: events } = await supabase
        .from('global_events')
        .select('modifiers')
        .lte('starts_at', now)
        .gt('ends_at', now)

      for (const e of events ?? []) {
        const mods = e.modifiers as Record<string, number> | null
        if (mods?.sellPriceMultiplier) {
          eventSellMult *= mods.sellPriceMultiplier
        }
      }
    } catch {
      // Non-critical — use base market prices
    }
  }

  // Apply event modifier to snapshot prices
  const adjustedSnapshot = {
    ...snapshot,
    crudeMult: Math.round(snapshot.crudeMult * eventSellMult * 1000) / 1000,
    refinedMult: Math.round(snapshot.refinedMult * eventSellMult * 1000) / 1000,
    eventSellMult: eventSellMult !== 1.0 ? eventSellMult : undefined,
  }

  // Re-classify after event adjustment
  if (adjustedSnapshot.crudeMult < 0.78) adjustedSnapshot.state = 'crash'
  else if (adjustedSnapshot.crudeMult < 0.92) adjustedSnapshot.state = 'bear'
  else if (adjustedSnapshot.crudeMult > 1.22) adjustedSnapshot.state = 'boom'
  else if (adjustedSnapshot.crudeMult > 1.08) adjustedSnapshot.state = 'bull'
  else adjustedSnapshot.state = 'stable'

  const maxAge = Math.max(1, snapshot.nextTickIn)

  return NextResponse.json(adjustedSnapshot, {
    headers: {
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=30`,
    },
  })
}
