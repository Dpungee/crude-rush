-- ============================================================
-- Migration 005: Seasonal Leaderboard System
-- 7-day competitive seasons with scoring, rewards, and resets
-- ============================================================

-- ── Seasons table ──────────────────────���────────────────────────────��─────────
CREATE TABLE IF NOT EXISTS seasons (
  id              SERIAL      PRIMARY KEY,
  season_number   INT         NOT NULL UNIQUE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active',
  rewards_distributed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seasons_status_check CHECK (status IN ('active', 'finalizing', 'completed')),
  CONSTRAINT seasons_dates_valid CHECK (ends_at > starts_at)
);

-- Only ONE active season at a time
CREATE UNIQUE INDEX IF NOT EXISTS seasons_active_idx ON seasons(status) WHERE status = 'active';

-- ── Season entries (per-player per-season accumulators) ───────────────────────
CREATE TABLE IF NOT EXISTS season_entries (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id              INT         NOT NULL REFERENCES seasons(id),
  wallet_address         TEXT        NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,

  -- Raw metric accumulators (server-tracked, incremented in save route)
  season_barrels         BIGINT      NOT NULL DEFAULT 0,
  season_petrodollars    BIGINT      NOT NULL DEFAULT 0,
  season_tiles_unlocked  INT         NOT NULL DEFAULT 0,
  season_upgrades_bought INT         NOT NULL DEFAULT 0,
  season_prestiges       INT         NOT NULL DEFAULT 0,

  -- Composite score (recomputed on each save)
  score                  BIGINT      NOT NULL DEFAULT 0,

  -- Final rank (set during season finalization)
  final_rank             INT,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(season_id, wallet_address)
);

-- Leaderboard query: top-N by score within a season
CREATE INDEX IF NOT EXISTS season_entries_leaderboard_idx
  ON season_entries(season_id, score DESC);

-- Player lookup: find my entry in current season
CREATE INDEX IF NOT EXISTS season_entries_wallet_idx
  ON season_entries(wallet_address, season_id);

-- ── Season rewards (tier definitions per season) ──────────────────────────────
CREATE TABLE IF NOT EXISTS season_rewards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       INT         NOT NULL REFERENCES seasons(id),
  tier_name       TEXT        NOT NULL,
  rank_min        INT         NOT NULL,
  rank_max        INT         NOT NULL,
  token_reward    BIGINT      NOT NULL DEFAULT 0,
  title_reward    TEXT,

  CONSTRAINT season_rewards_rank_valid CHECK (rank_max >= rank_min AND rank_min >= 1)
);

CREATE INDEX IF NOT EXISTS season_rewards_season_idx ON season_rewards(season_id);

-- ── Season claims (idempotency for reward distribution) ───────────────────────
CREATE TABLE IF NOT EXISTS season_claims (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       INT         NOT NULL REFERENCES seasons(id),
  wallet_address  TEXT        NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  rank            INT         NOT NULL,
  tier_name       TEXT        NOT NULL,
  token_amount    BIGINT      NOT NULL DEFAULT 0,
  title_awarded   TEXT,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(season_id, wallet_address)
);

-- ── Update token_ledger event_type constraint to include season_reward ────────
ALTER TABLE token_ledger DROP CONSTRAINT IF EXISTS token_ledger_event_type_check;
ALTER TABLE token_ledger ADD CONSTRAINT token_ledger_event_type_check
  CHECK (event_type IN ('barrel_milestone', 'mission_reward', 'daily_reward', 'manual_adjustment', 'season_reward'));

-- ── Season finalization function ──────────────────────────────��───────────────
CREATE OR REPLACE FUNCTION finalize_season(p_season_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Assign final ranks based on score
  UPDATE season_entries se
  SET final_rank = ranked.rnk
  FROM (
    SELECT id, RANK() OVER (ORDER BY score DESC) as rnk
    FROM season_entries
    WHERE season_id = p_season_id AND score > 0
  ) ranked
  WHERE se.id = ranked.id;

  -- Mark season as completed
  UPDATE seasons SET status = 'completed' WHERE id = p_season_id AND status = 'finalizing';
END;
$$;

-- ── Seed the first season (starts now, ends in 7 days) ─────────────────────���─
INSERT INTO seasons (season_number, starts_at, ends_at, status)
VALUES (1, date_trunc('hour', NOW()), date_trunc('hour', NOW()) + INTERVAL '7 days', 'active')
ON CONFLICT (season_number) DO NOTHING;

-- ── Seed default reward tiers for season 1 ───────────────────────────────────
INSERT INTO season_rewards (season_id, tier_name, rank_min, rank_max, token_reward, title_reward)
SELECT s.id, t.tier_name, t.rank_min, t.rank_max, t.token_reward, t.title_reward
FROM seasons s,
  (VALUES
    ('champion',    1,   1,   1000000000, 'Season 1 Champion'),
    ('top3',        2,   3,   500000000,  'Season 1 Medalist'),
    ('top10',       4,   10,  200000000,  'Season 1 Elite'),
    ('top25',       11,  25,  100000000,  'Season 1 Veteran'),
    ('top50',       26,  50,  50000000,   NULL),
    ('top100',      51,  100, 25000000,   NULL),
    ('participant', 101, 99999, 5000000,  NULL)
  ) AS t(tier_name, rank_min, rank_max, token_reward, title_reward)
WHERE s.season_number = 1
ON CONFLICT DO NOTHING;
