import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client (uses anon key, respects RLS).
 *
 * IMPORTANT: This client is for the BROWSER only. Server routes must use
 * getServiceSupabase() from supabase-server.ts which uses the service role key.
 *
 * Lazy-initialized to avoid crashing at import time if env vars are missing.
 * Currently unused — all DB access goes through server API routes — but kept
 * as a safe export in case client-side reads are needed later.
 */
let _client: SupabaseClient | null = null

export function getClientSupabase(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    )
  }

  _client = createClient(url, anonKey)
  return _client
}

/** @deprecated Use getClientSupabase() — this eager init crashes when env vars are missing */
export const supabase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : (null as unknown as SupabaseClient)
