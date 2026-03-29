import { NextResponse } from 'next/server'
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase-server'

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ events: [] })
  }

  try {
    const supabase = getServiceSupabase()
    const now = new Date().toISOString()

    const { data: events } = await supabase
      .from('global_events')
      .select('id, name, description, emoji, starts_at, ends_at, modifiers')
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('starts_at', { ascending: false })

    return NextResponse.json(
      { events: events ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    )
  } catch {
    return NextResponse.json({ events: [] })
  }
}
