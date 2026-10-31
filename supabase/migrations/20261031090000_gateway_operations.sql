-- R3B: عملیات منطقی Gateway و اتصال به Attempt واقعی Tick.
-- فقط additive است: یک جدول تازه و دو ایندکس یکتا؛ هیچ جدول یا تابع
-- موجودی تغییر نمی‌کند. اول روی Scratch تازه اعمال و راستی‌آزمایی
-- شده و بعد فقط روی Supabase Staging اجرا می‌شود؛ هرگز Production.
--
-- چرا این جدول لازم است:
-- - تا پیش از این، شناسهٔ عملیات منطقی فقط در حافظهٔ Gateway بود و
--   پس از راه‌اندازی تازه، رزروِ نگه‌داشته‌شده فقط با
--   factory_attempt_id قابل کشف بود؛ ولی این‌که Provider صدا زده
--   شده یا پاسخ رسیده یا تسویه نشسته، هیچ سطر بادوامی نداشت.
-- - این جدول، هر تلاش را با شناسهٔ پایدار عملیات منطقی
--   (logical_operation_id) به Work Item و Step و سطر واقعی
--   factory_attempts می‌بندد و چهار حالت بازیابی (رزرو بدون ارسال،
--   ارسال با نتیجهٔ نامعلوم، پاسخ رسیده بدون Settlement، تسویه‌شده
--   بدون بازگشت به Work Item) را از روی سطرهای پایدار قابل
--   شناسایی می‌کند؛ بدون ژورنال حافظه.
-- - ایندکس یکتای جزئی روی حالت‌های باز، تضمین دیتابیسی است که
--   تلاش تازه با attempt یا کلید تازه، تا تعیین تکلیف عملیات باز،
--   راه میان‌بری برای تکرار نیست.

create table if not exists public.factory_gateway_operations (
  id uuid primary key default gen_random_uuid(),
  logical_operation_id text not null,
  work_item_id uuid not null references public.factory_work_items (id),
  work_step_id uuid not null references public.factory_work_steps (id),
  factory_attempt_id uuid references public.factory_attempts (id),
  -- شناسهٔ attempt خود Gateway (uuid تازهٔ هر فراخوان) که سطرهای
  -- تسویه و مصالحه با آن کلید می‌خورند؛ برای reconcile لازم است و
  -- با factory_attempt_id فرق دارد.
  gateway_attempt_id uuid,
  attempt_no integer,
  operation_name text not null,
  idempotency_key text not null,
  input_fingerprint text not null,
  state text not null
    check (state in (
      'pending',
      'reserved',
      'sent',
      'unknown',
      'response_recorded',
      'settled_unreturned',
      'settled',
      'released',
      'referred',
      'failed',
      'abandoned'
    )),
  reserved_amount numeric not null default 0,
  settled_amount numeric,
  actual_cost numeric,
  estimated_cost numeric not null default 0,
  unresolved_excess numeric,
  cost_basis text
    check (cost_basis in ('simulated', 'provider_actual', 'estimated')),
  cost_unit text not null default '',
  provider_calls integer not null default 0,
  response_json jsonb,
  prior_operation_id uuid references public.factory_gateway_operations (id),
  retry_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فقط یک عملیات باز برای هر عملیات منطقی. حالت‌های پایانی
-- (settled و released و referred و failed و abandoned) از این قید
-- بیرون‌اند تا تلاش تازه پس از تعیین تکلیف، با سطر تازه و دلیل
-- ثبت‌شده ممکن باشد.
create unique index if not exists factory_gateway_operations_open_op_uidx
  on public.factory_gateway_operations (logical_operation_id)
  where state in (
    'pending',
    'reserved',
    'sent',
    'unknown',
    'response_recorded',
    'settled_unreturned'
  );

-- کلید idempotency در سراسر جدول یکتاست: replay همان کلید همان
-- نتیجه را می‌دهد و همان کلید با ورودی متفاوت، از روی
-- input_fingerprint به‌عنوان conflict شناخته می‌شود.
create unique index if not exists factory_gateway_operations_key_uidx
  on public.factory_gateway_operations (idempotency_key);

alter table public.factory_gateway_operations enable row level security;
revoke all on table public.factory_gateway_operations from anon, authenticated;
grant select, insert, update on table public.factory_gateway_operations to service_role;
