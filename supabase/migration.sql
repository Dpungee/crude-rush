-- ============================================================
-- Crude Rush - Database Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- Players table
CREATE TABLE IF NOT EXISTS players (
  wallet_address  TEXT PRIMARY KEY,
  display_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_seen_at    TIMESTAMPTZ DEFAULT now(),
  login_streak    INT DEFAULT 0,
  last_login_date DATE,
  prestige_level  INT DEFAULT 0,
  prestige_multiplier FLOAT DEFAULT 1.0,
  lifetime_barrels BIGINT DEFAULT 0,
  lifetime_petrodollars BIGINT DEFAULT 0
);

-- Game states table
CREATE TABLE IF NOT EXISTS game_states (
  wallet_address    TEXT PRIMARY KEY REFERENCES players(wallet_address) ON DELETE CASCADE,
  crude_oil         FLOAT DEFAULT 0,
  refined_oil       FLOAT DEFAULT 0,
  petrodollars      BIGINT DEFAULT 100,
  grid_size         INT DEFAULT 3,
  grid_data         JSONB DEFAULT '[]'::jsonb,
  production_rate   FLOAT DEFAULT 0,
  storage_capacity  FLOAT DEFAULT 100,
  refinery_rate     FLOAT DEFAULT 0,
  last_tick_at      TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  version           INT DEFAULT 1
);

-- Upgrades table
CREATE TABLE IF NOT EXISTS upgrades (
  id              SERIAL PRIMARY KEY,
  wallet_address  TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  upgrade_type    TEXT NOT NULL,
  level           INT DEFAULT 1,
  purchased_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, upgrade_type)
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id              SERIAL PRIMARY KEY,
  wallet_address  TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  mission_key     TEXT NOT NULL,
  progress        INT DEFAULT 0,
  target          INT NOT NULL,
  completed       BOOLEAN DEFAULT false,
  reward_type     TEXT NOT NULL,
  reward_amount   INT NOT NULL,
  claimed         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, mission_key)
);

-- Daily rewards table
CREATE TABLE IF NOT EXISTS daily_rewards (
  id              SERIAL PRIMARY KEY,
  wallet_address  TEXT NOT NULL REFERENCES players(wallet_address) ON DELETE CASCADE,
  day_number      INT NOT NULL,
  reward_type     TEXT NOT NULL,
  reward_amount   INT NOT NULL,
  claimed_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_states_wallet ON game_states(wallet_address);
CREATE INDEX IF NOT EXISTS idx_upgrades_wallet ON upgrades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_missions_wallet ON missions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_wallet ON daily_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_lifetime_barrels ON players(lifetime_barrels DESC);

-- Enable Row Level Security (for future direct-client access)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
