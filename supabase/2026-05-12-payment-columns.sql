-- Aksara Art House — payment proof columns
-- Jalankan di Supabase SQL Editor untuk mengaktifkan kolom pembayaran khusus.

alter table public.orders
  add column if not exists payment_proof_url text,
  add column if not exists payment_notes text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_revision_requested_at timestamptz,
  add column if not exists payment_history jsonb not null default '[]'::jsonb;

create index if not exists orders_payment_status_created_at_idx
  on public.orders(payment_status, created_at desc);
