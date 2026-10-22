-- Backpack Lab shop (mugs, print on demand) — step 1: orders
-- Run in the Supabase SQL editor. Relies on the existing public.is_admin() function.
-- Written and read only by the shop-* edge functions (service role) and by admins.

create extension if not exists pgcrypto;

create table if not exists public.shop_orders (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,            -- BPL-XXXXXXXXXX, also SumUp checkout_reference and Gelato orderReferenceId
  status               text not null default 'pending',
  -- pending -> fulfilling -> submitted -> shipped | delivered
  -- side states: expired, failed, review (amount/merchant mismatch), fulfilment_error (paid, Gelato call failed, retried by SumUp webhook)
  email                text not null,
  lang                 text not null default 'fr',
  currency             text not null default 'EUR',
  items                jsonb not null,                  -- [{ id, size, qty, unit_cents, product_uid, file_url }]
  shipping             jsonb not null,                  -- Gelato shippingAddress object
  shipment_method_uid  text,
  shipment_method_name text,
  subtotal_cents       int not null,
  shipping_cents       int not null,
  total_cents          int not null,
  sumup_checkout_id    text unique,
  sumup_status         text,
  paid_at              timestamptz,
  gelato_order_id      text,
  gelato_status        text,
  tracking             jsonb not null default '[]'::jsonb,   -- [{ code, url, carrier }]
  error                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists shop_orders_status_idx on public.shop_orders (status, created_at desc);
create index if not exists shop_orders_email_idx  on public.shop_orders (lower(email));

-- Customer addresses live here: no public access at all. Edge functions use the service role,
-- which bypasses RLS. Admins can read orders from the admin pages.
alter table public.shop_orders enable row level security;
revoke all on public.shop_orders from anon, authenticated;
grant select on public.shop_orders to authenticated;

drop policy if exists shop_orders_admin_read on public.shop_orders;
create policy shop_orders_admin_read on public.shop_orders
  for select to authenticated
  using (public.is_admin());
