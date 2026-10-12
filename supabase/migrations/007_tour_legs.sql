-- 007_tour_legs.sql | ۱۴۰۵/۰۷/۲۰
-- جدول ساختار تورهای ترکیبی: هر تور ترکیبی، یک تور عادی در tours است
-- و پاهای سفرش (به ترتیب، هر مقصد چند شب) اینجاست. تور ترکیبی با
-- tourist_type مشخص نمی‌شود؛ با داشتن رکورد در همین جدول مشخص می‌شود.
-- جمع nights پاها باید با nights همان تور در tours بخواند (قراردادی، نه تریگر).

create table if not exists public.tour_legs (
  id uuid primary key default gen_random_uuid(),
  tour_slug text not null references public.tours(slug) on delete cascade,
  position int not null,
  destination_slug text not null,
  destination_name text not null,
  nights int not null check (nights > 0),
  created_at timestamptz not null default now(),
  unique (tour_slug, position)
);

create index if not exists tour_legs_tour_idx on public.tour_legs (tour_slug);

alter table public.tour_legs enable row level security;

drop policy if exists tour_legs_public_read on public.tour_legs;
create policy tour_legs_public_read
  on public.tour_legs for select to anon using (true);

comment on table public.tour_legs is
  'پاهای تورهای ترکیبی: ترتیب مقصدها و شب‌های هر مقصد. تورِ دارای پا = تور ترکیبی.';

-- پاهای تور ترکیبی بانکوک و پوکت (۳ شب بانکوک + ۴ شب پوکت = ۷ شب؛
-- با nights رکورد تور می‌خواند. تقسیم شب‌ها با غزل راستی‌آزمایی می‌شود.)
insert into public.tour_legs (tour_slug, position, destination_slug, destination_name, nights)
values
  ('bangkok-phuket-8-days', 1, 'bangkok', 'بانکوک', 3),
  ('bangkok-phuket-8-days', 2, 'phuket', 'پوکت', 4)
on conflict (tour_slug, position) do update
  set destination_slug = excluded.destination_slug,
      destination_name = excluded.destination_name,
      nights = excluded.nights;
