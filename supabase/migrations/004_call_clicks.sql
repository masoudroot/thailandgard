-- 004: ردیاب تماس (قفل ۵ موتور رشد)؛ کلیک‌های روی لینک‌های tel: را می‌شمارد.
-- الگو: نوشتن فقط با service_role از سمت سرور سایت؛ خواندن агрегатها برای ایجنت‌ها
-- از طریق RPC (مثل leads_stats) چون کلید anon به این جدول دسترسی ندارد.

create table if not exists public.call_clicks (
  id uuid primary key default gen_random_uuid(),
  href text not null,
  page text not null,
  created_at timestamptz not null default now()
);

alter table public.call_clicks enable row level security;
-- عمداً هیچ پالیسی برای anon نیست: نوشتن فقط service_role، خواندن فقط از راه RPC.

create or replace function public.call_click_stats(days int default 30)
returns table (day date, total bigint)
language sql
security definer
stable
as $$
  select created_at::date as day, count(*)::bigint as total
  from public.call_clicks
  where created_at >= now() - make_interval(days => days)
  group by 1
  order by 1;
$$;

grant execute on function public.call_click_stats(int) to anon;

comment on table public.call_clicks is 'کلیک‌های روی لینک‌های tel:؛ سنجهٔ صادقانهٔ تماس در موتور رشد';
