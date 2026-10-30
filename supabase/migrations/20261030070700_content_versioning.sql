-- 20261030070700_content_versioning.sql | REBUILD-01 / R1
-- نسخه‌بندی تغییرناپذیر محتوا، فقط برای راهنما در فاز R1.
-- تطبیق‌یافته از مایگریشن آزمایشگاه (MVP01-M1، شمارهٔ 008) برای شاخهٔ
-- rebuild/factory-r1 از main؛ شمارهٔ آزمایشگاه استفاده نشده و هویت این فایل
-- timestamp تازه است. بدنهٔ DDL بدون تغییر مانده تا قرارداد اثبات‌شده حفظ شود؛
-- تطبیق در هویت، سربرگ، و راستی‌آزمایی عدم تعارض با اسکیمای main است
-- (فقط جدول‌های تازه ساخته می‌شوند؛ هیچ جدول قدیمی تغییر نمی‌کند).
-- این Migration فقط DDL است و forward-only و additive است؛ هیچ DOWN مخربی
-- در این فایل نیست و هیچ Backfill داده در آن انجام نمی‌شود.
-- وضعیت در R1: DORMANT. جدول‌ها ساخته می‌شوند ولی هیچ مسیر عمومی‌ای آن‌ها را
-- نمی‌خواند و Pointer عمومی فعال نیست؛ مسیر خواندن فعلی از منبع قدیمی می‌خواند.
-- جداول قدیمی guides، guide_sections و guide_faqs حفظ می‌شوند و هیچ‌کدام
-- حذف یا بازنویسی نمی‌شوند. RLS موجود آن‌ها دست نمی‌خورد.

create table if not exists public.content_documents (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        not null,
  content_type        text        not null check (content_type in ('guide')),
  status              text        not null default 'published' check (status in ('draft', 'published', 'archived')),
  canonical_path      text        not null,
  published_version_id uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint content_documents_slug_type_unique unique (content_type, slug),
  constraint content_documents_canonical_path_unique unique (canonical_path)
);

create table if not exists public.content_versions (
  id             uuid        primary key default gen_random_uuid(),
  content_id     uuid        not null references public.content_documents (id) on delete restrict,
  version_no     integer     not null check (version_no >= 1),
  schema_version text        not null check (schema_version = 'publish_payload_v1'),
  payload        jsonb       not null,
  content_hash   text        not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz not null default now(),
  constraint content_versions_content_version_unique unique (content_id, version_no)
);

-- FK برای published_version_id بعد از ساخت هر دو جدول، تا ارجاع چرخه‌ای
-- document <-> version با NULL اولیه و سپس UPDATE ممکن بماند.
alter table public.content_documents
  drop constraint if exists content_documents_published_version_fk;
alter table public.content_documents
  add constraint content_documents_published_version_fk
  foreign key (published_version_id) references public.content_versions (id) on delete restrict;

create index if not exists content_versions_content_idx on public.content_versions (content_id);
create index if not exists content_documents_published_version_idx on public.content_documents (published_version_id);

-- تغییرناپذیری نسخه‌ها: هر UPDATE یا DELETE روی content_versions رد می‌شود،
-- برای همهٔ نقش‌ها از جمله مالک جدول، مگر اینکه Trigger عمداً غیرفعال شود
-- (عملیات مدیریتی دیتابیس، نه API عمومی).
create or replace function public.content_versions_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'content_versions are immutable';
end;
$$;

drop trigger if exists content_versions_no_update on public.content_versions;
create trigger content_versions_no_update
  before update on public.content_versions
  for each row execute function public.content_versions_immutable();

drop trigger if exists content_versions_no_delete on public.content_versions;
create trigger content_versions_no_delete
  before delete on public.content_versions
  for each row execute function public.content_versions_immutable();

-- Pointer منتشرشده باید متعلق به همان document باشد، نه document دیگر.
create or replace function public.content_documents_published_version_must_belong()
returns trigger
language plpgsql
as $$
begin
  if new.published_version_id is not null
     and not exists (
       select 1 from public.content_versions
       where id = new.published_version_id and content_id = new.id
     ) then
    raise exception 'published_version_id must belong to the same content document';
  end if;
  return new;
end;
$$;

drop trigger if exists content_documents_published_version_belongs on public.content_documents;
create trigger content_documents_published_version_belongs
  before insert or update of published_version_id on public.content_documents
  for each row execute function public.content_documents_published_version_must_belong();

-- RLS: هیچ دسترسی عمومی به پیش‌نویس‌ها نیست.
-- anon فقط documentها را می‌خواند و فقط نسخهٔ منتشرشده را می‌خواند؛
-- نسخهٔ پیش‌نویس برای anon در PostgREST خالی برمی‌گردد.
alter table public.content_documents enable row level security;
alter table public.content_versions enable row level security;

drop policy if exists content_documents_public_read on public.content_documents;
create policy content_documents_public_read
  on public.content_documents for select to anon using (true);

drop policy if exists content_versions_published_read on public.content_versions;
create policy content_versions_published_read
  on public.content_versions for select to anon using (
    id = (select published_version_id from public.content_documents where id = content_versions.content_id)
  );

-- هیچ Grant نوشتنی برای anon و authenticated روی این دو جدول نیست.
revoke insert, update, delete on public.content_documents from anon, authenticated;
revoke insert, update, delete on public.content_versions from anon, authenticated;
grant select on public.content_documents to anon, authenticated;
grant select on public.content_versions to anon, authenticated;

comment on table public.content_documents is
  'R1 rebuild/factory-r1: content document for one slug; published_version_id points to the published content_versions row of the same document. DORMANT: no public read path uses these tables yet.';
comment on table public.content_versions is
  'R1 rebuild/factory-r1: immutable full snapshots (publish_payload_v1); UPDATE and DELETE are rejected by trigger.';
