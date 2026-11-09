-- ============================================================================
-- downloads-tracking.sql
-- Comptage des telechargements PAR LOGICIEL : total et utilisateurs uniques.
--
-- * public.downloads        : un enregistrement par telechargement (utilisateur connecte)
-- * track_download()        : appelee par le site au clic sur « Telecharger » (connecte uniquement)
-- * admin_download_stats()  : une ligne par logiciel (total, uniques, 7 j, 30 j...)
-- * admin_download_by_platform() : idem, ventile par plateforme (windows / mac)
-- * admin_download_users()  : detail par utilisateur (nombre de telechargements)
--
-- Le logiciel est identifie par un code texte en majuscules (RUSHR, RENAME...), le meme
-- que le champ `product` des licences. Un nouveau logiciel apparait tout seul des que
-- le site envoie son code a track_download().
-- Les telechargements anterieurs a cette migration ne sont pas comptes (inconnus).
-- Idempotent (rejouable).
-- ============================================================================

create table if not exists public.downloads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  product    text not null,
  platform   text,
  version    text,
  created_at timestamptz not null default now()
);
create index if not exists downloads_product_created_idx on public.downloads (product, created_at);
create index if not exists downloads_user_product_idx    on public.downloads (user_id, product);

-- RLS active, aucune policy : tout passe par les fonctions SECURITY DEFINER.
alter table public.downloads enable row level security;

-- Enregistrement d'un telechargement ------------------------------------------------
create or replace function public.track_download(
  p_product  text,
  p_platform text default null,
  p_version  text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid      uuid := auth.uid();
  v_product  text := upper(left(btrim(coalesce(p_product, '')), 32));
  v_platform text := nullif(lower(left(btrim(coalesce(p_platform, '')), 16)), '');
  v_version  text := nullif(left(btrim(coalesce(p_version, '')), 40), '');
begin
  -- Silencieux : le comptage ne doit jamais empecher un telechargement.
  if v_uid is null then return; end if;
  if v_product !~ '^[A-Z0-9_-]{2,32}$' then return; end if;

  -- Anti double-clic : meme utilisateur, logiciel et plateforme dans les 60 dernieres secondes.
  if exists (
    select 1 from public.downloads d
    where d.user_id = v_uid and d.product = v_product
      and coalesce(d.platform, '') = coalesce(v_platform, '')
      and d.created_at > now() - interval '60 seconds'
  ) then return; end if;

  insert into public.downloads (user_id, product, platform, version)
  values (v_uid, v_product, v_platform, v_version);
end;
$function$;

-- Statistiques par logiciel -----------------------------------------------------------
create or replace function public.admin_download_stats()
returns table(
  product       text,
  total         bigint,
  unique_users  bigint,
  total_7d      bigint,
  total_30d     bigint,
  unique_30d    bigint,
  first_at      timestamptz,
  last_at       timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
    select d.product,
           count(*)::bigint,
           count(distinct d.user_id)::bigint,
           count(*) filter (where d.created_at > now() - interval '7 days')::bigint,
           count(*) filter (where d.created_at > now() - interval '30 days')::bigint,
           count(distinct d.user_id) filter (where d.created_at > now() - interval '30 days')::bigint,
           min(d.created_at),
           max(d.created_at)
    from public.downloads d
    group by d.product
    order by count(*) desc, d.product;
end;
$function$;

-- Ventilation par plateforme ----------------------------------------------------------
create or replace function public.admin_download_by_platform()
returns table(
  product       text,
  platform      text,
  total         bigint,
  unique_users  bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
    select d.product,
           coalesce(d.platform, '—'),
           count(*)::bigint,
           count(distinct d.user_id)::bigint
    from public.downloads d
    group by d.product, coalesce(d.platform, '—')
    order by d.product, count(*) desc;
end;
$function$;

-- Detail par utilisateur --------------------------------------------------------------
create or replace function public.admin_download_users(p_product text default null)
returns table(
  user_id    uuid,
  email      text,
  product    text,
  downloads  bigint,
  platforms  text,
  versions   text,
  first_at   timestamptz,
  last_at    timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
    select d.user_id,
           coalesce(u.email::text, '(compte supprime)'),
           d.product,
           count(*)::bigint,
           string_agg(distinct coalesce(d.platform, '—'), ', '),
           string_agg(distinct d.version, ', '),
           min(d.created_at),
           max(d.created_at)
    from public.downloads d
    left join auth.users u on u.id = d.user_id
    where p_product is null or d.product = upper(btrim(p_product))
    group by d.user_id, u.email, d.product
    order by max(d.created_at) desc
    limit 1000;
end;
$function$;

-- Droits : connecte pour enregistrer ; les fonctions admin verifient is_admin() elles-memes.
revoke all on function public.track_download(text, text, text)          from public, anon;
revoke all on function public.admin_download_stats()                    from public, anon;
revoke all on function public.admin_download_by_platform()              from public, anon;
revoke all on function public.admin_download_users(text)                from public, anon;
grant execute on function public.track_download(text, text, text)       to authenticated;
grant execute on function public.admin_download_stats()                 to authenticated;
grant execute on function public.admin_download_by_platform()           to authenticated;
grant execute on function public.admin_download_users(text)             to authenticated;
