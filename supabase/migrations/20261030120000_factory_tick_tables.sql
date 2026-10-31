-- REBUILD-R2: جدول‌های هستهٔ کارخانهٔ یکپارچه، Work Item و Outbox.
-- تاریخ: 2026-10-30. فقط Staging. هیچ Migration قبلی تغییر نمی‌کند؛
-- هیچ جدولی حذف نمی‌شود؛ فقط افزودنی و روبه‌جلو.
-- پیش‌نیاز: Migration نسخه‌بندی R1 (20261030070700) باید پیش‌تر اجرا
-- شده باشد، چون جدول‌های content_documents و content_versions از آن
-- می‌آیند.
-- منشأ: تعریف‌های نهایی آزمایشگاه MVP-01 (009 تا 018) که این‌جا در
-- دو فایل R2 تا شده‌اند؛ این فایل جدول‌ها، فایل بعدی Functionها.
-- تفاوت‌های عمدی نسبت به آزمایشگاه (ثبت‌شده، نه فراموش‌شده):
-- ۱) بازتعریف تریگر content_versions_immutable از 012 این‌جا نیست؛
--    تریگر R1 از 008 می‌ماند و سخت‌گیرانه‌تر است (هیچ Updateای، حتی
--    برای پرچم Fixture، مجاز نیست). مسیر Tick هرگز آن جدول را Update
--    نمی‌کند، پس رفتار مسیر یکسان است.
-- ۲) ستون‌های is_test_fixture از 012 فقط به‌عنوان Schema آمده‌اند
--    (کد Tick و Functionها آن‌ها را می‌خوانند)؛ هیچ سطر Fixture ساخته
--    نمی‌شود و هیچ دادهٔ آزمایشگاهی منتقل نمی‌شود.
-- ۳) جدول‌های Shadow (019 تا 024) این‌جا نیستند؛ R2 فقط گردش راهنما
--    (guide_content_v1) را می‌آورد.
-- همهٔ جدول‌های کارخانه RLS دارند و بدون Policy؛ فقط service_role.
-- روی دیتابیس Staging که همهٔ این جدول‌ها را از قبل دارد، این فایل
-- یک No-op معنایی است (CREATE IF NOT EXISTS و ADD COLUMN IF NOT
-- EXISTS) و هیچ سطری تغییر نمی‌کند.

-- Schema موردنیاز کد Tick و Functionها، از 012 (فقط ستون، نه داده).
alter table public.content_documents
  add column if not exists is_test_fixture boolean not null default false;
alter table public.content_versions
  add column if not exists is_test_fixture boolean not null default false;

-- Publication و Outbox انتشار محتوا (009 + ستون‌های 010، 013، 014، 015
-- که در CREATE تا شده‌اند؛ work_item_id و approval_id از 016، پس از
-- ساخته‌شدن جدول‌های Work Item و Approval اضافه می‌شوند).
create table if not exists public.factory_publications (
  id                  uuid        primary key default gen_random_uuid(),
  content_id          uuid        not null references public.content_documents (id) on delete restrict,
  version_id          uuid        not null references public.content_versions (id) on delete restrict,
  previous_version_id uuid        references public.content_versions (id) on delete restrict,
  status              text        not null default 'pending'
    check (status in ('pending', 'dispatched', 'verifying', 'verified', 'retry_scheduled', 'needs_intervention')),
  idempotency_key     text        not null,
  requested_at        timestamptz not null default now(),
  verified_at         timestamptz,
  attempts            integer     not null default 0 check (attempts >= 0),
  last_error          text,
  created_at          timestamptz not null default now(),
  fencing_token       bigint      not null default 0,
  publication_kind    text        not null default 'publish'
    check (publication_kind in ('publish', 'rollback')),
  rollback_of_publication_id uuid
    references public.factory_publications (id) on delete restrict,
  reason              text,
  dispatch_attempts   integer     not null default 0,
  verification_attempts integer   not null default 0,
  redispatch_attempts integer     not null default 0,
  dispatch_instance_id text,
  constraint factory_publications_idempotency_unique unique (idempotency_key)
);

create table if not exists public.factory_outbox_events (
  id              uuid        primary key default gen_random_uuid(),
  publication_id  uuid        not null references public.factory_publications (id) on delete restrict,
  event_type      text        not null check (event_type = 'content_published'),
  payload         jsonb       not null,
  status          text        not null default 'pending'
    check (status in ('pending', 'claimed', 'succeeded', 'failed')),
  attempts        integer     not null default 0 check (attempts >= 0),
  max_attempts    integer     not null default 5 check (max_attempts >= 1),
  next_attempt_at timestamptz,
  lease_owner     text,
  lease_until     timestamptz,
  idempotency_key text        not null,
  last_error      text,
  created_at      timestamptz not null default now(),
  processed_at    timestamptz,
  fencing_token   bigint      not null default 0,
  dispatch_attempts integer   not null default 0,
  verification_attempts integer not null default 0,
  dispatch_done   boolean     not null default false,
  verify_after    timestamptz,
  redispatch_attempts integer not null default 0,
  dispatch_instance_id text,
  constraint factory_outbox_publication_unique unique (publication_id),
  constraint factory_outbox_idempotency_unique unique (idempotency_key)
);

