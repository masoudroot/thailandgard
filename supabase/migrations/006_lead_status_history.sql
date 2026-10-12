-- 006: تاریخچهٔ تغییر وضعیت لید (insert-only، بدون PII)
-- اسپک: agents/analytics/SPECS/lead-status-history-2026-10-12-1555.md
-- چرا: پیری وضعیت، میانگین زمان پاسخ اول و نرخ تبدیل مرحله‌ای بدون این جدول
-- قابل محاسبه نیست. فقط رو به جلو؛ backfill ندارد.
-- افزایشی و idempotent: IF NOT EXISTS؛ اجرای دوباره بی‌اثر است.
-- اجرا: مسعود در SQL Editor (مثل ۰۰۵). این فایل هرگز خودکار اجرا نمی‌شود.
--
-- فرض نوع داده (راستی‌آزمایی‌نشده با کلید ایجنت؛ RLS خواندن leads را بسته است):
-- ستون lead_id هم‌نوع public.leads(id) فرض شده: uuid (طبق اسپک تحلیل).
-- اگر leads.id از نوع دیگری بود، اجرای این مایگریشن با خطای کلید خارجی
-- می‌خوابد (شکست بلند و امن)؛ آن‌وقت نوع ستون را با همان نوع واقعی بسازید.

create table if not exists public.lead_status_history (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  old_status  text,
  new_status  text not null,
  -- چه کسی وضعیت را عوض کرد (اختیاری؛ nullable). فعلاً سیستم لاگین فروش نداریم،
  -- پس هر جا منبع تغییر معلوم است (مثلاً «پنل فروش»، «وب‌هوک») بنویسید وگرنه null.
  -- برای پاسخ‌گویی SLA در آینده به درد می‌خورد؛ هیچ FK به جدول کاربر ندارد چون چنین جدولی نیست.
  changed_by   text,
  changed_at  timestamptz not null default now(),
  check (new_status in ('new', 'contacted', 'done')),
  check (old_status is null or old_status in ('new', 'contacted', 'done'))
);

create index if not exists idx_lsh_lead on public.lead_status_history (lead_id, changed_at);
-- نکته: ایندکس btree در هر دو جهت (صعودی/نزولی) اسکن می‌شود؛
-- «آخرین وضعیت هر لید» با همین ایندکس و order by changed_at desc جواب می‌دهد.
create index if not exists idx_lsh_changed on public.lead_status_history (changed_at);

comment on table public.lead_status_history is
  'تاریخچهٔ فقط‌درج تغییر وضعیت لید؛ سنجه‌های پیری وضعیت، زمان پاسخ اول و نرخ تبدیل مرحله‌ای';

alter table public.lead_status_history enable row level security;

-- خواندن برای anon آزاد است: جدول PII ندارد (فقط شناسه و زمان).
-- پایش SLA و میانگین پاسخ اول تیم‌ها از همین مسیر anon کار می‌کند.
drop policy if exists "anon read history" on public.lead_status_history;
create policy "anon read history"
  on public.lead_status_history
  for select to anon using (true);

-- عمداً هیچ پالیسی insert/update/delete برای anon نیست.
-- نوشتن فقط با service_role از سمت سرور انجام می‌شود؛
-- service_role ذاتاً از RLS رد می‌شود و پالیسی جدا نمی‌خواهد.
