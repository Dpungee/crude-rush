-- ============================================================
-- Crude Rush — Scale Optimizations
-- Run AFTER 001_initial_schema.sql
--
-- What this migration adds:
--   1. Nonces auto-cleanup via pg_cron (prevents table bloat)
--   2. Index on staking_cache.cached_at (faster TTL checks)
--   3. Partial index on game_states for anti-cheat reads
--   4. Function to manually purge expired nonces (fallback if no pg_cron)
-- ============================================================

-- ── 1. Nonces auto-cleanup ────────────────────────────────────────────────────
-- Problem: without cleanup, 10K logins/day = 10K nonce rows/day.
-- After 30 days = 300K rows of expired data with no benefit.
-- TTL is 5 minutes — anything older is garbage.

-- Fallback stored procedure (callable from app code or Supabase dashboard)
CREATE OR REPLACE FUNCTION purge_expired_nonces()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nonces WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- pg_cron job: delete expired nonces every 5 minutes.
-- pg_cron is enabled by default on Supabase Pro. If you see an error here
-- about "cron" schema not existing, enable it in:
--   Supabase Dashboard → Database → Extensions → pg_cron
--
-- To verify cron is running after setup:
--   SELECT * FROM cron.job;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-expired-nonces',        -- job name (idempotent)
      '*/5 * * * *',                 -- every 5 minutes
      'SELECT purge_expired_nonces()'
    );
  END IF;
END $$;

-- ── 2. Staking cache — add staked_amount column + index ──────────────────────
-- The original schema only stored multiplier. The staking.ts library also
-- needs the raw staked_amount (bigint as TEXT) to reconstruct StakingInfo.
-- The original code tried to write staked_amount but the column didn't exist
-- (silently ignored by Supabase's PostgREST). This migration adds it.
ALTER TABLE staking_cache
  ADD COLUMN IF NOT EXISTS staked_amount TEXT NOT NULL DEFAULT '0';

-- Index on cached_at for admin queries (e.g. "which wallets need a staking refresh?")
CREATE INDEX IF NOT EXISTS staking_cache_cached_at_idx ON staking_cache(cached_at DESC);

-- ── 3. Game states anti-cheat index ──────────────────────────────────────────
-- The save route does: SELECT version, crude_oil, last_tick_at FROM game_states
-- WHERE wallet_address = $1. The wallet_address column is already a PK
-- (clustered index). This is fine — no additional index needed.
--
-- However, the UPDATE after save uses wallet_address as the filter and touches
-- several columns. Postgres will use the PK for this. No change needed.

-- ── 4. Token ledger composite index for milestone idempotency ──────────────────
-- The save route queries: SELECT reference_id FROM token_ledger
-- WHERE wallet_address = $1 AND reference_id IN (...)
-- The existing (wallet_address, status) index doesn't cover reference_id.
-- Add a covering index so this query is index-only.
CREATE INDEX IF NOT EXISTS token_ledger_wallet_ref_idx
  ON token_ledger(wallet_address, reference_id);

-- ── 5. Players table — partial index for active players only ──────────────────
-- The leaderboard query: SELECT ... FROM players WHERE lifetime_barrels > 0
-- ORDER BY lifetime_barrels DESC LIMIT 100
-- A partial index (WHERE lifetime_barrels > 0) excludes new players who haven't
-- drilled yet and makes the leaderboard query faster as player count grows.
CREATE INDEX IF NOT EXISTS players_active_barrels_idx
  ON players(lifetime_barrels DESC)
  WHERE lifetime_barrels > 0;

-- ── Notes on connection pooling ────────────────────────────────────────────────
-- This migration does NOT configure PgBouncer — that's done in the Supabase
-- dashboard and via the SUPABASE_DB_POOLER_URL env var in src/lib/supabase-server.ts
--
-- Checklist for 10K users:
--   [ ] Set SUPABASE_DB_POOLER_URL in Vercel project environment variables
--   [ ] Enable pg_cron extension in Supabase dashboard
--   [ ] Upgrade to Supabase Pro + at least Small compute add-on ($35/mo total)
--   [ ] Use a private Solana RPC endpoint (Helius/QuickNode) for staking lookups
--   [ ] Monitor via Supabase dashboard → Reports → Queries for slow query detection