create index if not exists factory_publications_content_idx on public.factory_publications (content_id);
create index if not exists factory_publications_rollback_of_idx on public.factory_publications (rollback_of_publication_id);
create index if not exists factory_outbox_pending_idx on public.factory_outbox_events (status, next_attempt_at, created_at);

alter table public.factory_publications enable row level security;
alter table public.factory_outbox_events enable row level security;

revoke all on public.factory_publications from anon, authenticated;
revoke all on public.factory_outbox_events from anon, authenticated;
grant select, insert, update on public.factory_publications to service_role;
grant select, insert, update on public.factory_outbox_events to service_role;

-- سابقهٔ Audit فقط‌خواندنی (011).
create table if not exists public.factory_audit_events (
  id              uuid        primary key default gen_random_uuid(),
  publication_id  uuid        not null references public.factory_publications (id) on delete restrict,
  outbox_id       uuid        references public.factory_outbox_events (id) on delete restrict,
  kind            text        not null check (kind in ('claim', 'failure', 'retry', 'verified', 'intervention', 'publish')),
  status_from     text,
  status_to       text,
  error           text,
  attempts        integer,
  fencing_token   bigint,
  created_at      timestamptz not null default now()
);

create index if not exists factory_audit_publication_idx on public.factory_audit_events (publication_id, created_at);

alter table public.factory_audit_events enable row level security;

revoke all on public.factory_audit_events from anon, authenticated;
grant select, insert on public.factory_audit_events to service_role;

-- Work Item (016 + ستون‌های بودجه از 017 + قرارداد Tick از 018).
create table if not exists public.factory_work_items (
  id                  uuid        primary key default gen_random_uuid(),
  work_key            text        not null,
  work_type           text        not null,
  title               text        not null,
  description         text,
  status              text        not null default 'queued'
    check (status in ('queued', 'drafting', 'awaiting_approval', 'approved', 'publishing', 'succeeded', 'blocked', 'cancelled')),
  content_id          uuid        not null references public.content_documents (id) on delete restrict,
  acceptance_criteria jsonb       not null default '[]'::jsonb,
  result_artifact_id  uuid,
  result_version_id   uuid        references public.content_versions (id) on delete restrict,
  publication_id      uuid        references public.factory_publications (id) on delete restrict,
  last_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz,
  budget_limit        numeric     not null default 0,
  budget_spent        numeric     not null default 0,
  max_attempts        integer     not null default 5,
  execution_mode      text        not null default 'manual'
    check (execution_mode in ('manual', 'tick_managed')),
  workflow_version    text,
  constraint factory_work_items_work_key_unique unique (work_key),
  constraint factory_work_items_tick_managed_needs_workflow
    check (execution_mode <> 'tick_managed' or workflow_version is not null)
);

create index if not exists factory_work_items_content_idx on public.factory_work_items (content_id);
create index if not exists factory_work_items_status_idx on public.factory_work_items (status);

