-- ============================================================
-- Crude Rush - Database Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- Players table
CREATE TABLE IF NOT EXISTS players (
  wallet_address        TEXT PRIMARY KEY,
  display_name          TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  last_seen_at          TIMESTAMPTZ DEFAULT now(),
  login_streak          INT DEFAULT 0,
  last_login_date       DATE,
  prestige_level        INT DEFAULT 0,
  prestige_multiplier   FLOAT DEFAULT 1.0,
  lifetime_barrels      BIGINT DEFAULT 0,
  lifetime_petrodollars BIGINT DEFAULT 0
);

-- Game states table (7x7 tile-based grid)
CREATE TABLE IF NOT EXISTS game_states (
  wallet_address      TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  crude_oil           FLOAT DEFAULT 0,
  refined_oil         FLOAT DEFAULT 0,
  petrodollars        BIGINT DEFAULT 100,
  plots_data          JSONB DEFAULT '[]'::jsonb,
  unlocked_tile_count INT DEFAULT 1,
  production_rate     FLOAT DEFAULT 0,
  storage_capacity    FLOAT DEFAULT 200,
  refinery_rate       FLOAT DEFAULT 0,
  last_tick_at        TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  version             INT DEFAULT 1
);

-- Upgrades table
CREATE TABLE IF NOT EXISTS upgrades (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  upgrade_type   TEXT NOT NULL,
  level          INT DEFAULT 1,
  purchased_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, upgrade_type)
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  mission_key    TEXT NOT NULL,
  progress       INT DEFAULT 0,
  target         INT NOT NULL,
  completed      BOOLEAN DEFAULT false,
  reward_type    TEXT NOT NULL,
  reward_amount  INT NOT NULL,
  claimed        BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, mission_key)
);

-- Daily rewards table
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
-- All amounts in micro-$CRUDE (1_000_000 = 1 $CRUDE token)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_ledger (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,
  amount         BIGINT NOT NULL,
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
  status         TEXT DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT now(),
  confirmed_at   TIMESTAMPTZ
);

-- ============================================================
-- PHASE 3: Staking cache (mirrors on-chain state for fast reads)
-- ============================================================
CREATE TABLE IF NOT EXISTS staking_cache (
  wallet_address    TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  staked_amount     BIGINT DEFAULT 0,
  staking_bonus_pct FLOAT DEFAULT 0,
  cached_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 4: NFT ownership cache
-- ============================================================
CREATE TABLE IF NOT EXISTS nft_cache (
  id             SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  mint_address   TEXT NOT NULL,
  plot_tier      TEXT NOT NULL,
  bonus_pct      FLOAT DEFAULT 0,
  cached_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, mint_address)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_game_states_wallet ON game_states(wallet_address);
CREATE INDEX IF NOT EXISTS idx_upgrades_wallet ON upgrades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_missions_wallet ON missions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_wallet ON daily_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_lifetime_barrels ON players(lifetime_barrels DESC);
CREATE INDEX IF NOT EXISTS idx_token_ledger_wallet ON token_ledger(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_ledger_unsettled ON token_ledger(wallet_address, settled);
CREATE INDEX IF NOT EXISTS idx_on_chain_claims_wallet ON on_chain_claims(wallet_address);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_chain_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_cache ENABLE ROW LEVEL SECURITY;

-- Players can SELECT their own rows; all writes go through service role API
CREATE POLICY "player_own_data" ON players
  FOR SELECT USING (wallet_address = auth.uid());

CREATE POLICY "player_own_game_state" ON game_states
  FOR SELECT USING (wallet_address = auth.uid());

CREATE POLICY "player_read_ledger" ON token_ledger
  FOR SELECT USING (wallet_address = auth.uid());

CREATE POLICY "player_read_claims" ON on_chain_claims
  FOR SELECT USING (wallet_address = auth.uid());
