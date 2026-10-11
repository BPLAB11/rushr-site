-- ============================================================================
-- analytics-growth.sql
-- Mini-analytics upgrade : campagnes (UTM), clics, pays cote serveur, filtre bots.
--
-- A coller dans Supabase > SQL Editor AVANT de fusionner la branche
-- `analytics-growth` sur main. Retro-compatible : l'ancien site continue de
-- fonctionner pendant et apres la migration. Idempotent (rejouable).
-- ============================================================================

-- 1) Colonnes de campagne + drapeau bot sur page_views --------------------------
alter table public.page_views
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists is_bot       boolean not null default false;

create index if not exists page_views_created_at_idx on public.page_views (created_at);
create index if not exists page_views_session_idx    on public.page_views (session_id, created_at);

-- 2) Table des clics -------------------------------------------------------------
create table if not exists public.click_events (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event      text not null,
  label      text,
  path       text,
  created_at timestamptz not null default now()
);
create index if not exists click_events_created_at_idx on public.click_events (created_at);

-- RLS active, aucune policy : tout passe par les fonctions SECURITY DEFINER.
alter table public.click_events enable row level security;

-- 3) analytics_track : nouveaux parametres optionnels (UTM) ---------------------
--    Pays : si le client n'en envoie pas, on lit l'en-tete cf-ipcountry ajoute par
--    le CDN devant l'API Supabase (plus besoin d'appeler ipapi.co depuis le site).
--    Bot : detecte via le User-Agent de la requete.
drop function if exists public.analytics_track(uuid, text, text, text, text, text, text);

create or replace function public.analytics_track(
  p_session_id   uuid,
  p_path         text,
  p_referrer     text,
  p_country      text,
  p_device       text,
  p_browser      text,
  p_lang         text,
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_headers jsonb;
  v_ua      text;
  v_country text;
  v_bot     boolean;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ua      := coalesce(v_headers->>'user-agent', '');
  v_bot     := v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests)';
  v_country := upper(left(coalesce(nullif(p_country, ''), v_headers->>'cf-ipcountry'), 2));
  if v_country in ('XX', 'T1') then v_country := null; end if;

  insert into public.page_views(
    session_id, path, referrer, country, device, browser, lang,
    utm_source, utm_medium, utm_campaign, is_bot
  ) values (
    p_session_id, left(coalesce(p_path, '/'), 500), left(p_referrer, 500), v_country,
    left(p_device, 20), left(p_browser, 30), left(p_lang, 5),
    left(nullif(lower(p_utm_source), ''), 60),
    left(nullif(lower(p_utm_medium), ''), 60),
    left(nullif(lower(p_utm_campaign), ''), 100),
    v_bot
  )
  returning id into v_id;

  return v_id;
end;
$function$;

grant execute on function public.analytics_track(uuid, text, text, text, text, text, text, text, text, text)
  to anon, authenticated;

