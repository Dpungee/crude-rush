import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Browser-side Supabase client (uses anon key, respects RLS) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Set the Supabase auth token (JWT) for authenticated requests.
 * Called after wallet verification returns a custom JWT.
 */
export function setSupabaseAuth(jwt: string) {
  // For custom JWT auth, we pass it as the access token
  // This requires configuring Supabase with a custom JWT secret
  // For MVP, we'll use service role on the server and anon+RLS on client
}
