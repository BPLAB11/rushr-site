-- Backpack Lab billing (services, devis, factures) — step 1
-- Run in the Supabase SQL editor. Relies on the existing public.is_admin() function.

create extension if not exists pgcrypto;

-- Services shown on the public /services page ------------------------------
create table if not exists public.bl_services (
  id          uuid primary key default gen_random_uuid(),
  title_fr    text not null,
  title_en    text,
  desc_fr     text,
  desc_en     text,
  price_ht    numeric(10,2),            -- null = sur devis
  unit        text not null default 'forfait',
  vat_rate    numeric(4,2) not null default 20,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- Clients ------------------------------------------------------------------
create table if not exists public.bl_clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  email       text,
  phone       text,
  address     text,
  vat_number  text,
  created_at  timestamptz not null default now()
);

-- Quote requests coming from the public form ---------------------------------
create table if not exists public.bl_quote_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  company     text,
  service_id  uuid references public.bl_services(id) on delete set null,
  message     text,
  status      text not null default 'new' check (status in ('new','handled','archived')),
  created_at  timestamptz not null default now()
);

-- Quotes and invoices ---------------------------------------------------------
-- lines: [{ "label": "...", "qty": 1, "unit_price": 100.00, "vat_rate": 20 }]
create table if not exists public.bl_documents (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('quote','invoice')),
  number             text unique,                 -- assigned on issue, gapless per kind/year
  client_id          uuid references public.bl_clients(id) on delete restrict,
  request_id         uuid references public.bl_quote_requests(id) on delete set null,
  source_quote_id    uuid references public.bl_documents(id) on delete set null,
  status             text not null default 'draft'
                     check (status in ('draft','sent','accepted','declined','paid','cancelled')),
  issue_date         date,
  due_date           date,
  lines              jsonb not null default '[]'::jsonb,
  notes              text,
  total_ht           numeric(12,2) not null default 0,
  total_vat          numeric(12,2) not null default 0,
  total_ttc          numeric(12,2) not null default 0,
  paid_at            timestamptz,
  payment_method     text,                        -- sumup | virement | especes | autre
  sumup_checkout_id  text,
  created_at         timestamptz not null default now()
);

-- Seller info + legal mentions (single row) ----------------------------------
create table if not exists public.bl_settings (
  id    int primary key default 1 check (id = 1),
  data  jsonb not null default '{}'::jsonb
);
insert into public.bl_settings (id) values (1) on conflict do nothing;

-- Sequential numbering ------------------------------------------------------
create table if not exists public.bl_counters (
  kind  text not null,
  year  int  not null,
  last  int  not null default 0,
  primary key (kind, year)
);

-- RLS -----------------------------------------------------------------------
alter table public.bl_services       enable row level security;
alter table public.bl_clients        enable row level security;
alter table public.bl_quote_requests enable row level security;
alter table public.bl_documents      enable row level security;
alter table public.bl_settings       enable row level security;
alter table public.bl_counters       enable row level security;

drop policy if exists bl_services_public on public.bl_services;
create policy bl_services_public on public.bl_services
  for select to anon, authenticated using (active = true);
drop policy if exists bl_services_admin on public.bl_services;
create policy bl_services_admin on public.bl_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bl_clients_admin on public.bl_clients;
create policy bl_clients_admin on public.bl_clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bl_requests_admin on public.bl_quote_requests;
create policy bl_requests_admin on public.bl_quote_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bl_documents_admin on public.bl_documents;
create policy bl_documents_admin on public.bl_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bl_settings_admin on public.bl_settings;
create policy bl_settings_admin on public.bl_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- bl_counters: no policy on purpose, only the SECURITY DEFINER function touches it.

-- Public RPC: quote request from the website form -----------------------------
create or replace function public.submit_quote_request(
  p_name text, p_email text, p_phone text, p_company text,
  p_service_id uuid, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then raise exception 'INVALID_EMAIL'; end if;
  if p_message is null or length(trim(p_message)) not between 5 and 4000 then raise exception 'INVALID_MESSAGE'; end if;
  if (select count(*) from bl_quote_requests
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMIT';
  end if;
  insert into bl_quote_requests (name, email, phone, company, service_id, message)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), ''), nullif(trim(p_company), ''),
          p_service_id, trim(p_message));
end $$;
revoke all on function public.submit_quote_request(text,text,text,text,uuid,text) from public;
grant execute on function public.submit_quote_request(text,text,text,text,uuid,text) to anon, authenticated;

-- Admin RPC: issue a document (assign the next number, never reused) ----------
create or replace function public.bl_issue_document(p_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare d bl_documents; y int; n int; prefix text; num text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  select * into d from bl_documents where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if d.number is not null then return d.number; end if;
  y := extract(year from coalesce(d.issue_date, current_date));
  insert into bl_counters (kind, year, last) values (d.kind, y, 1)
    on conflict (kind, year) do update set last = bl_counters.last + 1
    returning last into n;
  prefix := case d.kind when 'quote' then 'D' else 'F' end;
  num := prefix || '-' || y || '-' || lpad(n::text, 4, '0');
  update bl_documents
     set number = num,
         issue_date = coalesce(issue_date, current_date),
         status = case when status = 'draft' then 'sent' else status end
   where id = p_id;
  return num;
end $$;
revoke all on function public.bl_issue_document(uuid) from public, anon;
grant execute on function public.bl_issue_document(uuid) to authenticated;
