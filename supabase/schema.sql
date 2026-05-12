-- Aksara Art House marketplace production schema
-- Target: Supabase / PostgreSQL

create extension if not exists "pgcrypto";

create type public.artwork_status as enum ('draft', 'available', 'auction', 'sold', 'archived');
create type public.order_status as enum ('pending', 'confirmed', 'paid', 'packed', 'shipped', 'done', 'cancelled');
create type public.payment_status as enum ('unpaid', 'waiting_confirmation', 'paid', 'failed', 'refunded');
create type public.auction_status as enum ('scheduled', 'active', 'ended', 'cancelled');
create type public.user_role as enum ('customer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  category text not null,
  status public.artwork_status not null default 'available',
  medium text not null,
  year integer,
  price integer not null check (price >= 0),
  width_cm numeric(8,2),
  height_cm numeric(8,2),
  depth_cm numeric(8,2),
  weight_kg numeric(8,2),
  description text,
  image_url text,
  colors text[] not null default '{}',
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null unique references public.artworks(id) on delete cascade,
  status public.auction_status not null default 'active',
  start_bid integer not null check (start_bid >= 0),
  current_bid integer not null check (current_bid >= 0),
  min_step integer not null check (min_step > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid references public.profiles(id) on delete set null,
  bidder_name text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address text,
  shipping_city text,
  shipping_postal_code text,
  courier text,
  payment_method text not null,
  payment_status public.payment_status not null default 'unpaid',
  status public.order_status not null default 'pending',
  subtotal integer not null check (subtotal >= 0),
  shipping_cost integer not null default 0 check (shipping_cost >= 0),
  total integer not null check (total >= 0),
  notes text,
  tracking_number text,
  shipping_notes text,
  estimated_delivery date,
  discount_amount integer not null default 0,
  promo_code_id uuid,
  payment_proof_url text,
  payment_notes text,
  payment_verified_at timestamptz,
  payment_revision_requested_at timestamptz,
  payment_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  artwork_id uuid references public.artworks(id) on delete set null,
  title text not null,
  price integer not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Customer'),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create index artworks_status_idx on public.artworks(status);
create index artworks_category_idx on public.artworks(category);
create index artworks_featured_idx on public.artworks(is_featured);
create index auctions_status_ends_at_idx on public.auctions(status, ends_at);
create index auction_bids_auction_amount_idx on public.auction_bids(auction_id, amount desc);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index orders_customer_email_idx on public.orders(customer_email);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger artworks_touch_updated_at
before update on public.artworks
for each row execute function public.touch_updated_at();

create trigger auctions_touch_updated_at
before update on public.auctions
for each row execute function public.touch_updated_at();

create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

create sequence if not exists public.order_number_seq start 1;

create or replace function public.create_order_number()
returns text
language sql
as $$
  select 'AKS-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number = public.create_order_number();
  end if;
  return new;
end;
$$;

create trigger orders_set_order_number
before insert on public.orders
for each row execute function public.set_order_number();

alter table public.profiles enable row level security;
alter table public.artworks enable row level security;
alter table public.auctions enable row level security;
alter table public.auction_bids enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.site_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create policy "Public can read published artworks"
on public.artworks for select
using (status in ('available', 'auction', 'sold') or public.is_admin());

create policy "Admins manage artworks"
on public.artworks for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active auctions"
on public.auctions for select
using (status in ('scheduled', 'active', 'ended') or public.is_admin());

create policy "Admins manage auctions"
on public.auctions for all
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can place bids"
on public.auction_bids for insert
with check (auth.uid() = bidder_id);

create policy "Users can read auction bids"
on public.auction_bids for select
using (true);

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own orders"
on public.orders for select
using (customer_id = auth.uid() or lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_admin());

create policy "Customers can create orders"
on public.orders for insert
with check (customer_id is null or customer_id = auth.uid());

create policy "Admins manage orders"
on public.orders for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own order items"
on public.order_items for select
using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
    and (orders.customer_id = auth.uid() or lower(orders.customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);

create policy "Customers can create order items"
on public.order_items for insert
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
    and (orders.customer_id is null or orders.customer_id = auth.uid())
  )
);

create policy "Admins manage order items"
on public.order_items for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users manage own wishlist"
on public.wishlists for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Public can read public settings"
on public.site_settings for select
using (key in ('storefront', 'contact'));

create policy "Admins manage settings"
on public.site_settings for all
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;

grant select on public.artworks to anon, authenticated;
grant select on public.auctions to anon, authenticated;
grant select on public.auction_bids to anon, authenticated;
grant select on public.site_settings to anon, authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
