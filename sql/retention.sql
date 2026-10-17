-- Suppression automatique des données (durées annoncées dans /privacy).
-- Appliqué sur Supabase le 2026-10-17 (migration « retention_purge »).
--
--   page_views, click_events ........ 13 mois
--   active_sessions ................. 1 jour (ne sert qu'au compteur « visiteurs actifs »)
--   license_audit.ip ................ 12 mois (l'événement est gardé, l'adresse IP est effacée)
--   support_tickets ................. 3 ans après la demande
--   beta_signups désabonnés ......... on ne garde que l'adresse (nom et session effacés)
--   beta_signups inactifs ........... supprimés après 3 ans sans contact
--   retention_log ................... 13 mois
-- « Dernier contact » = le plus récent de : (ré)inscription, envoi de l'accès, consentement, connexion au compte.

create extension if not exists pg_cron;

-- 1. Dernier contact d'un inscrit (mis à jour à chaque (ré)inscription).
alter table public.beta_signups add column if not exists last_contact_at timestamptz;
update public.beta_signups set last_contact_at = created_at where last_contact_at is null;
alter table public.beta_signups alter column last_contact_at set default now();

create or replace function public.beta_signup_create(
  p_name text, p_email text, p_platform text,
  p_session_id uuid default null,
  p_marketing_consent boolean default false)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_name text := nullif(btrim(p_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_platform text := upper(nullif(btrim(p_platform), ''));
  v_consent boolean := coalesce(p_marketing_consent, false);
begin
  if v_name is null then raise exception 'NAME_REQUIRED'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if v_platform not in ('WIN','MAC') then raise exception 'INVALID_PLATFORM'; end if;

  insert into public.beta_signups(name, email, platform, session_id, marketing_consent_at, marketing_consent_source, last_contact_at)
  values (v_name, v_email, v_platform, p_session_id,
          case when v_consent then now() end,
          case when v_consent then 'form' else 'form-no-consent' end,
          now())
  on conflict (lower(email)) do update
    set name = excluded.name, platform = excluded.platform,
        session_id = coalesce(public.beta_signups.session_id, excluded.session_id),
        last_contact_at = now(),
        marketing_consent_at = case when v_consent and public.beta_signups.marketing_consent_at is null
                                    then now() else public.beta_signups.marketing_consent_at end,
        marketing_consent_source = case when v_consent and public.beta_signups.marketing_consent_at is null
                                        then 'form' else public.beta_signups.marketing_consent_source end;
end;
$fn$;

-- 2. Journal des passages de nettoyage (lecture réservée aux admins).
create table if not exists public.retention_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  counts jsonb not null
);
alter table public.retention_log enable row level security;
drop policy if exists retention_log_admin on public.retention_log;
create policy retention_log_admin on public.retention_log
  for select to authenticated using (public.is_admin());

-- 3. Le nettoyage lui-même. Non appelable depuis le site : seul le planificateur (et le propriétaire) l'exécute.
create or replace function public.run_retention_purge()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  n_pv int; n_ce int; n_as int; n_ip int; n_tk int; n_unsub int; n_inactive int; n_log int;
  res jsonb;
begin
  delete from public.page_views    where created_at < now() - interval '13 months';  get diagnostics n_pv = row_count;
  delete from public.click_events  where created_at < now() - interval '13 months';  get diagnostics n_ce = row_count;
  delete from public.active_sessions where last_seen < now() - interval '1 day';     get diagnostics n_as = row_count;

  update public.license_audit set ip = null
   where ip is not null and created_at < now() - interval '12 months';               get diagnostics n_ip = row_count;

  delete from public.support_tickets where created_at < now() - interval '3 years';  get diagnostics n_tk = row_count;

  -- désabonnés : on ne garde que l'adresse (pour respecter le choix)
  update public.beta_signups set name = '-', session_id = null
   where unsubscribed_at is not null and (name <> '-' or session_id is not null);    get diagnostics n_unsub = row_count;

  -- inscrits sans contact depuis 3 ans (les désabonnés restent : liste d'opposition)
  delete from public.beta_signups b
   where b.unsubscribed_at is null
     and greatest(
           coalesce(b.last_contact_at, b.created_at),
           coalesce(b.access_sent_at, b.created_at),
           coalesce(b.marketing_consent_at, b.created_at),
           coalesce((select max(u.last_sign_in_at) from auth.users u where lower(u.email) = lower(b.email)), b.created_at)
         ) < now() - interval '3 years';                                             get diagnostics n_inactive = row_count;

  delete from public.retention_log where ran_at < now() - interval '13 months';      get diagnostics n_log = row_count;

  res := jsonb_build_object(
    'page_views', n_pv, 'click_events', n_ce, 'active_sessions', n_as,
    'license_audit_ip_effaces', n_ip, 'support_tickets', n_tk,
    'inscrits_desabonnes_minimises', n_unsub, 'inscrits_inactifs_supprimes', n_inactive,
    'journal_purge', n_log);
  insert into public.retention_log(counts) values (res);
  return res;
end;
$fn$;
revoke all on function public.run_retention_purge() from public, anon, authenticated;

-- 4. Planification : tous les jours à 03h17 UTC.
do $do$
begin
  if exists (select 1 from cron.job where jobname = 'retention-purge') then
    perform cron.unschedule('retention-purge');
  end if;
  perform cron.schedule('retention-purge', '17 3 * * *', 'select public.run_retention_purge()');
end
$do$;
