-- ============================================================================
--  Умаревска Ябълка — база данни за поръчки, абонаменти, запитвания и статистика
--  Пуска се ВЕДНЪЖ в Supabase → SQL Editor → New query → Run.
--  Може да се пуска и повторно без вреда (нищо не се трие).
--
--  След това добавете администратора с отделна команда (виж края на файла).
-- ============================================================================

-- ---------- кой е администратор ----------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;   -- без правила: недостъпна през сайта

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- поръчки ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  code          text not null check (char_length(code) <= 16),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone         text not null check (char_length(phone) between 5 and 40),
  email         text check (char_length(email) <= 160),
  delivery      text not null default 'address' check (delivery in ('address', 'pickup')),
  address       text check (char_length(address) <= 400),
  pickup_place  text check (char_length(pickup_place) <= 80),
  note          text check (char_length(note) <= 1000),
  items         jsonb not null default '[]'::jsonb check (pg_column_size(items) < 20000),
  total         numeric(10,2) not null default 0 check (total >= 0 and total < 100000),
  status        text not null default 'new' check (status in ('new', 'confirmed', 'shipped', 'done', 'cancelled')),
  admin_note    text check (char_length(admin_note) <= 2000),
  session_id    text check (char_length(session_id) <= 64)
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ---------- месечни абонаменти ----------
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  plan          text not null check (char_length(plan) <= 120),
  price         numeric(10,2) not null default 0 check (price >= 0 and price < 100000),
  kg            numeric(6,1) check (kg >= 0 and kg < 10000),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone         text not null check (char_length(phone) between 5 and 40),
  email         text check (char_length(email) <= 160),
  address       text check (char_length(address) <= 400),
  start_pref    text check (char_length(start_pref) <= 60),
  status        text not null default 'new' check (status in ('new', 'active', 'paused', 'cancelled')),
  delivery_day  smallint check (delivery_day between 1 and 28),   -- на коя дата от месеца се праща
  started_on    date,                                              -- първа доставка
  admin_note    text check (char_length(admin_note) <= 2000),
  session_id    text check (char_length(session_id) <= 64)
);
create index if not exists subscriptions_created_at_idx on public.subscriptions (created_at desc);

-- ---------- отметки „изпратено“ за абонаментните доставки (само за собственика) ----------
create table if not exists public.sub_deliveries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  due_date        date not null,
  note            text check (char_length(note) <= 500),
  unique (subscription_id, due_date)
);

-- ---------- запитвания от формата за контакт ----------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  phone         text check (char_length(phone) <= 40),
  email         text check (char_length(email) <= 160),
  message       text not null check (char_length(message) between 1 and 3000),
  status        text not null default 'new' check (status in ('new', 'read')),
  session_id    text check (char_length(session_id) <= 64)
);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- ---------- анонимна статистика ----------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null check (char_length(session_id) <= 64),
  visitor_id text check (char_length(visitor_id) <= 64),
  type       text not null check (char_length(type) <= 32),
  name       text check (char_length(name) <= 160),
  path       text check (char_length(path) <= 200),
  device     text check (char_length(device) <= 16),
  referrer   text check (char_length(referrer) <= 120),
  data       jsonb check (pg_column_size(data) < 8000)
);
create index if not exists events_created_at_idx on public.events (created_at);

-- ============================================================================
--  Правила за достъп (Row Level Security)
--  Посетителите могат САМО да добавят нови редове. Четене/промяна — само администраторът.
-- ============================================================================
alter table public.orders         enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.sub_deliveries enable row level security;
alter table public.messages       enable row level security;
alter table public.events         enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.orders, public.subscriptions, public.messages, public.events to anon, authenticated;
grant select, update, delete on public.orders, public.subscriptions, public.messages, public.events to authenticated;
grant select, insert, update, delete on public.sub_deliveries to authenticated;

-- посетител: нова поръчка / абонамент / запитване винаги влиза със статус „нова“
drop policy if exists "public insert orders" on public.orders;
create policy "public insert orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'new' and admin_note is null);

drop policy if exists "public insert subscriptions" on public.subscriptions;
create policy "public insert subscriptions" on public.subscriptions
  for insert to anon, authenticated
  with check (status = 'new' and admin_note is null and delivery_day is null and started_on is null);

drop policy if exists "public insert messages" on public.messages;
create policy "public insert messages" on public.messages
  for insert to anon, authenticated
  with check (status = 'new');

drop policy if exists "public insert events" on public.events;
create policy "public insert events" on public.events
  for insert to anon, authenticated
  with check (true);

-- администратор: пълен достъп
drop policy if exists "admin select orders" on public.orders;
create policy "admin select orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete orders" on public.orders;
create policy "admin delete orders" on public.orders for delete to authenticated using (public.is_admin());

drop policy if exists "admin select subscriptions" on public.subscriptions;
create policy "admin select subscriptions" on public.subscriptions for select to authenticated using (public.is_admin());
drop policy if exists "admin update subscriptions" on public.subscriptions;
create policy "admin update subscriptions" on public.subscriptions for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete subscriptions" on public.subscriptions;
create policy "admin delete subscriptions" on public.subscriptions for delete to authenticated using (public.is_admin());

drop policy if exists "admin all sub_deliveries" on public.sub_deliveries;
create policy "admin all sub_deliveries" on public.sub_deliveries for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin select messages" on public.messages;
create policy "admin select messages" on public.messages for select to authenticated using (public.is_admin());
drop policy if exists "admin update messages" on public.messages;
create policy "admin update messages" on public.messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete messages" on public.messages;
create policy "admin delete messages" on public.messages for delete to authenticated using (public.is_admin());

drop policy if exists "admin select events" on public.events;
create policy "admin select events" on public.events for select to authenticated using (public.is_admin());
drop policy if exists "admin delete events" on public.events;
create policy "admin delete events" on public.events for delete to authenticated using (public.is_admin());

-- ============================================================================
--  Администраторът се добавя ОТДЕЛНО (имейлът не стои в този публичен файл):
--     insert into public.admins (email) values ('имейл-на-собственика');
--  Същият имейл трябва да има потребител в Authentication → Users.
-- ============================================================================
