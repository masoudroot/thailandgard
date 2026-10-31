-- R3A-SAFE: جدول‌های تسویه و مصالحهٔ Gateway و RPC تسویهٔ اتمیک.
-- فقط additive است: دو جدول تازه و یک تابع تازه؛ هیچ جدول یا تابع
-- موجودی تغییر نمی‌کند. اول روی Scratch تازه اعمال و راستی‌آزمایی
-- شده و بعد فقط روی Supabase Staging اجرا می‌شود؛ هرگز Production.
--
-- چرا این Migration لازم است:
-- - تسویهٔ release+commit تا پیش از این دو فراخوان جدا بود و Crash
--   میان آن دو، وضعیت ناسازگار می‌ساخت. RPC تازه هر دو را با سطر
--   تسویه در یک تراکنش می‌نویسد و کلید یکتا، تکرار را بی‌اثر می‌کند.
-- - نتیجهٔ نامعلوم (timeout) تا پیش از این فقط در حافظهٔ Gateway بود
--   و پس از راه‌اندازی تازه گم می‌شد. جدول مصالحه، وضعیت باز را با
--   actor و دلیل و شواهد، بادوام نگه می‌دارد.

create table if not exists public.factory_gateway_settlements (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  work_item_id uuid not null references public.factory_work_items (id),
  attempt_id uuid not null,
  factory_attempt_id uuid references public.factory_attempts (id),
  released_amount numeric not null,
  committed_amount numeric,
  cost_basis text not null
    check (cost_basis in ('simulated', 'provider_actual', 'estimated')),
  created_at timestamptz not null default now()
);

create table if not exists public.factory_gateway_reconciliations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  work_item_id uuid not null references public.factory_work_items (id),
  attempt_id uuid not null,
  factory_attempt_id uuid references public.factory_attempts (id),
  kind text not null check (kind in ('unknown', 'excess')),
  estimated_cost numeric not null,
  excess_amount numeric,
  status text not null
    check (status in (
      'pending_reconciliation',
      'resolved_released',
      'resolved_committed',
      'referred_to_human'
    )),
  reason text not null,
  evidence text,
  actor text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.factory_gateway_settlements enable row level security;
alter table public.factory_gateway_reconciliations enable row level security;
revoke all on table public.factory_gateway_settlements from anon, authenticated;
revoke all on table public.factory_gateway_reconciliations from anon, authenticated;
grant select, insert on table public.factory_gateway_settlements to service_role;
grant select, insert, update on table public.factory_gateway_reconciliations to service_role;

-- settle_gateway_attempt: تسویهٔ idempotent در یک تراکنش.
-- فراخوان دوم با همان کلید، already_settled برمی‌گرداند و سطر
-- تازه نمی‌سازد. commit تهی یعنی سطر commit نوشته نمی‌شود
-- (تسویهٔ صرفاً آزادسازی) و release صفر یعنی سطر release نوشته
-- نمی‌شود. به‌روزرسانی خرج کار و خرج روز، آینهٔ RPCهای موجود است.
create or replace function public.settle_gateway_attempt(
  p_work_item_id uuid,
  p_factory_attempt_id uuid,
  p_gateway_attempt_id uuid,
  p_idempotency_key text,
  p_release_amount numeric,
  p_commit_amount numeric,
  p_cost_basis text
)
returns table (settled boolean, already_settled boolean)
language plpgsql
as $$
begin
  insert into public.factory_gateway_settlements
    (idempotency_key, work_item_id, attempt_id, factory_attempt_id,
     released_amount, committed_amount, cost_basis)
    values (p_idempotency_key, p_work_item_id, p_gateway_attempt_id,
            p_factory_attempt_id,
            coalesce(p_release_amount, 0), p_commit_amount, p_cost_basis)
    on conflict (idempotency_key) do nothing;
  if not found then
    return query select false, true;
    return;
  end if;

  if p_release_amount is not null and p_release_amount > 0 then
    insert into public.factory_cost_ledger (work_item_id, attempt_id, entry_kind, amount)
      values (p_work_item_id, p_factory_attempt_id, 'release', p_release_amount);
    update public.factory_work_items
      set budget_spent = greatest(0, budget_spent - p_release_amount)
      where id = p_work_item_id;
    update public.factory_daily_budgets
      set daily_spent = greatest(0, daily_spent - p_release_amount)
      where budget_date = current_date;
  end if;

  if p_commit_amount is not null then
    insert into public.factory_cost_ledger (work_item_id, attempt_id, entry_kind, amount)
      values (p_work_item_id, p_factory_attempt_id, 'commit', p_commit_amount);
  end if;

  return query select true, false;
end;
$$;

revoke execute on function public.settle_gateway_attempt(uuid, uuid, uuid, text, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.settle_gateway_attempt(uuid, uuid, uuid, text, numeric, numeric, text) to service_role;