-- Artifact با تغییرناپذیری (016).
create table if not exists public.factory_artifacts (
  id             uuid        primary key default gen_random_uuid(),
  work_item_id   uuid        not null references public.factory_work_items (id) on delete restrict,
  artifact_type  text        not null,
  schema_version text        not null check (schema_version = 'publish_payload_v1'),
  payload        jsonb       not null,
  artifact_hash  text        not null check (artifact_hash ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz not null default now()
);

create index if not exists factory_artifacts_work_item_idx on public.factory_artifacts (work_item_id);

create or replace function public.factory_artifacts_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'factory_artifacts are immutable';
end;
$$;

drop trigger if exists factory_artifacts_immutable_trigger on public.factory_artifacts;
create trigger factory_artifacts_immutable_trigger
  before update or delete on public.factory_artifacts
  for each row execute function public.factory_artifacts_immutable();

alter table public.factory_work_items
  add column if not exists budget_limit numeric not null default 0,
  add column if not exists budget_spent numeric not null default 0,
  add column if not exists max_attempts integer not null default 5;

alter table public.factory_work_items
  add column if not exists execution_mode text not null default 'manual'
    check (execution_mode in ('manual', 'tick_managed')),
  add column if not exists workflow_version text;

alter table public.factory_work_items
  drop constraint if exists factory_work_items_result_artifact_fk;
alter table public.factory_work_items
  add constraint factory_work_items_result_artifact_fk
    foreign key (result_artifact_id) references public.factory_artifacts (id) on delete restrict;

-- Approval (016).
create table if not exists public.factory_approvals (
  id             uuid        primary key default gen_random_uuid(),
  work_item_id   uuid        not null references public.factory_work_items (id) on delete restrict,
  artifact_id    uuid        not null references public.factory_artifacts (id) on delete restrict,
  artifact_hash  text        not null check (artifact_hash ~ '^[0-9a-f]{64}$'),
  decision       text        not null check (decision in ('approved', 'rejected')),
  reviewer_id    text        not null,
  decision_reason text,
  created_at     timestamptz not null default now()
);

create index if not exists factory_approvals_work_item_idx on public.factory_approvals (work_item_id);
create index if not exists factory_approvals_artifact_idx on public.factory_approvals (artifact_id);

alter table public.factory_work_items enable row level security;
alter table public.factory_artifacts enable row level security;
alter table public.factory_approvals enable row level security;

-- پیوند Publication به Work Item و Approval (016)، پس از ساخته‌شدن
-- هر سه جدول.
alter table public.factory_publications
  add column if not exists work_item_id uuid
    references public.factory_work_items (id) on delete restrict,
  add column if not exists approval_id uuid
    references public.factory_approvals (id) on delete restrict;

create index if not exists factory_publications_work_item_idx on public.factory_publications (work_item_id);
create index if not exists factory_publications_approval_idx on public.factory_publications (approval_id);

-- نگهبان‌های ستونی برای دیتابیس‌های نیمه‌کاره (روی Fresh و Staging
-- همه No-op هستند؛ Constraintها با CREATE می‌آیند و روی Staging از
-- قبل وجود دارند).
alter table public.factory_publications
  add column if not exists fencing_token bigint not null default 0,
  add column if not exists publication_kind text not null default 'publish'
    check (publication_kind in ('publish', 'rollback')),
  add column if not exists rollback_of_publication_id uuid
    references public.factory_publications (id) on delete restrict,
  add column if not exists reason text,
  add column if not exists dispatch_attempts integer not null default 0,
  add column if not exists verification_attempts integer not null default 0,
  add column if not exists redispatch_attempts integer not null default 0,
  add column if not exists dispatch_instance_id text;

alter table public.factory_outbox_events
  add column if not exists fencing_token bigint not null default 0,
  add column if not exists dispatch_attempts integer not null default 0,
  add column if not exists verification_attempts integer not null default 0,
  add column if not exists dispatch_done boolean not null default false,
  add column if not exists verify_after timestamptz,
  add column if not exists redispatch_attempts integer not null default 0,
  add column if not exists dispatch_instance_id text;

-- Step، Attempt، Run، Setting، Ledger و بودجهٔ روزانه (017).
create table if not exists public.factory_work_steps (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.factory_work_items (id),
  step_key text not null,
  sequence_no integer not null,
  status text not null default 'queued'
    check (status in ('queued', 'claimed', 'succeeded', 'failed', 'blocked')),
  assigned_executor text,
  input_artifact_id uuid references public.factory_artifacts (id),
  output_artifact_id uuid references public.factory_artifacts (id),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  lease_owner text,
  lease_until timestamptz,
  fencing_token integer not null default 0,
  idempotency_key text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (work_item_id, step_key),
  unique (work_item_id, sequence_no)
);

create table if not exists public.factory_attempts (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.factory_work_items (id),
  work_step_id uuid not null references public.factory_work_steps (id),
  attempt_no integer not null,
  executor_key text not null,
  finish_status text not null default 'started'
    check (finish_status in ('started', 'succeeded', 'failed', 'timeout', 'outcome_unknown')),
  reconciliation_status text not null default 'not_required'
    check (reconciliation_status in ('not_required', 'pending', 'resolved', 'retry_allowed', 'needs_intervention')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  provider_request_id text,
  estimated_cost numeric not null default 0,
  actual_cost numeric not null default 0,
  error_code text
);

create table if not exists public.factory_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null,
  runner_version text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  run_status text not null default 'running'
    check (run_status in ('running', 'completed', 'failed')),
  items_claimed integer not null default 0,
  items_completed integer not null default 0,
  items_failed integer not null default 0,
  request_id text
);

create table if not exists public.factory_settings (
  key text primary key,
  value text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.factory_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.factory_work_items (id),
  attempt_id uuid references public.factory_attempts (id),
  entry_kind text not null
    check (entry_kind in ('reservation', 'commit', 'release', 'rejected')),
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.factory_daily_budgets (
  budget_date date primary key,
  daily_limit numeric not null default 0,
  daily_spent numeric not null default 0
);

alter table public.factory_work_steps enable row level security;
alter table public.factory_attempts enable row level security;
alter table public.factory_runs enable row level security;
alter table public.factory_settings enable row level security;
alter table public.factory_cost_ledger enable row level security;
alter table public.factory_daily_budgets enable row level security;

-- بذر Kill Switchها (017)؛ Fail-closed در کد Tick است.
insert into public.factory_settings (key, value) values
  ('factory_paused', 'false'),
  ('generation_enabled', 'false'),
  ('data_publishing_enabled', 'true'),
  ('discovery_enabled', 'false'),
  ('code_agents_enabled', 'false'),
  ('daily_budget_limit', '0')
on conflict (key) do nothing;
