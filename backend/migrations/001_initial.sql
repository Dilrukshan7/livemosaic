-- MosaicForge initial schema
-- Run this in the Supabase SQL editor

-- ── Plans ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL UNIQUE,
  display_name           TEXT NOT NULL,
  stripe_price_id        TEXT,
  price_usd              DECIMAL(10,2) NOT NULL DEFAULT 0,
  monthly_mosaics        INTEGER,          -- NULL = unlimited
  min_cell_size          INTEGER NOT NULL DEFAULT 8,
  max_cell_size          INTEGER NOT NULL DEFAULT 64,
  max_output_resolution  DECIMAL(3,1) NOT NULL DEFAULT 2.0,
  allowed_formats        TEXT[] NOT NULL DEFAULT ARRAY['JPEG'],
  features               JSONB NOT NULL DEFAULT '{}',
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Subscriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                  UUID NOT NULL REFERENCES plans(id),
  stripe_subscription_id   TEXT,
  stripe_customer_id       TEXT,
  status                   TEXT NOT NULL DEFAULT 'active',
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ── Mosaic jobs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mosaic_jobs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL DEFAULT 'pending',
  settings                 JSONB NOT NULL DEFAULT '{}',
  output_path              TEXT,
  output_format            TEXT,
  tile_count               INTEGER,
  processing_time_seconds  DECIMAL,
  error_message            TEXT,
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mosaic_jobs_user ON mosaic_jobs(user_id);

-- ── Usage ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES mosaic_jobs(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_user_created ON usage(user_id, created_at);

-- ── Stripe events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  TEXT UNIQUE NOT NULL,
  event_type       TEXT NOT NULL,
  data             JSONB NOT NULL DEFAULT '{}',
  processed        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed default plans ────────────────────────────────────────────────────────
INSERT INTO plans (name, display_name, price_usd, monthly_mosaics, min_cell_size, max_cell_size, max_output_resolution, allowed_formats, features)
VALUES
  (
    'free', 'Free', 0, 5, 12, 64, 2.0,
    ARRAY['JPEG'],
    '{"png_download": false, "commercial_use": false, "priority_queue": false}'
  ),
  (
    'pro', 'Pro', 9.99, 50, 8, 64, 3.0,
    ARRAY['JPEG', 'PNG'],
    '{"png_download": true, "commercial_use": false, "priority_queue": false}'
  ),
  (
    'business', 'Business', 29.99, NULL, 4, 64, 4.0,
    ARRAY['JPEG', 'PNG'],
    '{"png_download": true, "commercial_use": true, "priority_queue": true}'
  )
ON CONFLICT (name) DO NOTHING;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosaic_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by the backend with service_role key)
-- Users can read their own data via authenticated JWT (frontend-facing Supabase client)
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own jobs"
  ON mosaic_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own usage"
  ON usage FOR SELECT USING (auth.uid() = user_id);

-- Plans are public
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are publicly readable"
  ON plans FOR SELECT USING (TRUE);
