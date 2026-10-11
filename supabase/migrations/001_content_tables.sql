-- ============================================================================
-- مهاجرت 001: جدول‌های محتوای سایت تایلندگرد
-- Migration 001: ThailandGard site content tables
--
-- معماری: محتوا از این به بعد در دیتابیس زندگی می‌کند؛ سایت «موقع بیلد»
-- آن را می‌خواند و مثل الان استاتیک می‌ماند. مبدأ داده: site/lib/*.ts
--
-- Idempotent: اجرای چندباره امن است
--   (CREATE TABLE IF NOT EXISTS ، CREATE INDEX IF NOT EXISTS ،
--    DROP POLICY IF EXISTS ، GRANT تکراری خطا نمی‌دهد)
--
-- دسترسی: خواندن عمومی برای نقش anon آزاد است؛ نوشتن/ویرایش/حذف برای
-- anon باز نیست و فقط service_role (که ذاتاً از RLS رد می‌شود) می‌تواند بنویسد.
--
-- هزینه: صفر؛ فقط قابلیت استاندارد Postgres/Supabase.
-- جدول‌های فعلی leads و intel_feed دست نخورده‌اند.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ۱) تورها | tours
-- مبدأ: site/lib/tours.ts (آرایه TOURS)
-- ---------------------------------------------------------------------------
create table if not exists public.tours (
  slug         text    primary key,
  title        text    not null,
  short_title  text    not null,
  days         integer not null,
  nights       integer not null,
  route        text    not null,
  price_from   bigint  not null,
  tourist_type text    not null,
  active       boolean not null default true,
  summary      text    not null,
  description  text[]  not null default '{}',
  highlights   text[]  not null default '{}',
  includes     text[]  not null default '{}',
  excludes     text[]  not null default '{}'
);

-- ---------------------------------------------------------------------------
-- ۲) روزشمار تورها | tour_days
-- مبدأ: فیلد itinerary هر تور (day/title/description)
-- ---------------------------------------------------------------------------
create table if not exists public.tour_days (
  id         bigint generated always as identity primary key,
  tour_slug  text    not null references public.tours (slug) on delete cascade,
  day        integer not null,
  title      text    not null,
  description text   not null,
  unique (tour_slug, day)
);

-- ---------------------------------------------------------------------------
-- ۳) سؤال‌های متداول تورها | tour_faqs
-- مبدأ: فیلد faqs هر تور؛ position همان ترتیب فایل است
-- ---------------------------------------------------------------------------
create table if not exists public.tour_faqs (
  id         bigint generated always as identity primary key,
  tour_slug  text    not null references public.tours (slug) on delete cascade,
  position   integer not null,
  question   text    not null,
  answer     text    not null
);

-- ---------------------------------------------------------------------------
-- ۴) راهنماها | guides
-- مبدأ: site/lib/guides.ts (آرایه GUIDES)
-- ---------------------------------------------------------------------------
create table if not exists public.guides (
  slug            text    primary key,
  title           text    not null,
  excerpt         text    not null,
  category        text    not null,
  reading_minutes integer not null,
  updated_fa      text    not null
);

-- ---------------------------------------------------------------------------
-- ۵) بخش‌های راهنما | guide_sections
-- مبدأ: فیلد sections هر راهنما؛ position همان ترتیب فایل است
-- ---------------------------------------------------------------------------
create table if not exists public.guide_sections (
  id          bigint generated always as identity primary key,
  guide_slug  text    not null references public.guides (slug) on delete cascade,
  position    integer not null,
  heading     text    not null,
  paragraphs  text[]  not null default '{}'
);

-- ---------------------------------------------------------------------------
-- ۶) سؤال‌های متداول راهنماها | guide_faqs
-- مبدأ: فیلد faqs هر راهنما؛ position همان ترتیب فایل است
-- ---------------------------------------------------------------------------
create table if not exists public.guide_faqs (
  id          bigint generated always as identity primary key,
  guide_slug  text    not null references public.guides (slug) on delete cascade,
  position    integer not null,
  question    text    not null,
  answer      text    not null
);

-- ---------------------------------------------------------------------------
-- ۷) تنظیمات سایت | site_settings
-- مبدأ: site/lib/site.ts؛ هر اکسپورت یک سطر (key/value)؛ مقدار jsonb است
-- تا NAV_LINKS به‌صورت آرایه JSON ذخیره شود
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key   text  primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------------
-- ۸) لینک‌های مرتبط | related_links
-- مبدأ: site/lib/related.ts (نگاشت‌های GUIDE_TO_TOURS و TOUR_TO_GUIDES)
-- هر سطر: یک صفحه مبدأ و فهرست اسلاگ‌های مقصد
-- ---------------------------------------------------------------------------
create table if not exists public.related_links (
  id           bigint generated always as identity primary key,
  source_kind  text   not null check (source_kind in ('tour', 'guide')),
  source_slug  text   not null,
  target_kind  text   not null check (target_kind in ('tour', 'guide')),
  target_slugs text[] not null default '{}',
  lead         text   not null,
  trail        text   not null,
  unique (source_kind, source_slug)
);

-- ---------------------------------------------------------------------------
-- ایندکس‌های کلید خارجی (برای حذف cascade و جوین سریع)
-- FK indexes
-- ---------------------------------------------------------------------------
create index if not exists tour_days_tour_slug_idx      on public.tour_days (tour_slug);
create index if not exists tour_faqs_tour_slug_idx      on public.tour_faqs (tour_slug);
create index if not exists tour_faqs_position_idx       on public.tour_faqs (tour_slug, position);
create index if not exists guide_sections_guide_slug_idx on public.guide_sections (guide_slug);
create index if not exists guide_sections_position_idx   on public.guide_sections (guide_slug, position);
create index if not exists guide_faqs_guide_slug_idx    on public.guide_faqs (guide_slug);
create index if not exists guide_faqs_position_idx      on public.guide_faqs (guide_slug, position);
create index if not exists related_links_source_slug_idx on public.related_links (source_slug);

-- ---------------------------------------------------------------------------
-- فعال‌سازی RLS روی هر ۸ جدول
-- Enable RLS on all 8 tables
-- ---------------------------------------------------------------------------
alter table public.tours          enable row level security;
alter table public.tour_days      enable row level security;
alter table public.tour_faqs      enable row level security;
alter table public.guides         enable row level security;
alter table public.guide_sections enable row level security;
alter table public.guide_faqs     enable row level security;
alter table public.site_settings  enable row level security;
alter table public.related_links  enable row level security;

-- ---------------------------------------------------------------------------
-- پالیسی «خواندن عمومی آزاد»: فقط SELECT برای anon
-- Public read policy: SELECT for anon only (no insert/update/delete)
-- ---------------------------------------------------------------------------
drop policy if exists tours_public_read          on public.tours;
create policy tours_public_read          on public.tours          for select to anon using (true);

drop policy if exists tour_days_public_read     on public.tour_days;
create policy tour_days_public_read     on public.tour_days      for select to anon using (true);

drop policy if exists tour_faqs_public_read     on public.tour_faqs;
create policy tour_faqs_public_read     on public.tour_faqs      for select to anon using (true);

drop policy if exists guides_public_read        on public.guides;
create policy guides_public_read        on public.guides         for select to anon using (true);

drop policy if exists guide_sections_public_read on public.guide_sections;
create policy guide_sections_public_read on public.guide_sections for select to anon using (true);

drop policy if exists guide_faqs_public_read    on public.guide_faqs;
create policy guide_faqs_public_read    on public.guide_faqs     for select to anon using (true);

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings  for select to anon using (true);

drop policy if exists related_links_public_read on public.related_links;
create policy related_links_public_read on public.related_links  for select to anon using (true);

-- ---------------------------------------------------------------------------
-- گرنت SELECT برای anon (بدون گرنت، پالیسی به‌تنهایی دسترسی نمی‌دهد)
-- Table-level SELECT grant for anon (policy alone is not enough)
-- توجه: هیچ گرنتی برای insert/update/delete داده نمی‌شود
-- ---------------------------------------------------------------------------
grant select on public.tours          to anon;
grant select on public.tour_days      to anon;
grant select on public.tour_faqs      to anon;
grant select on public.guides         to anon;
grant select on public.guide_sections to anon;
grant select on public.guide_faqs     to anon;
grant select on public.site_settings  to anon;
grant select on public.related_links  to anon;

-- ---------------------------------------------------------------------------
-- کامنت‌های فارسی/انگلیسی روی جدول‌ها
-- Bilingual table comments
-- ---------------------------------------------------------------------------
comment on table public.tours is
  'تورهای سایت؛ مبدأ: site/lib/tours.ts | Site tours; source: site/lib/tours.ts';
comment on column public.tours.price_from is
  'شروع قیمت به تومان | Starting price in Toman';
comment on column public.tours.active is
  'تور فعال و قابل فروش است یا نه | Whether the tour is active and bookable';

comment on table public.tour_days is
  'روزشمار هر تور؛ مبدأ: فیلد itinerary | Per-tour itinerary days; source: itinerary field';
comment on column public.tour_days.day is
  'شماره روز در برنامه سفر | Day number within the itinerary';

comment on table public.tour_faqs is
  'سؤال‌های متداول هر تور؛ position همان ترتیب فایل مبدأ است | Per-tour FAQs; position preserves source file order';

comment on table public.guides is
  'راهنماهای سفر؛ مبدأ: site/lib/guides.ts | Travel guides; source: site/lib/guides.ts';
comment on column public.guides.updated_fa is
  'تاریخ به‌روزرسانی به فارسی، مثل «۱۹ مهر ۱۴۰۵» | Update date in Persian, e.g. «۱۹ مهر ۱۴۰۵»';

comment on table public.guide_sections is
  'بخش‌های هر راهنما؛ position همان ترتیب فایل مبدأ است | Per-guide sections; position preserves source file order';

comment on table public.guide_faqs is
  'سؤال‌های متداول هر راهنما؛ position همان ترتیب فایل مبدأ است | Per-guide FAQs; position preserves source file order';

comment on table public.site_settings is
  'ثابت‌های سراسری سایت؛ مبدأ: site/lib/site.ts؛ هر اکسپورت یک سطر | Global site constants; source: site/lib/site.ts; one row per export';

comment on table public.related_links is
  'لینک‌های داخلی پیشنهادی تیم سئومحتوا؛ مبدأ: site/lib/related.ts | SEO internal link blocks; source: site/lib/related.ts';
