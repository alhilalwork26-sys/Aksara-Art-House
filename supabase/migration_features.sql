-- ============================================================
-- Aksara Art House — Feature Migration
-- Reviews, Promo Codes, Order Tracking, Stock Management
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── 1. STOCK pada tabel artworks ──────────────────────────
alter table public.artworks
  add column if not exists stock integer not null default 1 check (stock >= 0);

-- ── 2. TRACKING & PROMO pada tabel orders ─────────────────
alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists shipping_notes text,
  add column if not exists estimated_delivery date,
  add column if not exists discount_amount integer not null default 0,
  add column if not exists promo_code_id uuid,
  add column if not exists payment_proof_url text,
  add column if not exists payment_notes text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_revision_requested_at timestamptz,
  add column if not exists payment_history jsonb not null default '[]'::jsonb;

-- ── 3. TABEL PROMO CODES ──────────────────────────────────
create table if not exists public.promo_codes (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  description    text,
  discount_type  text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_purchase   integer not null default 0,
  max_uses       integer,
  current_uses   integer not null default 0,
  valid_from     timestamptz not null default now(),
  valid_until    timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- FK dari orders ke promo_codes
alter table public.orders
  add constraint if not exists orders_promo_code_fk
  foreign key (promo_code_id) references public.promo_codes(id) on delete set null;

-- ── 4. TABEL REVIEWS ──────────────────────────────────────
create table if not exists public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  artwork_id           uuid not null references public.artworks(id) on delete cascade,
  user_id              uuid references public.profiles(id) on delete set null,
  reviewer_name        text not null,
  reviewer_email       text not null,
  rating               integer not null check (rating between 1 and 5),
  comment              text,
  is_verified_purchase boolean not null default false,
  is_approved          boolean not null default false,
  is_rejected          boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ── 5. RLS: REVIEWS ───────────────────────────────────────
alter table public.reviews enable row level security;

drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews"
  on public.reviews for select
  using (is_approved = true or public.is_admin());

drop policy if exists "Anyone can submit reviews" on public.reviews;
create policy "Anyone can submit reviews"
  on public.reviews for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins manage reviews" on public.reviews;
create policy "Admins manage reviews"
  on public.reviews for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── 6. RLS: PROMO CODES ──────────────────────────────────
alter table public.promo_codes enable row level security;

drop policy if exists "Public can read active promos" on public.promo_codes;
create policy "Public can read active promos"
  on public.promo_codes for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admins manage promo codes" on public.promo_codes;
create policy "Admins manage promo codes"
  on public.promo_codes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── 7. GRANTS ─────────────────────────────────────────────
grant all privileges on public.reviews to service_role;
grant all privileges on public.promo_codes to service_role;
grant select on public.reviews to anon, authenticated;
grant select on public.promo_codes to anon, authenticated;

-- ── 8. INDEXES ────────────────────────────────────────────
create index if not exists reviews_artwork_approved_idx
  on public.reviews(artwork_id, is_approved);
create index if not exists promo_codes_code_active_idx
  on public.promo_codes(code, is_active);
create index if not exists orders_promo_idx
  on public.orders(promo_code_id);

-- ── 9. FUNGSI HELPER ──────────────────────────────────────

-- Decrement stok artwork saat order dibuat
create or replace function public.decrement_artwork_stock(p_artwork_id uuid, p_qty integer default 1)
returns void language plpgsql security definer as $$
begin
  update public.artworks
  set stock = greatest(0, stock - p_qty)
  where id = p_artwork_id;
end;
$$;

-- Increment promo code uses
create or replace function public.increment_promo_uses(code_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.promo_codes
  set current_uses = current_uses + 1
  where id = code_id;
end;
$$;

grant execute on function public.decrement_artwork_stock(uuid, integer) to service_role;
grant execute on function public.increment_promo_uses(uuid) to service_role;

-- ── 10. CONTOH DATA PROMO (opsional, hapus di production) ──
-- insert into public.promo_codes (code, description, discount_type, discount_value, min_purchase)
-- values ('AKSARA10', 'Diskon 10% untuk semua karya', 'percentage', 10, 500000)
-- on conflict do nothing;
