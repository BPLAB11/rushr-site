-- Liste d'attente produit (page /soundbox, réutilisable pour SONIQ, RENAME…).
-- Séparée de beta_signups : une inscription à beta_signups envoie aussitôt l'accès et une licence RUSHR
-- (voir beta-signup-access-on-signup.sql), ce qu'on ne veut surtout pas pour un produit pas encore sorti.
-- Ici : on enregistre seulement l'inscrit, pour le prévenir à la sortie. Aucun e-mail n'est envoyé.

create table if not exists public.product_waitlist (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  name text,
  email text not null,
  platform text,
  session_id uuid,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  last_contact_at timestamptz not null default now(),
  notified_at timestamptz
);
create unique index if not exists product_waitlist_product_email_key
  on public.product_waitlist (product, lower(email));

alter table public.product_waitlist enable row level security;
drop policy if exists product_waitlist_admin on public.product_waitlist;
create policy product_waitlist_admin on public.product_waitlist
  for select to authenticated using (public.is_admin());

create or replace function public.waitlist_join(
  p_product text, p_name text, p_email text, p_platform text,
  p_session_id uuid default null,
  p_marketing_consent boolean default false)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_product text := upper(nullif(btrim(p_product), ''));
  v_name text := left(nullif(btrim(p_name), ''), 120);
  v_email text := lower(nullif(btrim(p_email), ''));
  v_platform text := upper(nullif(btrim(p_platform), ''));
  v_consent boolean := coalesce(p_marketing_consent, false);
begin
  if v_product not in ('SOUNDBOX','SONIQ','RENAME') then raise exception 'INVALID_PRODUCT'; end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if v_platform is not null and v_platform not in ('WIN','MAC') then raise exception 'INVALID_PLATFORM'; end if;

  insert into public.product_waitlist(product, name, email, platform, session_id, marketing_consent_at)
  values (v_product, v_name, v_email, v_platform, p_session_id, case when v_consent then now() end)
  on conflict (product, lower(email)) do update
    set name = coalesce(excluded.name, public.product_waitlist.name),
        platform = coalesce(excluded.platform, public.product_waitlist.platform),
        last_contact_at = now(),
        marketing_consent_at = coalesce(public.product_waitlist.marketing_consent_at, excluded.marketing_consent_at);
end;
$fn$;

revoke all on function public.waitlist_join(text, text, text, text, uuid, boolean) from public;
grant execute on function public.waitlist_join(text, text, text, text, uuid, boolean) to anon, authenticated;
