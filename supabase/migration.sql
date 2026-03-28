-- ============================================================
-- Crude Rush - Database Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- ─── Players table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  wallet_address          TEXT PRIMARY KEY,
  display_name            TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  last_seen_at            TIMESTAMPTZ DEFAULT now(),
  login_streak            INT DEFAULT 0,
  last_login_date         DATE,
  prestige_level          INT DEFAULT 0,
  prestige_multiplier     FLOAT DEFAULT 1.0,
  black_gold              INT DEFAULT 0,
  xp                      BIGINT DEFAULT 0,
  xp_level                INT DEFAULT 0,
  -- Permanent milestone bonuses (compound multiplicative; start at 1.0)
  milestone_production_bonus FLOAT DEFAULT 1.0,
  milestone_cash_bonus       FLOAT DEFAULT 1.0,
  -- Streak sell-rate multiplier
  streak_multiplier          FLOAT DEFAULT 1.0,
  -- Player title from barrel milestones
  player_title            TEXT,
  lifetime_barrels        BIGINT DEFAULT 0,
  lifetime_petrodollars   BIGINT DEFAULT 0
);

-- ─── Game states table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_states (
  wallet_address      TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  crude_oil           FLOAT DEFAULT 0,
  refined_oil         FLOAT DEFAULT 0,
  petrodollars        BIGINT DEFAULT 100,
  plots_data          JSONB DEFAULT '[]'::jsonb,
  unlocked_tile_count INT DEFAULT 1,
  -- Upgrades stored inline for fast load (no join needed)
  upgrades_data       JSONB DEFAULT '{}'::jsonb,
  production_rate     FLOAT DEFAULT 0,
  storage_capacity    FLOAT DEFAULT 500,
  refinery_rate       FLOAT DEFAULT 0,
  last_tick_at        TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  version             INT DEFAULT 1
);

-- ─── Missions table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  mission_key    TEXT NOT NULL,
  frequency      TEXT NOT NULL DEFAULT 'lifetime',  -- 'daily' | 'weekly' | 'lifetime'
  progress       INT DEFAULT 0,
  target         INT NOT NULL,
  completed      BOOLEAN DEFAULT false,
  reward_type    TEXT NOT NULL,
  reward_amount  INT NOT NULL,
  claimed        BOOLEAN DEFAULT false,
  -- For daily/weekly: which UTC date/week this instance is for
  period_start   DATE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, mission_key, period_start)
);

-- ─── Daily rewards table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_rewards (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  day_number     INT NOT NULL,
  reward_type    TEXT NOT NULL,
  reward_amount  INT NOT NULL,
  claimed_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 1: Shadow ledger — tracks $CRUDE earnings before TGE
-- All amounts in micro-$CRUDE (1,000,000 = 1 $CRUDE token)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_ledger (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,
  amount         BIGINT NOT NULL,
  -- Idempotency key: prevents double-crediting same event
  reference_id   TEXT NOT NULL,
  settled        BOOLEAN DEFAULT false,
  settled_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, reference_id)
);

-- Claim rate limiting
CREATE TABLE IF NOT EXISTS claim_cooldowns (
  wallet_address  TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  last_claim_at   TIMESTAMPTZ DEFAULT now(),
  claim_count_24h INT DEFAULT 0
);

-- ============================================================
-- PHASE 2: On-chain claim tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS on_chain_claims (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  amount         BIGINT NOT NULL,
  tx_signature   TEXT,
  status         TEXT DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'failed'
  created_at     TIMESTAMPTZ DEFAULT now(),
  confirmed_at   TIMESTAMPTZ
);

-- ============================================================
-- PHASE 3: Staking cache (mirrors on-chain for fast reads)
-- Refreshed every 5 minutes by /api/game/staking-bonus
-- ============================================================
CREATE TABLE IF NOT EXISTS staking_cache (
  wallet_address TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  staked_amount  BIGINT DEFAULT 0,       -- micro-$CRUDE staked on-chain
  multiplier     FLOAT DEFAULT 1.0,      -- derived production multiplier
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 4: NFT land deed ownership cache
-- Refreshed every 10 minutes by /api/nft/verify
-- ============================================================
CREATE TABLE IF NOT EXISTS nft_cache (
  wallet_address TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  -- Array of { plotX, plotY, productionBonus, storageBonus, rarity }
  nft_data       JSONB DEFAULT '[]'::jsonb,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Leaderboard views
-- ============================================================

-- Weekly production leaderboard (resets conceptually via query with date filter)
CREATE OR REPLACE VIEW leaderboard_production AS
  SELECT
    wallet_address,
    display_name,
    prestige_level,
    player_title,
    lifetime_barrels,
    RANK() OVER (ORDER BY lifetime_barrels DESC) AS rank_barrels
  FROM players
  ORDER BY lifetime_barrels DESC
  LIMIT 200;

-- Staking vault leaderboard
CREATE OR REPLACE VIEW leaderboard_staking AS
  SELECT
    p.wallet_address,
    p.display_name,
    p.player_title,
    s.staked_amount,
    s.multiplier,
    RANK() OVER (ORDER BY s.staked_amount DESC) AS rank_staking
  FROM staking_cache s
  JOIN players p ON p.wallet_address = s.wallet_address
  ORDER BY s.staked_amount DESC
  LIMIT 200;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_game_states_wallet     ON game_states(wallet_address);
CREATE INDEX IF NOT EXISTS idx_missions_wallet        ON missions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_wallet   ON daily_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_lifetime       ON players(lifetime_barrels DESC);
CREATE INDEX IF NOT EXISTS idx_players_prestige       ON players(prestige_level DESC);
CREATE INDEX IF NOT EXISTS idx_token_ledger_wallet    ON token_ledger(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_ledger_unsettled ON token_ledger(wallet_address, settled);
CREATE INDEX IF NOT EXISTS idx_on_chain_claims_wallet ON on_chain_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_on_chain_claims_status ON on_chain_claims(status);
CREATE INDEX IF NOT EXISTS idx_missions_period        ON missions(wallet_address, frequency, period_start);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states      ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_cooldowns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_chain_claims  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_cache        ENABLE ROW LEVEL SECURITY;

-- Players can SELECT their own data; all writes go through service-role API routes
CREATE POLICY "player_read_own"          ON players       FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_game_state"   ON game_states   FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_missions"     ON missions      FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_rewards"      ON daily_rewards FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_ledger"       ON token_ledger  FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_claims"       ON on_chain_claims FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_staking"      ON staking_cache FOR SELECT USING (wallet_address = auth.uid());
CREATE POLICY "player_read_nft"          ON nft_cache     FOR SELECT USING (wallet_address = auth.uid());
