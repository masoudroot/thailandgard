-- THG-SCHED-02: ساعت داخلی پروژه.
-- Additive و idempotent. هیچ سطر موجودی تغییر نمی‌کند و هیچ جدولی
-- حذف نمی‌شود. بذر چهار کار فقط وقتی درج می‌شود که job_key نباشد.
-- تصمیم «چه وقت» فقط از scheduler_jobs خوانده می‌شود؛ هیچ زمان‌بند
-- بیرونی (GitHub Actions، Vercel Cron، دیسپچر) در این جدول نیست.

CREATE TABLE IF NOT EXISTS scheduler_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('interval', 'daily')),
  interval_minutes integer CHECK (interval_minutes IS NULL OR interval_minutes BETWEEN 1 AND 1440),
  daily_utc_time time CHECK (daily_utc_time IS NULL OR kind = 'daily'),
  enabled boolean NOT NULL DEFAULT true,
  next_due timestamptz NOT NULL,
  last_run_at timestamptz,
  last_status text,
  last_result jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'interval' AND interval_minutes IS NOT NULL AND daily_utc_time IS NULL)
    OR (kind = 'daily' AND daily_utc_time IS NOT NULL AND interval_minutes IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS scheduler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('worker_loop', 'manual_proof', 'dashboard')),
  source text NOT NULL DEFAULT 'internal_worker',
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS scheduler_runs_job_time_idx
  ON scheduler_runs (job_key, started_at DESC);
CREATE INDEX IF NOT EXISTS scheduler_runs_source_time_idx
  ON scheduler_runs (source, started_at DESC);

-- بذر چهار کار. next_due کار فاصله‌ای همان لحظه است؛ کارهای روزانه
-- به نزدیک‌ترین وقوع بعدی زمان UTCشان می‌رسند.
INSERT INTO scheduler_jobs (job_key, display_name, kind, interval_minutes, daily_utc_time, next_due)
VALUES
  ('tick_pump', 'تیک و پمپ', 'interval', 5, NULL, now()),
  ('autonomous_daily', 'چرخهٔ روزانهٔ خودمختار', 'daily', NULL, '02:00',
    CASE
      WHEN (((now() AT TIME ZONE 'UTC')::date + TIME '02:00') AT TIME ZONE 'UTC') > now()
      THEN (((now() AT TIME ZONE 'UTC')::date + TIME '02:00') AT TIME ZONE 'UTC')
      ELSE (((now() AT TIME ZONE 'UTC')::date + TIME '02:00') AT TIME ZONE 'UTC') + INTERVAL '1 day'
    END),
  ('intel_daily', 'جمع‌آوری خبر تایلند', 'daily', NULL, '04:00',
    CASE
      WHEN (((now() AT TIME ZONE 'UTC')::date + TIME '04:00') AT TIME ZONE 'UTC') > now()
      THEN (((now() AT TIME ZONE 'UTC')::date + TIME '04:00') AT TIME ZONE 'UTC')
      ELSE (((now() AT TIME ZONE 'UTC')::date + TIME '04:00') AT TIME ZONE 'UTC') + INTERVAL '1 day'
    END),
  ('gsc_daily', 'دادهٔ سرچ کنسول', 'daily', NULL, '02:30',
    CASE
      WHEN (((now() AT TIME ZONE 'UTC')::date + TIME '02:30') AT TIME ZONE 'UTC') > now()
      THEN (((now() AT TIME ZONE 'UTC')::date + TIME '02:30') AT TIME ZONE 'UTC')
      ELSE (((now() AT TIME ZONE 'UTC')::date + TIME '02:30') AT TIME ZONE 'UTC') + INTERVAL '1 day'
    END)
ON CONFLICT (job_key) DO NOTHING;
