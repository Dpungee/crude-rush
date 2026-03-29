/**
 * Durable rate limiting backed by Supabase.
 *
 * Unlike in-memory Maps, this survives lambda cold starts and works
 * correctly across multiple serverless instances.
 *
 * Usage:
 *   const result = await checkRateLimit(supabase, `save:${wallet}`, 15_000)
 *   if (!result.allowed) return 429
 */
import type { SupabaseClient } from '@supabase/supabase-js'

interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

/**
 * Check and update a durable rate limit.
 *
 * @param supabase - Service role Supabase client
 * @param key - Rate limit key (e.g. 'save:walletAddress')
 * @param intervalMs - Minimum interval between actions in milliseconds
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  intervalMs: number
): Promise<RateLimitResult> {
  const now = new Date()

  // Try to read existing rate limit entry
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('last_at')
    .eq('key', key)
    .single()

  if (existing) {
    const lastAt = new Date(existing.last_at)
    const elapsed = now.getTime() - lastAt.getTime()

    if (elapsed < intervalMs) {
      return { allowed: false, retryAfterMs: intervalMs - elapsed }
    }
  }

  // Update the timestamp (upsert)
  await supabase.from('rate_limits').upsert(
    { key, last_at: now.toISOString(), count: 1 },
    { onConflict: 'key' }
  )

  return { allowed: true, retryAfterMs: 0 }
}
