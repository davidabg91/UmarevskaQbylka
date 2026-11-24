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
--  Известия на телефона на собственика (Web Push)
--  При нов ред базата вика функцията supabase/functions/notify, която праща известието.
-- ============================================================================
create extension if not exists pg_net;

alter table public.orders        add column if not exists notified_at timestamptz;
alter table public.subscriptions add column if not exists notified_at timestamptz;
-- избран сорт и бележка от клиента към абонамента
alter table public.subscriptions
  add column if not exists variety text check (char_length(variety) <= 120),
  add column if not exists note text check (char_length(note) <= 1000);
alter table public.messages      add column if not exists notified_at timestamptz;

-- посетител не може сам да отбележи реда си като „вече известен“
drop policy if exists "public insert orders" on public.orders;
create policy "public insert orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'new' and admin_note is null and notified_at is null);
drop policy if exists "public insert subscriptions" on public.subscriptions;
create policy "public insert subscriptions" on public.subscriptions
  for insert to anon, authenticated
  with check (status = 'new' and admin_note is null and delivery_day is null and started_on is null and notified_at is null);
drop policy if exists "public insert messages" on public.messages;
create policy "public insert messages" on public.messages
  for insert to anon, authenticated
  with check (status = 'new' and notified_at is null);

-- устройствата, на които собственикът е включил известията
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint   text not null unique check (char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300)
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, delete on public.push_subscriptions to authenticated;
drop policy if exists "admin all push_subscriptions" on public.push_subscriptions;
create policy "admin all push_subscriptions" on public.push_subscriptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- вътрешни стойности (ключът за подписване на известията); достъпни само за функцията
create table if not exists public.app_private (
  key   text primary key,
  value text not null
);
alter table public.app_private enable row level security;
revoke all on public.app_private from anon, authenticated;

-- ВНИМАНИЕ: адресът по-долу е на конкретния проект; при друг проект го сменете.
create or replace function public.um_notify_new()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://cjxmwgnxxxteoodtqjsp.supabase.co/functions/v1/notify',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  exception when others then
    null;  -- поръчка никога не бива да се провали заради известие
  end;
  return new;
end;
$$;
revoke all on function public.um_notify_new() from public, anon, authenticated;

drop trigger if exists um_notify_orders on public.orders;
create trigger um_notify_orders after insert on public.orders for each row execute function public.um_notify_new();
drop trigger if exists um_notify_subscriptions on public.subscriptions;
create trigger um_notify_subscriptions after insert on public.subscriptions for each row execute function public.um_notify_new();
drop trigger if exists um_notify_messages on public.messages;
create trigger um_notify_messages after insert on public.messages for each row execute function public.um_notify_new();

-- ============================================================================
--  Куриер, офис, тегло и цена на доставката към поръчката
-- ============================================================================
alter table public.orders
  add column if not exists courier        text check (courier in ('econt', 'speedy', 'pigeon')),
  add column if not exists city           text check (char_length(city) <= 120),
  add column if not exists office_code    text check (char_length(office_code) <= 20),
  add column if not exists office_name    text check (char_length(office_name) <= 300),
  add column if not exists delivery_price numeric(8,2) check (delivery_price >= 0 and delivery_price < 10000),
  add column if not exists weight_kg      numeric(7,2) check (weight_kg >= 0 and weight_kg < 100000);
alter table public.orders drop constraint if exists orders_delivery_check;
alter table public.orders add constraint orders_delivery_check check (delivery in ('office', 'address', 'pickup'));

