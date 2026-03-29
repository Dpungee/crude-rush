-- ============================================================
-- Migration 006: Global Events System
-- Temporary world events with gameplay modifiers
-- ============================================================

CREATE TABLE IF NOT EXISTS global_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '🎉',
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  modifiers   JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT global_events_dates_valid CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS global_events_active_idx
  ON global_events(starts_at, ends_at);

-- Seed 4 rotating events (first batch runs over the next 2 weeks)
INSERT INTO global_events (name, description, emoji, starts_at, ends_at, modifiers) VALUES
  ('Drilling Rush',
   'All wells pump at double speed! Drill baby, drill!',
   '⛽',
   NOW(),
   NOW() + INTERVAL '3 days',
   '{"productionMultiplier": 2.0}'::JSONB),

  ('Market Surge',
   'Oil prices are through the roof. Sell now for +50% profit!',
   '📈',
   NOW() + INTERVAL '3 days',
   NOW() + INTERVAL '6 days',
   '{"sellPriceMultiplier": 1.5}'::JSONB),

  ('Refinery Boom',
   'Refineries run at maximum efficiency. Process crude faster!',
   '🔥',
   NOW() + INTERVAL '6 days',
   NOW() + INTERVAL '9 days',
   '{"refinerySpeedMultiplier": 2.0}'::JSONB),

  ('Speed Build Week',
   'Construction crews work overtime. All build times cut in half!',
   '🏗️',
   NOW() + INTERVAL '9 days',
   NOW() + INTERVAL '12 days',
   '{"upgradeTimeMultiplier": 0.5}'::JSONB)
ON CONFLICT DO NOTHING;