-- 4) analytics_event : un clic = une ligne ---------------------------------------
create or replace function public.analytics_event(
  p_session_id uuid,
  p_event      text,
  p_label      text default null,
  p_path       text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_session_id is null or p_event is null or p_event !~ '^[a-z0-9_]{1,40}$' then
    return;
  end if;
  insert into public.click_events(session_id, event, label, path)
  values (p_session_id, p_event, left(p_label, 120), left(p_path, 500));
end;
$function$;

grant execute on function public.analytics_event(uuid, text, text, text) to anon, authenticated;

-- 5) analytics_admin_summary : filtre bots + campagnes + clics -------------------
create or replace function public.analytics_admin_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result jsonb;
  since timestamptz := now() - (p_days || ' days')::interval;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  select jsonb_build_object(
    'total_views', (select count(*) from public.page_views where created_at > since and not is_bot),
    'unique_visitors', (select count(distinct session_id) from public.page_views where created_at > since and not is_bot),
    'avg_duration_ms', (select coalesce(avg(duration_ms),0) from public.page_views where created_at > since and not is_bot and duration_ms is not null),
    'bots_filtered', (select count(*) from public.page_views where created_at > since and is_bot),
    'by_country', (
      select coalesce(jsonb_agg(jsonb_build_object('country', coalesce(country,'??'), 'count', c) order by c desc), '[]'::jsonb)
      from (select country, count(*) c from public.page_views where created_at > since and not is_bot group by country order by count(*) desc limit 12) t
    ),
    'by_path', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'count', c) order by c desc), '[]'::jsonb)
      from (select path, count(*) c from public.page_views where created_at > since and not is_bot group by path order by count(*) desc limit 10) t
    ),
    'by_exit', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'count', c) order by c desc), '[]'::jsonb)
      from (
        select path, count(*) c from (
          select distinct on (session_id) session_id, path
          from public.page_views where created_at > since and not is_bot
          order by session_id, created_at desc
        ) last_hit
        group by path order by count(*) desc limit 10
      ) t
    ),
    'by_device', (
      select coalesce(jsonb_agg(jsonb_build_object('device', coalesce(device,'unknown'), 'count', c) order by c desc), '[]'::jsonb)
      from (select device, count(*) c from public.page_views where created_at > since and not is_bot group by device order by count(*) desc) t
    ),
    'by_browser', (
      select coalesce(jsonb_agg(jsonb_build_object('browser', coalesce(browser,'Other'), 'count', c) order by c desc), '[]'::jsonb)
      from (select browser, count(*) c from public.page_views where created_at > since and not is_bot group by browser order by count(*) desc) t
    ),
    'by_referrer', (
      select coalesce(jsonb_agg(jsonb_build_object('ref', r, 'count', c) order by c desc), '[]'::jsonb)
      from (
        select case when referrer is null or referrer='' then 'Direct'
                    else coalesce(substring(referrer from 'https?://([^/]+)'), referrer) end r,
               count(*) c
        from public.page_views
        where created_at > since and not is_bot
          and (referrer is null or referrer !~* 'thebackpacklab\.com')
        group by 1 order by count(*) desc limit 10
      ) t
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date d, count(*) c
        from public.page_views where created_at > since and not is_bot group by 1 order by 1
      ) t
    ),
    -- Attribution : la source de chaque visite = premiere page vue de la session
    -- (utm_source si present, sinon domaine du referrer, sinon "direct").
    'by_campaign', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'source', source, 'medium', medium, 'campaign', campaign,
               'visitors', visitors, 'signups', signups
             ) order by visitors desc, signups desc), '[]'::jsonb)
      from (
        select s.source, s.medium, s.campaign,
               count(*) as visitors,
               count(b.id) as signups
        from (
          select distinct on (session_id) session_id,
                 coalesce(nullif(utm_source, ''),
                          nullif(substring(referrer from 'https?://(?:www\.)?([^/]+)'), ''),
                          'direct') as source,
                 utm_medium   as medium,
                 utm_campaign as campaign
          from public.page_views
          where created_at > since and not is_bot
          order by session_id, created_at asc
        ) s
        left join public.beta_signups b
               on b.session_id = s.session_id and b.created_at > since
        group by s.source, s.medium, s.campaign
        order by count(*) desc
        limit 15
      ) t
    ),
    'clicks', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'event', event, 'label', label, 'count', c, 'visitors', v
             ) order by c desc), '[]'::jsonb)
      from (
        select event, label, count(*) c, count(distinct session_id) v
        from public.click_events where created_at > since
        group by event, label order by count(*) desc limit 15
      ) t
    ),
    'funnel', (
      select jsonb_build_object(
        'rushr_visitors', (select count(distinct session_id) from public.page_views where path ilike '%rushr%' and created_at > since and not is_bot),
        'beta_signups', (select count(*) from public.beta_signups where created_at > since),
        'beta_signups_from_rushr', (
          select count(*) from public.beta_signups b
          where b.created_at > since and b.session_id is not null
            and exists(select 1 from public.page_views p where p.session_id = b.session_id and p.path ilike '%rushr%')
        )
      )
    )
  ) into result;

  return result;
end;
$function$;
