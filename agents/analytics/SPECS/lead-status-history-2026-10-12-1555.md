# اسپک اجرایی: جدول `lead_status_history` | ۲۰ مهر ۱۴۰۵، ساعت ۱۵:۵۵

تهیه‌کننده: تیم تحلیل و آنالیز (run-1546-1791807388). اجرا با تیم dev در فاز ۴ همین اجرا. هزینه صفر؛ هیچ سکرتی در ریپو.

## ۱. چرا لازم است

جدول `leads` فقط `created_at` دارد؛ زمان ورود لید به هر وضعیت (`new`، `contacted`، `done`) هیچ‌جا ثبت نمی‌شود. بدون این جدول سه سنجهٔ حیاتی قیف لید قابل محاسبه نیست:

- **پیری وضعیت (stage aging):** لید چند ساعت در `new` مانده؟ این همان چیزی است که SLA شش‌ساعتهٔ تیم لید روی آن سوار است.
- **میانگین زمان پاسخ اول:** از ثبت لید تا اولین تماس فروش چقدر طول کشید؟
- **نرخ تبدیل مرحله‌ای:** چند درصد از `new` به `contacted` و از `contacted` به `done` می‌رسند؟

معیار شمال تیم تحلیل «تماس به‌ازای هر هزار بازدید» است؛ نیمهٔ دومش همین است. بدون تاریخچه، گزارش لید روی «چند لید» می‌ماند و به «لیدها چه سرنوشتی داشتند» نمی‌رسد.

چرا جدول جدا و نه ستون `status_changed_at` روی `leads`؟ ستون فقط پیری وضعیت «فعلی» را می‌دهد؛ نرخ تبدیل مرحله‌ای و زمان پاسخ اول به «هر تغییر» نیاز دارد، نه فقط آخرین وضعیت. تصمیم: جدول تاریخچه.

قاعدهٔ فقط رو به جلو (درس HubSpot): برای لیدهای قدیمی بازسازی نمی‌شود؛ از روز اجرا به بعد ثبت می‌شود. هیچ backfill.

## ۲. ساختار جدول (مایگریشن 006)

نام فایل: `supabase/migrations/006_lead_status_history.sql`؛ idempotent طبق قرارداد ریپو (`IF NOT EXISTS`).

```sql
-- 006: تاریخچهٔ تغییر وضعیت لید (insert-only، بدون PII)
-- اسپک: agents/analytics/SPECS/lead-status-history-2026-10-12-1555.md
-- چرا: پیری وضعیت، میانگین زمان پاسخ اول و نرخ تبدیل مرحله‌ای بدون این جدول
-- قابل محاسبه نیست. فقط رو به جلو؛ backfill ندارد.

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
```

نکتهٔ نوع داده (dev حتماً چک کند): ستون `lead_id` باید دقیقاً هم‌نوع `public.leads(id)` باشد. اگر `leads.id` از نوع `uuid` نبود، نوع ستون و کلید خارجی را با همان نوع بساز؛ حدس نزن، اول `\d public.leads` یا `information_schema` را ببین.

قرارداد ردیف‌ها:

- ردیف اول هر لید: `old_status = null`، `new_status = 'new'` (رویداد ثبت).
- هر تغییر وضعیت: یک ردیف تازه. هرگز update یا delete روی این جدول نیست.
- برای لیدهای قدیمیِ قبل از اجرا، ردیف ساخته نمی‌شود (فقط رو به جلو).

## ۳. RLS

```sql
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
```

اگر تیم امنیتی خواست، می‌شود `authenticated` را هم از خواندن منع کرد؛ الان لازم نیست چون دادهٔ شخصی نیست.

## ۴. کد سمت سرور (چه باید بنویسد dev)

هر جا که امروز وضعیت لید عوض می‌شود (هر `update leads set status = ...`، هر پنل/روت/اکشنی که فروش با آن وضعیت را عوض می‌کند):

۱. در همان تراکنش، اول ردیف تاریخچه درج شود (`old_status` = وضعیت قبلی، `new_status` = وضعیت تازه)، بعد خود ردیف `leads` آپدیت شود. ترتیب مهم است: اگر insert شکست، آپدیت هم نباید انجام شود.
۲. هم‌زمان ردیف `lead-alert` «تغییر وضعیت» هم در `intel_feed` درج شود (قالب در اسپک SLA ساعت ۱۰ روز ۱۹ مهر: `agents/analytics/SPECS/sla-monitoring-2026-10-11-1035.md` بخش ۲)؛ وگرنه «پاسخ داده شد یا نه» از مسیر anon قابل تشخیص نیست.
۳. در مسیر ثبت لید تازه (`callback-store`)، همان تراکنش ثبت، ردیف اول تاریخچه (`old=null`، `new='new'`) هم درج شود.

## ۵. سنجه‌هایی که بعد از ساخت، باز می‌شوند (مصرف‌کننده‌ها)

- تیم تحلیل (کارت‌های ۰۱، ۰۲، ۰۹، ۱۱): پیری وضعیت، زمان پاسخ اول، نرخ تبدیل مرحله‌ای.
- تیم لید: پایش SLA با «پیری واقعی وضعیت» به‌جای `created_at`.
- گزارش مدیر: «لیدها چه سرنوشتی داشتند» به‌جای «چند لید ثبت شد».

## ۶. تست qa (راستی‌آزمایی پس از پیاده‌سازی)

- ثبت لید تستی → دقیقاً یک ردیف تاریخچه با `old=null` و `new='new'`.
- تغییر وضعیت `new` به `contacted` → ردیف دوم با `old='new'` و `new='contacted'` و `changed_at` تازه.
- خواندن با کلید anon → ۲۰۰ و فقط ستون‌های همین جدول.
- نوشتن با کلید anon → ۴۰۳.
- ردیف `lead-alert` تغییر وضعیت در `intel_feed` با همان `lead_id`.

## وضعیت

پیشنهادی / آمادهٔ اجرا در فاز ۴ همین اجرا. بازبینی نهایی با تیم dev هنگام پیاده‌سازی؛ بست نهایی با بازبینی بازرس.
