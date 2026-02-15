-- =============================================================================
-- QimteK Webhook - All Scalability Migrations (Merged)
-- =============================================================================
-- Run with: npm run db:migrate
-- =============================================================================

-- =============================================================================
-- 1. Time-partitioned webhook requests (indexes + columns)
-- =============================================================================
-- WHY: At high write volume, a single requests table becomes a hotspot.
--      Indexes provide immediate performance win; partitioning optional later.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_requests_webhook_token 
  ON public.requests (webhook_token);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp 
  ON public.requests (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_requests_webhook_token_timestamp 
  ON public.requests (webhook_token, timestamp DESC);

-- Add raw_body column if missing (for signature verification, replay)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'raw_body'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN raw_body TEXT;
  END IF;
END $$;

-- Add last_active_at to webhooks if missing (used by ingestion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'webhooks' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE public.webhooks ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =============================================================================
-- 2. Partition management helper (for future partitioned table)
-- =============================================================================

CREATE OR REPLACE FUNCTION drop_old_request_partitions(
  retention_days INT DEFAULT 90
) RETURNS void AS $$
DECLARE
  part_record RECORD;
  cutoff_date DATE;
  part_date DATE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'requests_partitioned'
  ) THEN
    RETURN;
  END IF;

  cutoff_date := CURRENT_DATE - retention_days;

  FOR part_record IN
    SELECT inhrelid::regclass::text AS part_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    WHERE parent.relname = 'requests_partitioned'
    AND inhrelid::regclass::text NOT LIKE '%_default'
  LOOP
    BEGIN
      SELECT to_date(m[1]||'-'||m[2]||'-'||m[3], 'YYYY-MM-DD') INTO part_date
        FROM regexp_matches(part_record.part_name, '(\d{4})_(\d{2})_(\d{2})') AS m LIMIT 1;
      IF part_date IS NOT NULL AND part_date < cutoff_date THEN
        EXECUTE format('DROP TABLE IF EXISTS %I', part_record.part_name);
        RAISE NOTICE 'Dropped partition %', part_record.part_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped partition %: %', part_record.part_name, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. Pre-aggregated analytics tables
-- =============================================================================
-- WHY: Charts must NEVER query raw request rows at scale.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_request_stats_hourly (
  webhook_token TEXT NOT NULL REFERENCES public.webhooks(token) ON DELETE CASCADE,
  hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count BIGINT NOT NULL DEFAULT 0,
  avg_payload_size FLOAT,
  method_get BIGINT DEFAULT 0,
  method_post BIGINT DEFAULT 0,
  method_put BIGINT DEFAULT 0,
  method_patch BIGINT DEFAULT 0,
  method_delete BIGINT DEFAULT 0,
  method_other BIGINT DEFAULT 0,
  error_count BIGINT DEFAULT 0,
  PRIMARY KEY (webhook_token, hour_bucket)
);

CREATE TABLE IF NOT EXISTS public.webhook_request_stats_daily (
  webhook_token TEXT NOT NULL REFERENCES public.webhooks(token) ON DELETE CASCADE,
  day_bucket DATE NOT NULL,
  request_count BIGINT NOT NULL DEFAULT 0,
  avg_payload_size FLOAT,
  method_get BIGINT DEFAULT 0,
  method_post BIGINT DEFAULT 0,
  method_put BIGINT DEFAULT 0,
  method_patch BIGINT DEFAULT 0,
  method_delete BIGINT DEFAULT 0,
  method_other BIGINT DEFAULT 0,
  error_count BIGINT DEFAULT 0,
  PRIMARY KEY (webhook_token, day_bucket)
);

CREATE INDEX IF NOT EXISTS idx_stats_hourly_webhook_hour 
  ON public.webhook_request_stats_hourly (webhook_token, hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_stats_daily_webhook_day 
  ON public.webhook_request_stats_daily (webhook_token, day_bucket DESC);

-- =============================================================================
-- 4. Feature flags for plan and per-user overrides
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_key TEXT NOT NULL UNIQUE,
  plan_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_feature_overrides (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, flag_key)
);

INSERT INTO public.feature_flags (flag_key, plan_overrides) VALUES
  ('replay_enabled', '{"user": false, "Professional": true, "Administrator": true}'),
  ('export_enabled', '{"user": true, "Professional": true, "Administrator": true}'),
  ('advanced_filters', '{"user": false, "Professional": true, "Administrator": true}')
ON CONFLICT (flag_key) DO NOTHING;

-- =============================================================================
-- 5. Dead-letter storage for failed ingestion (async queue)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ingestion_dlq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_token TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_dlq_created 
  ON public.ingestion_dlq (created_at DESC);
