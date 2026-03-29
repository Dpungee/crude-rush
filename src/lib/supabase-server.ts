import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Connection pooler (CRITICAL for scale) ────────────────────────────────────
// At >200 concurrent users, Supabase's direct Postgres port (5432) hits its
// connection limit and starts rejecting requests with "too many clients".
//
// The fix: use Supabase's built-in PgBouncer pooler (transaction mode).
// It accepts thousands of virtual connections and multiplexes them over a
// small pool (~20) of real Postgres connections.
//
// To enable:
//   1. In your Supabase dashboard → Settings → Database → Connection pooling
//   2. Copy the "Transaction mode" connection string (port 6543)
//      It looks like: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
//   3. Set SUPABASE_DB_POOLER_URL in your .env.local and Vercel project env vars
//
// The @supabase/supabase-js client works identically with the pooler URL —
// no code changes in individual routes needed.
//
// Without this env var set, we fall back to the direct URL (fine for dev/staging).
const supabasePoolerUrl = process.env.SUPABASE_DB_POOLER_URL

// ── Singleton client ───────────────────────────────────────────────────────────
// On Vercel each lambda instance keeps its own singleton — that's fine.
// Do NOT create a new client per request; it exhausts connection limits
// and adds ~5ms connection overhead per API call.
let _serviceClient: SupabaseClient | null = null

/** Returns true when Supabase env vars are configured */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey)
}

/**
 * Server-side Supabase client (singleton).
 * Uses service role key — bypasses RLS.
 *
 * Prefers the PgBouncer pooler URL (SUPABASE_DB_POOLER_URL) if set.
 * This is REQUIRED for production traffic above ~200 concurrent users.
 * See connection pooler note above for setup instructions.
 *
 * Only call from API routes, never from the browser bundle.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    )
  }
  if (!_serviceClient) {
    // Use pooler URL in production if available; direct URL in dev is fine.
    const connectionUrl = supabasePoolerUrl ?? supabaseUrl
    _serviceClient = createClient(connectionUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  }
  return _serviceClient
}
