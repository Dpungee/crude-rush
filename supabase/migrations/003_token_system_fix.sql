-- ============================================================
-- Crude Rush — Token System Schema Fixes
-- Run AFTER 002_scale_optimizations.sql
--
-- Fixes critical mismatches between the application code and
-- the database schema that prevent the token claim flow from
-- working at all.
-- ============================================================

-- ── 1. token_ledger: add settled column ───────────────────────────────────────
-- The application code queries .eq('settled', false) and updates
-- { settled: true, settled_at: ... } but the schema only had 'status TEXT'.
-- Adding a proper boolean column is cleaner and indexable.
ALTER TABLE token_ledger
  ADD COLUMN IF NOT EXISTS settled     BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS settled_at  TIMESTAMPTZ;

-- Migrate any existing 'settled' status rows to the new column
UPDATE token_ledger SET settled = TRUE WHERE status = 'settled' AND settled = FALSE;

-- Partial index: makes /api/token/balance and /api/token/claim fast.
-- Only indexes unsettled rows (the hot set) — shrinks as tokens get claimed.
CREATE INDEX IF NOT EXISTS token_ledger_wallet_unsettled_idx
  ON token_ledger(wallet_address)
  WHERE settled = FALSE;

-- ── 2. on_chain_claims: fix nullable transaction_b64 + column name ─────────────
-- The original schema had transaction_b64 NOT NULL, but the claim route
-- was not inserting it (causing constraint violations on every claim).
-- Making it nullable: the tx bytes are stored for debugging but not required
-- for correctness — the tx signature is what matters post-confirmation.
ALTER TABLE on_chain_claims
  ALTER COLUMN transaction_b64 DROP NOT NULL;

-- The confirm route used column name 'tx_signature' but the schema has 'signature'.
-- Both are TEXT columns — just a naming inconsistency. Rename to match code.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'on_chain_claims' AND column_name = 'signature'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'on_chain_claims' AND column_name = 'tx_signature'
  ) THEN
    ALTER TABLE on_chain_claims RENAME COLUMN signature TO tx_signature;
  END IF;
END $$;

-- ── 3. claim_cooldowns: add claim_count_24h ───────────────────────────────────
-- The claim route reads and writes claim_count_24h for daily rate limiting
-- but the column didn't exist in the original schema.
ALTER TABLE claim_cooldowns
  ADD COLUMN IF NOT EXISTS claim_count_24h INT NOT NULL DEFAULT 0;

-- Reset daily counts once per day via pg_cron (if pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'reset-claim-counts',
      '0 0 * * *',   -- midnight UTC daily
      $$UPDATE claim_cooldowns
        SET claim_count_24h = 0
        WHERE last_claim_at < NOW() - INTERVAL '24 hours'$$
    );
  END IF;
END $$;

-- ── 4. missions: save server-side progress ────────────────────────────────────
-- The original missions table was populated at login but never updated.
-- The save route now sends mission progress; add updated_at for tracking.
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 5. daily_rewards: track per-wallet claim history ─────────────────────────
-- New table to track daily reward claims server-side.
-- Prevents claiming the same day's reward twice (e.g. refresh exploit).
CREATE TABLE IF NOT EXISTS daily_rewards (
  wallet_address    TEXT        PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  last_claimed_date DATE,                          -- NULL = never claimed
  last_claimed_day  INT         NOT NULL DEFAULT 0, -- which reward day (1–7)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: service role only (matches every other table)

-- ── 6. Additional indexes for token claim hot paths ───────────────────────────

-- on_chain_claims: look up pending claims by wallet + status
CREATE INDEX IF NOT EXISTS on_chain_claims_pending_idx
  ON on_chain_claims(wallet_address, status)
  WHERE status = 'pending';

-- missions: fast lookup by wallet + claimed status (for server-side claim verification)
CREATE INDEX IF NOT EXISTS missions_wallet_unclaimed_idx
  ON missions(wallet_address, mission_key)
  WHERE claimed = FALSE;
