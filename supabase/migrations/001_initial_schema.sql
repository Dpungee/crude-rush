-- ============================================================
-- Crude Rush — Initial Database Schema
-- Run this in the Supabase SQL editor to set up all tables,
-- indexes, and Row Level Security policies.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── players ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  wallet_address            TEXT        PRIMARY KEY,
  display_name              TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_date           DATE,
  login_streak              INT         NOT NULL DEFAULT 0,
  prestige_level            INT         NOT NULL DEFAULT 0,
  prestige_multiplier       FLOAT       NOT NULL DEFAULT 1.0,
  black_gold                BIGINT      NOT NULL DEFAULT 0,
  xp                        BIGINT      NOT NULL DEFAULT 0,
  xp_level                  INT         NOT NULL DEFAULT 0,
  milestone_production_bonus FLOAT      NOT NULL DEFAULT 1.0,
  milestone_cash_bonus      FLOAT       NOT NULL DEFAULT 1.0,
  streak_multiplier         FLOAT       NOT NULL DEFAULT 1.0,
  lifetime_barrels          BIGINT      NOT NULL DEFAULT 0,
  lifetime_petrodollars     BIGINT      NOT NULL DEFAULT 0
);

-- ── game_states ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_states (
  wallet_address      TEXT        PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  crude_oil           FLOAT       NOT NULL DEFAULT 0,
  refined_oil         FLOAT       NOT NULL DEFAULT 0,
  petrodollars        FLOAT       NOT NULL DEFAULT 100,
  plots_data          JSONB       NOT NULL DEFAULT '[]'::JSONB,
  unlocked_tile_count INT         NOT NULL DEFAULT 1,
  upgrades_data       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  production_rate     FLOAT       NOT NULL DEFAULT 0,
  storage_capacity    FLOAT       NOT NULL DEFAULT 500,
  refinery_rate       FLOAT       NOT NULL DEFAULT 0,
  last_tick_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version             INT         NOT NULL DEFAULT 1,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── nonces ───────────────────────────────────────────────────────────────────
-- Used for Phantom wallet sign-in. Supabase-backed to survive serverless
-- deployments where in-memory state is not shared across lambda instances.
CREATE TABLE IF NOT EXISTS nonces (
  public_key   TEXT        PRIMARY KEY,
  nonce        TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);

-- Automatically delete expired nonces (runs every 5 min via pg_cron if enabled,
-- otherwise the application cleans them up on read).
CREATE INDEX IF NOT EXISTS nonces_expires_at_idx ON nonces(expires_at);

-- ── missions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT        NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  mission_key    TEXT        NOT NULL,
  progress       INT         NOT NULL DEFAULT 0,
  target         INT         NOT NULL DEFAULT 1,
  completed      BOOLEAN     NOT NULL DEFAULT FALSE,
  claimed        BOOLEAN     NOT NULL DEFAULT FALSE,
  reward_type    TEXT        NOT NULL DEFAULT 'petrodollars',
  reward_amount  INT         NOT NULL DEFAULT 0,
  frequency      TEXT        NOT NULL DEFAULT 'lifetime',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, mission_key)
);

-- ── token_ledger ──────────────────────────────────────────────────────────────
-- Shadow ledger for $CRUDE token earnings before on-chain claim.
CREATE TABLE IF NOT EXISTS token_ledger (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT        NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  event_type     TEXT        NOT NULL,  -- 'barrel_milestone', 'mission_reward', 'daily_reward'
  amount         BIGINT      NOT NULL,  -- micro-$CRUDE (1e6 = 1 token)
  reference_id   TEXT        UNIQUE,    -- idempotency key (e.g. 'barrel_milestone_1000')
  status         TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'settled'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS token_ledger_wallet_idx ON token_ledger(wallet_address, status);

-- ── on_chain_claims ───────────────────────────────────────────────────────────
-- Tracks partially-signed SPL transfer transactions awaiting player counter-sign.
CREATE TABLE IF NOT EXISTS on_chain_claims (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address   TEXT        NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  amount           BIGINT      NOT NULL,         -- micro-$CRUDE
  transaction_b64  TEXT        NOT NULL,         -- base64-encoded partially-signed tx
  status           TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'failed'
  signature        TEXT,                         -- on-chain tx signature after confirmation
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

-- ── claim_cooldowns ───────────────────────────────────────────────────────────
-- Rate-limits token claims to once per 24h per wallet.
CREATE TABLE IF NOT EXISTS claim_cooldowns (
  wallet_address TEXT        PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  last_claim_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── staking_cache ─────────────────────────────────────────────────────────────
-- 5-minute cache for on-chain staking balance lookups.
CREATE TABLE IF NOT EXISTS staking_cache (
  wallet_address TEXT        PRIMARY KEY,
  multiplier     FLOAT       NOT NULL DEFAULT 1.0,
  cached_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── nft_cache ─────────────────────────────────────────────────────────────────
-- 10-minute cache for Metaplex NFT Land Deed lookups.
CREATE TABLE IF NOT EXISTS nft_cache (
  wallet_address TEXT        PRIMARY KEY,
  bonus_data     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  cached_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS players_lifetime_barrels_idx  ON players(lifetime_barrels DESC);
CREATE INDEX IF NOT EXISTS players_last_seen_idx         ON players(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS missions_wallet_idx           ON missions(wallet_address);
CREATE INDEX IF NOT EXISTS on_chain_claims_wallet_idx    ON on_chain_claims(wallet_address, status);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Our API routes use the service role key (bypasses RLS), so RLS here acts as
-- a safety net against direct client DB access using the anon key.

ALTER TABLE players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_chain_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_cache       ENABLE ROW LEVEL SECURITY;

-- Deny all direct access via the anon/authenticated Supabase client.
-- All legitimate access goes through our API routes (service role).
-- This means no RLS policies that grant access — deny-by-default is the policy.

-- ── Leaderboard view (public read, no auth required) ─────────────────────────
-- Safe to expose because it only shows aggregated/display data.
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  wallet_address,
  display_name,
  lifetime_barrels    AS total_barrels,
  lifetime_petrodollars AS empire_value,
  prestige_level,
  RANK() OVER (ORDER BY lifetime_barrels DESC)    AS rank_barrels,
  RANK() OVER (ORDER BY lifetime_petrodollars DESC) AS rank_empire
FROM players
WHERE lifetime_barrels > 0
ORDER BY lifetime_barrels DESC
LIMIT 100;

-- No RLS needed on a view (inherits from base tables).
-- The view itself is read-only.