-- ============================================================================
--  Каталог: продукти, абонаментни планове, настройки (промо лента) и снимки
--  Редактират се от админ панела; сайтът ги чете с публичния ключ.
-- ============================================================================
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  sort          integer not null default 0,
  active        boolean not null default true,
  name          text not null check (char_length(name) between 1 and 120),
  description   text check (char_length(description) <= 600),
  tag           text check (char_length(tag) <= 80),
  color         text not null default '#c1272d' check (color ~ '^#[0-9a-fA-F]{6}$'),
  image_url     text check (char_length(image_url) <= 600),
  category      text not null default 'variety' check (category in ('variety', 'mix-juice')),
  sale_type     text not null default 'kg' check (sale_type in ('kg', 'unit')),
  price         numeric(8,2) not null check (price >= 0 and price < 10000),
  weights       jsonb not null default '[5,10,20]'::jsonb,
  unit_label    text not null default 'бр.' check (char_length(unit_label) <= 20),
  unit_kg       numeric(6,2) not null default 1 check (unit_kg >= 0 and unit_kg < 1000),
  featured      boolean not null default false,
  badge         text check (char_length(badge) <= 60),
  lead          text check (char_length(lead) <= 800),
  note          text check (char_length(note) <= 60),
  bullets       jsonb not null default '[]'::jsonb,
  promo_percent numeric(5,2) check (promo_percent >= 0 and promo_percent <= 90),
  promo_label   text check (char_length(promo_label) <= 40),
  promo_until   date
);
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  sort        integer not null default 0,
  active      boolean not null default true,
  tier        text not null check (char_length(tier) between 1 and 40),
  title       text not null check (char_length(title) between 1 and 80),
  kg          numeric(6,1) not null default 0 check (kg >= 0 and kg < 10000),
  price       numeric(8,2) not null check (price >= 0 and price < 10000),
  description text check (char_length(description) <= 400),
  perks       jsonb not null default '[]'::jsonb,
  save_note   text check (char_length(save_note) <= 120),
  badge       text check (char_length(badge) <= 40),
  hot         boolean not null default false,
  image_url   text check (char_length(image_url) <= 600)
);
create table if not exists public.site_settings (
  key   text primary key check (char_length(key) <= 60),
  value jsonb not null
);
-- размери на плода за продуктите на килограм: [{"name":"Едър","range":"8,5+ см","price":2}, …]
-- първият е избран по подразбиране и цената му е равна на products.price
alter table public.products add column if not exists sizes jsonb not null default '[]'::jsonb;
alter table public.products drop constraint if exists products_sizes_check;
alter table public.products add constraint products_sizes_check check (jsonb_typeof(sizes) = 'array' and jsonb_array_length(sizes) <= 6);
-- задължителна информация за храните, която се показва преди поръчката:
-- произход, клас на качество и сортове в микса (ябълки); нетно количество в литри (от него се смята цената за литър),
-- условия на съхранение и хранителна стойност [{"label":"Въглехидрати","value":"11 g"}, …] (сок, оцет)
alter table public.products add column if not exists origin        text check (char_length(origin) <= 60);
alter table public.products add column if not exists quality_class text check (char_length(quality_class) <= 30);
alter table public.products add column if not exists varieties     text check (char_length(varieties) <= 200);
alter table public.products add column if not exists volume_l      numeric(7,3) check (volume_l > 0 and volume_l < 1000);
alter table public.products add column if not exists storage       text check (char_length(storage) <= 600);
alter table public.products add column if not exists nutrition     jsonb not null default '[]'::jsonb;
alter table public.products drop constraint if exists products_nutrition_check;
alter table public.products add constraint products_nutrition_check check (jsonb_typeof(nutrition) = 'array' and jsonb_array_length(nutrition) <= 14);
alter table public.products      enable row level security;
alter table public.plans         enable row level security;
alter table public.site_settings enable row level security;
grant select on public.products, public.plans, public.site_settings to anon, authenticated;
grant insert, update, delete on public.products, public.plans, public.site_settings to authenticated;

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select to anon, authenticated using (active);
drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public read plans" on public.plans;
create policy "public read plans" on public.plans for select to anon, authenticated using (active);
drop policy if exists "admin write plans" on public.plans;
create policy "admin write plans" on public.plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admin write settings" on public.site_settings;
create policy "admin write settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- снимки на продуктите: публично четене през адреса на файла, качване само от администратора
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "admin read product images" on storage.objects;
create policy "admin read product images" on storage.objects for select to authenticated using (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- офиси и автомати на Спиди и Pigeon Express за менюто във формата за поръчка.
-- Пълни се от функцията courier-sync (supabase/functions/courier-sync), която чете публичните им
-- страници с офиси; посетителите само четат. Офисите на Еконт идват на живо от техния интерфейс.
create table if not exists public.courier_offices (
  courier    text not null check (courier in ('speedy', 'pigeon')),
  code       text not null check (char_length(code) <= 30),
  name       text not null check (char_length(name) <= 200),
  city       text not null check (char_length(city) <= 120),
  address    text check (char_length(address) <= 300),
  kind       text not null default 'office' check (kind in ('office', 'automat')),
  updated_at timestamptz not null default now(),
  primary key (courier, code)
);
create index if not exists courier_offices_city_idx on public.courier_offices (courier, city);
alter table public.courier_offices enable row level security;
grant select on public.courier_offices to anon, authenticated;
drop policy if exists "public read courier offices" on public.courier_offices;
create policy "public read courier offices" on public.courier_offices for select to anon, authenticated using (true);

-- всекидневно обновяване на офисите в 03:40 UTC (адресът е публичен и не носи ключове)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'courier-offices-sync';
select cron.schedule('courier-offices-sync', '40 3 * * *', $job$
  select net.http_post(
    url := 'https://cjxmwgnxxxteoodtqjsp.supabase.co/functions/v1/courier-sync',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);

-- ============================================================================
--  Администраторът се добавя ОТДЕЛНО (имейлът не стои в този публичен файл):
--     insert into public.admins (email) values ('имейл-на-собственика');
--  Същият имейл трябва да има потребител в Authentication → Users.
-- ============================================================================

-- ============================================================================
--  Имейл за потвърждение на поръчката до клиента
--  При нова поръчка с имейл базата вика supabase/functions/order-email (изпраща през Resend).
-- ============================================================================
alter table public.orders add column if not exists emailed_at timestamptz;

drop policy if exists "public insert orders" on public.orders;
create policy "public insert orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'new' and admin_note is null and notified_at is null and emailed_at is null);

-- ВНИМАНИЕ: адресът по-долу е на конкретния проект; при друг проект го сменете.
create or replace function public.um_order_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://cjxmwgnxxxteoodtqjsp.supabase.co/functions/v1/order-email',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  exception when others then
    null;  -- поръчка никога не бива да се провали заради имейл
  end;
  return new;
end;
$$;
revoke all on function public.um_order_email() from public, anon, authenticated;

drop trigger if exists um_email_orders on public.orders;
create trigger um_email_orders after insert on public.orders for each row execute function public.um_order_email();

-- ============================================================================
--  Отказ от договор (чл. 52а ЗЗП)
--  Формата на страницата с общите условия записва отказа като запитване с kind = 'withdrawal'.
--  Собственикът получава известие (както за всяко запитване), а клиентът — имейл с потвърждение
--  през supabase/functions/withdrawal-email.
-- ============================================================================
alter table public.messages add column if not exists kind text not null default 'contact';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('contact', 'withdrawal'));
alter table public.messages add column if not exists emailed_at timestamptz;

drop policy if exists "public insert messages" on public.messages;
create policy "public insert messages" on public.messages
  for insert to anon, authenticated
  with check (status = 'new' and notified_at is null and emailed_at is null);

-- ВНИМАНИЕ: адресът по-долу е на конкретния проект; при друг проект го сменете.
create or replace function public.um_withdrawal_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'withdrawal' or new.email is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://cjxmwgnxxxteoodtqjsp.supabase.co/functions/v1/withdrawal-email',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  exception when others then
    null;  -- отказът никога не бива да се провали заради имейл
  end;
  return new;
end;
$$;
revoke all on function public.um_withdrawal_email() from public, anon, authenticated;

drop trigger if exists um_email_withdrawals on public.messages;
create trigger um_email_withdrawals after insert on public.messages for each row execute function public.um_withdrawal_email();
