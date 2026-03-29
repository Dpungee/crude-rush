-- ============================================================
-- Migration 007: Claim Reservation Hardening
-- Fixes: TOCTOU on ledger rows, durable rate limiting,
-- ledger-to-claim binding, treasury source verification
-- ============================================================

-- ── 1. Add claim reservation to token_ledger ──────────────────────────────────
-- When a claim is initiated, ledger rows are atomically reserved by setting
-- reserved_by_claim_id. This prevents two claims from grabbing the same rows.
ALTER TABLE token_ledger
  ADD COLUMN IF NOT EXISTS reserved_by_claim_id UUID,
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

-- Index for finding reserved-but-unsettled rows for a specific claim
CREATE INDEX IF NOT EXISTS token_ledger_reserved_idx
  ON token_ledger(reserved_by_claim_id)
  WHERE reserved_by_claim_id IS NOT NULL AND settled = FALSE;

-- ── 2. Store ledger IDs directly on the claim record ──────────────────────────
-- Server knows which rows belong to each claim — no client trust needed.
ALTER TABLE on_chain_claims
  ADD COLUMN IF NOT EXISTS ledger_ids UUID[] DEFAULT '{}';

-- ── 3. Durable rate limit table (replaces in-memory Map) ──────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT        PRIMARY KEY,  -- e.g. 'save:walletAddress' or 'claim:walletAddress'
  last_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count       INT         NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup old entries (older than 1 day)
CREATE INDEX IF NOT EXISTS rate_limits_cleanup_idx ON rate_limits(last_at);

-- ── 4. Function to release stale reservations ─────────────────────────────────
-- When a claim is marked failed, its reserved ledger rows should be freed.
CREATE OR REPLACE FUNCTION release_claim_reservations(p_claim_id UUID)
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE token_ledger
  SET reserved_by_claim_id = NULL, reserved_at = NULL
  WHERE reserved_by_claim_id = p_claim_id
    AND settled = FALSE;
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Update expire_stale_claims to also release reservations ────────────────
CREATE OR REPLACE FUNCTION expire_stale_claims()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
  claim_rec RECORD;
BEGIN
  FOR claim_rec IN
    SELECT id FROM on_chain_claims
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '1 hour'
  LOOP
    -- Release reserved ledger rows
    PERFORM release_claim_reservations(claim_rec.id);
    -- Mark claim as failed
    UPDATE on_chain_claims SET status = 'failed' WHERE id = claim_rec.id;
  END LOOP;
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
