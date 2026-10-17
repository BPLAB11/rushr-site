-- Consentement aux emails d'information + liens légaux dans les pieds de page d'emails.
-- Appliqué sur Supabase le 2026-10-17 (migration « marketing_consent_and_email_footers »).
--
-- Règle d'envoi des messages groupés (admin > Emailing) :
--   désabonné            -> jamais
--   consentement coché   -> oui   (marketing_consent_at renseigné)
--   « hérité »           -> oui, EN ATTENTE de décision (inscrits d'avant la case à cocher, sans consentement explicite)
--   inscrit sans case    -> non
-- Les mails transactionnels (bienvenue, accès à la beta) ne dépendent pas de ce consentement.

-- 1. Colonnes de consentement. Les inscrits existants sont marqués « legacy ».
alter table public.beta_signups
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_source text;

update public.beta_signups
   set marketing_consent_source = 'legacy'
 where marketing_consent_at is null and marketing_consent_source is null;

-- 2. Inscription : nouveau paramètre p_marketing_consent (faux par défaut).
--    On remplace l'ancienne signature : les pages déjà en ligne appellent avec 4 arguments
--    et tombent sur la nouvelle fonction (consentement = faux), donc rien ne casse.
drop function if exists public.beta_signup_create(text, text, text, uuid);

create function public.beta_signup_create(
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

  insert into public.beta_signups(name, email, platform, session_id, marketing_consent_at, marketing_consent_source)
  values (v_name, v_email, v_platform, p_session_id,
          case when v_consent then now() end,
          case when v_consent then 'form' else 'form-no-consent' end)
  on conflict (lower(email)) do update
    set name = excluded.name, platform = excluded.platform,
        session_id = coalesce(public.beta_signups.session_id, excluded.session_id),
        marketing_consent_at = case when v_consent and public.beta_signups.marketing_consent_at is null
                                    then now() else public.beta_signups.marketing_consent_at end,
        marketing_consent_source = case when v_consent and public.beta_signups.marketing_consent_at is null
                                        then 'form' else public.beta_signups.marketing_consent_source end;
end;
$fn$;

revoke all on function public.beta_signup_create(text, text, text, uuid, boolean) from public;
grant execute on function public.beta_signup_create(text, text, text, uuid, boolean) to anon, authenticated;

-- 3. Audience du module Emailing : détail par type de consentement.
create or replace function public.admin_broadcast_audience()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return (select jsonb_build_object(
    'subscribed',   count(*) filter (where unsubscribed_at is null and (marketing_consent_at is not null or marketing_consent_source = 'legacy')),
    'consented',    count(*) filter (where unsubscribed_at is null and marketing_consent_at is not null),
    'legacy',       count(*) filter (where unsubscribed_at is null and marketing_consent_at is null and marketing_consent_source = 'legacy'),
    'no_consent',   count(*) filter (where unsubscribed_at is null and marketing_consent_at is null and coalesce(marketing_consent_source, '') <> 'legacy'),
    'unsubscribed', count(*) filter (where unsubscribed_at is not null),
    'total',        count(*))
  from public.beta_signups);
end;
$fn$;

-- 4. Envoi groupé : mêmes règles que l'audience ci-dessus (deux endroits dans la fonction),
--    et liens légaux dans les pieds de page des trois mails. Chaque remplacement est vérifié
--    (nombre d'occurrences attendu) : la migration échoue plutôt que de patcher au hasard.
do $do$
declare d text;
begin
  -- 4a. audience de l'envoi
  select pg_get_functiondef('public.admin_send_broadcast(text,text,text,text,boolean)'::regprocedure) into d;
  if (length(d) - length(replace(d, 'unsubscribed_at is null', ''))) / length('unsubscribed_at is null') <> 2 then
    raise exception 'admin_send_broadcast : nombre d''occurrences inattendu';
  end if;
  d := replace(d, 'unsubscribed_at is null',
    'unsubscribed_at is null and (marketing_consent_at is not null or marketing_consent_source = ''legacy'')');
  execute d;

  -- 4b. pied de page du mail de bienvenue
  select pg_get_functiondef('public.beta_send_welcome(text,text)'::regprocedure) into d;
  if (length(d) - length(replace(d, 'No spam, only useful updates.', ''))) / length('No spam, only useful updates.') <> 1 then
    raise exception 'beta_send_welcome : phrase attendue introuvable ou en double';
  end if;
  d := replace(d, 'No spam, only useful updates.',
    'No spam, only useful updates.<br><a href="https://thebackpacklab.com/privacy" style="color:#9A9A9E;">Confidentialité / Privacy</a> · <a href="https://thebackpacklab.com/legal" style="color:#9A9A9E;">Mentions légales / Legal notice</a>');
  execute d;

  -- 4c. pied de page du mail d'accès à la beta
  select pg_get_functiondef('public.render_beta_access_html(text,text,text,text)'::regprocedure) into d;
  if (length(d) - length(replace(d, 'style="color:#9A9A9E;">Unsubscribe</a>', ''))) / length('style="color:#9A9A9E;">Unsubscribe</a>') <> 1 then
    raise exception 'render_beta_access_html : lien attendu introuvable ou en double';
  end if;
  d := replace(d, 'style="color:#9A9A9E;">Unsubscribe</a>',
    'style="color:#9A9A9E;">Unsubscribe</a><br><a href="https://thebackpacklab.com/privacy" style="color:#9A9A9E;">Confidentialité / Privacy</a> · <a href="https://thebackpacklab.com/legal" style="color:#9A9A9E;">Mentions légales / Legal notice</a>');
  execute d;

  -- 4d. pied de page des messages groupés
  select pg_get_functiondef('public.render_broadcast_html(text,text,text,text,text)'::regprocedure) into d;
  if (length(d) - length(replace(d, 'style="color:#9A9A9E;">contact@thebackpacklab.com</a></p></td></tr>', ''))) / length('style="color:#9A9A9E;">contact@thebackpacklab.com</a></p></td></tr>') <> 1 then
    raise exception 'render_broadcast_html : lien attendu introuvable ou en double';
  end if;
  d := replace(d, 'style="color:#9A9A9E;">contact@thebackpacklab.com</a></p></td></tr>',
    'style="color:#9A9A9E;">contact@thebackpacklab.com</a><br><a href="https://thebackpacklab.com/privacy" style="color:#9A9A9E;">Confidentialité / Privacy</a> · <a href="https://thebackpacklab.com/legal" style="color:#9A9A9E;">Mentions légales / Legal notice</a></p></td></tr>');
  execute d;
end
$do$;
