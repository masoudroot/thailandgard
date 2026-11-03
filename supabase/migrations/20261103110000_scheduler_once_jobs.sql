-- THG-SCHED-02 اصلاحیه: کار یک‌بارمصرف در ساعت داخلی.
-- Additive و idempotent. هیچ سطر موجودی تغییر نمی‌کند.
-- ۱. kind اجازهٔ 'once' می‌گیرد و شکل سطر once هم معتبر می‌شود
--    (نه فاصله دارد، نه ساعت روزانه).
-- ۲. next_due برای کار onceِ تمام‌شده null می‌شود.
-- ۳. payload برای آرگومان کار (مثل شمارهٔ PR پاک‌سازی) اضافه می‌شود.
-- ۴. کار یک‌بارمصرف بازنشستگی زمان‌بندهای بیرونی بذر می‌شود با
--    سررسید چهارشنبه ۱۴ آبان ۱۱:۳۰ تهران (۰۸:۰۰ UTC).

ALTER TABLE scheduler_jobs DROP CONSTRAINT IF EXISTS scheduler_jobs_kind_check;
ALTER TABLE scheduler_jobs DROP CONSTRAINT IF EXISTS scheduler_jobs_check;
ALTER TABLE scheduler_jobs
  ADD CONSTRAINT scheduler_jobs_kind_check CHECK (kind IN ('interval', 'daily', 'once')),
  ADD CONSTRAINT scheduler_jobs_check CHECK (
    (kind = 'interval' AND interval_minutes IS NOT NULL AND daily_utc_time IS NULL)
    OR (kind = 'daily' AND daily_utc_time IS NOT NULL AND interval_minutes IS NULL)
    OR (kind = 'once' AND interval_minutes IS NULL AND daily_utc_time IS NULL)
  );

ALTER TABLE scheduler_jobs ALTER COLUMN next_due DROP NOT NULL;
ALTER TABLE scheduler_jobs ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO scheduler_jobs (job_key, display_name, kind, interval_minutes, daily_utc_time, next_due, payload)
VALUES (
  'external_scheduler_retirement',
  'بازنشستگی زمان‌بندهای بیرونی',
  'once',
  NULL,
  NULL,
  '2026-11-04 08:00:00+00',
  '{"pr_number": 288, "workflows": ["factory-outbox-pump.yml", "factory-autonomous-daily.yml", "intel-daily.yml", "gsc-daily.yml"]}'::jsonb
)
ON CONFLICT (job_key) DO NOTHING;
