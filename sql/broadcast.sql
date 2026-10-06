-- Emailing admin : envoyer un message à tous les inscrits beta (table public.beta_signups).
-- Appliqué sur Supabase le 2026-10-06 (migration « admin_broadcast »).
-- Même mécanisme que les autres mails : Resend via pg_net, clé dans vault ('resend_api_key').
-- Garde-fous : test à soi-même par défaut, anti-doublon 5 min, lien de désabonnement dans chaque mail,
-- plafond 100 destinataires (limite de l'API batch Resend et du plan gratuit).

-- 1. Désabonnement : un jeton propre à chaque inscrit.
alter table public.beta_signups
  add column if not exists unsub_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz;
create unique index if not exists beta_signups_unsub_token_idx on public.beta_signups(unsub_token);

-- 2. Historique des envois.
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('test','broadcast')),
  subject text not null,
  body text not null,
  cta_label text,
  cta_url text,
  recipients int not null,
  request_id bigint,
  status text not null default 'pending' check (status in ('pending','ok','error','unknown')),
  error_detail text,
  sent_by uuid references auth.users(id) on delete set null,
  sent_by_email text,
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
drop policy if exists broadcasts_admin on public.broadcasts;
create policy broadcasts_admin on public.broadcasts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. Rendu du mail (interne). Le texte de l'admin est échappé : jamais de HTML brut injecté.
create or replace function public.render_broadcast_html(
  p_body text, p_cta_label text, p_cta_url text, p_name text, p_unsub_url text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $fn$
declare
  v_name    text := replace(replace(replace(replace(coalesce(btrim(p_name),''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
  v_text    text;
  v_content text;
  v_cta     text := '';
  v_label   text := nullif(btrim(coalesce(p_cta_label,'')), '');
  v_url     text := nullif(btrim(coalesce(p_cta_url,'')), '');
  v_tpl     text;
begin
  v_text := replace(replace(coalesce(p_body,''), E'\r\n', E'\n'), E'\r', E'\n');
  v_text := replace(replace(replace(replace(v_text,'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
  v_text := replace(v_text, '{{name}}', v_name);

  select string_agg(
           '<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">'
           || replace(btrim(par, E' \t\n'), E'\n', '<br>') || '</p>', '' order by ord)
    into v_content
    from regexp_split_to_table(v_text, E'\n[ \t]*\n+') with ordinality as t(par, ord)
   where btrim(par, E' \t\n') <> '';

  if (v_label is null) <> (v_url is null) then raise exception 'CTA_INCOMPLETE'; end if;
  if v_url is not null then
    if v_url !~ '^https://[^\s"<>]+$' then raise exception 'INVALID_URL'; end if;
    if length(v_label) > 40 then raise exception 'INVALID_CTA'; end if;
    v_cta := '<tr><td style="padding:6px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">'
          || '<a href="' || replace(v_url,'&','&amp;') || '" style="display:block;text-align:center;background:#35DC8E;color:#04150C;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">'
          || replace(replace(replace(replace(v_label,'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;') || ' →</a></td></tr>';
  end if;

  v_tpl := $tpl$<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>BACKPACK LAB</title></head>
<body style="margin:0;padding:0;background:#0B0B0B;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0B0B;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#141417;border:1px solid #26262b;border-radius:16px;">
<tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;"><div style="font-size:20px;letter-spacing:3px;font-weight:800;color:#FFFFFF;">BACKPACK&nbsp;LAB</div><div style="height:3px;width:36px;background:#35DC8E;border-radius:2px;margin-top:10px;font-size:1px;line-height:3px;">&nbsp;</div></td></tr>
<tr><td style="padding:20px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">@@CONTENT@@</td></tr>
@@CTA@@
<tr><td style="padding:12px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0;font-size:14px;line-height:1.6;color:#D6D6DA;">L'équipe <b style="color:#FFFFFF;">BACKPACK LAB</b></p></td></tr>
<tr><td style="padding:24px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0;font-size:12px;line-height:1.6;color:#6E6E73;">Tu reçois ce message car tu t'es inscrit à la beta de RUSHR sur thebackpacklab.com. / You received this because you signed up for the RUSHR beta at thebackpacklab.com.<br><a href="@@UNSUB@@" style="color:#9A9A9E;text-decoration:underline;">Se désabonner / Unsubscribe</a> · <a href="mailto:contact@thebackpacklab.com" style="color:#9A9A9E;">contact@thebackpacklab.com</a></p></td></tr>
</table></td></tr></table></body></html>$tpl$;

  -- @@CONTENT@@ en dernier : le texte de l'admin ne peut pas injecter d'autres marqueurs.
  v_tpl := replace(v_tpl, '@@CTA@@', v_cta);
  v_tpl := replace(v_tpl, '@@UNSUB@@', replace(coalesce(p_unsub_url,'#'),'&','&amp;'));
  v_tpl := replace(v_tpl, '@@CONTENT@@', coalesce(v_content,''));
  return v_tpl;
end;
$fn$;
revoke all on function public.render_broadcast_html(text,text,text,text,text) from public, anon, authenticated;

-- 4. Aperçu (n'envoie rien).
create or replace function public.admin_preview_broadcast(
  p_body text, p_cta_label text default null, p_cta_url text default null)
returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if btrim(coalesce(p_body,'')) = '' then raise exception 'INVALID_BODY'; end if;
  return public.render_broadcast_html(p_body, p_cta_label, p_cta_url, 'Alex', '#');
end;
$fn$;
revoke all on function public.admin_preview_broadcast(text,text,text) from public, anon;
grant execute on function public.admin_preview_broadcast(text,text,text) to authenticated;

-- 5. Audience.
create or replace function public.admin_broadcast_audience()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return (select jsonb_build_object(
    'subscribed',   count(*) filter (where unsubscribed_at is null),
    'unsubscribed', count(*) filter (where unsubscribed_at is not null),
    'total',        count(*))
  from public.beta_signups);
end;
$fn$;
revoke all on function public.admin_broadcast_audience() from public, anon;
grant execute on function public.admin_broadcast_audience() to authenticated;

-- 6. Envoi. p_test = true par défaut : sans précision, un test à soi-même, jamais un envoi réel.
create or replace function public.admin_send_broadcast(
  p_subject text, p_body text, p_cta_label text default null, p_cta_url text default null,
  p_test boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
declare
  v_subject text := btrim(coalesce(p_subject,''));
  v_key     text;
  v_msgs    jsonb;
  v_n       int;
  v_req     bigint;
  v_id      uuid;
  v_email   text := lower(auth.email());
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if v_subject = '' or length(v_subject) > 150 then raise exception 'INVALID_SUBJECT'; end if;
  if btrim(coalesce(p_body,'')) = '' or length(p_body) > 20000 then raise exception 'INVALID_BODY'; end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'NO_EMAIL_KEY'; end if;

  if p_test then
    if v_email is null then raise exception 'NO_ADMIN_EMAIL'; end if;
    v_msgs := jsonb_build_array(jsonb_build_object(
      'from',     'Backpack Lab <noreply@thebackpacklab.com>',
      'to',       v_email,
      'reply_to', 'contact@thebackpacklab.com',
      'subject',  '[TEST] ' || v_subject,
      'html',     public.render_broadcast_html(p_body, p_cta_label, p_cta_url, 'Alex', '#')));
    v_n := 1;
  else
    if exists (select 1 from public.broadcasts
                where kind = 'broadcast' and subject = v_subject and body = p_body
                  and created_at > now() - interval '5 minutes') then
      raise exception 'DUPLICATE_RECENT';
    end if;
    select count(*) into v_n from public.beta_signups where unsubscribed_at is null;
    if v_n = 0   then raise exception 'NO_RECIPIENTS'; end if;
    if v_n > 100 then raise exception 'TOO_MANY_RECIPIENTS'; end if;
    select jsonb_agg(jsonb_build_object(
             'from',     'Backpack Lab <noreply@thebackpacklab.com>',
             'to',       s.email,
             'reply_to', 'contact@thebackpacklab.com',
             'subject',  v_subject,
             'html',     public.render_broadcast_html(p_body, p_cta_label, p_cta_url, s.name,
                           'https://thebackpacklab.com/unsubscribe?t=' || s.unsub_token),
             'headers',  jsonb_build_object('List-Unsubscribe',
                           '<https://thebackpacklab.com/unsubscribe?t=' || s.unsub_token || '>')))
      into v_msgs
      from public.beta_signups s
     where s.unsubscribed_at is null;
  end if;

  v_req := net.http_post(
    'https://api.resend.com/emails/batch',
    v_msgs,
    '{}'::jsonb,
    jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
    timeout_milliseconds := 15000);

  insert into public.broadcasts(kind, subject, body, cta_label, cta_url, recipients, request_id, sent_by, sent_by_email)
  values (case when p_test then 'test' else 'broadcast' end, v_subject, p_body,
          nullif(btrim(p_cta_label),''), nullif(btrim(p_cta_url),''), v_n, v_req, auth.uid(), v_email)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'recipients', v_n, 'test', p_test);
end;
$fn$;
revoke all on function public.admin_send_broadcast(text,text,text,text,boolean) from public, anon;
grant execute on function public.admin_send_broadcast(text,text,text,text,boolean) to authenticated;

-- 7. Historique (met aussi à jour le statut depuis la réponse de Resend).
create or replace function public.admin_list_broadcasts()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  update public.broadcasts b
     set status = case when r.status_code between 200 and 299 then 'ok' else 'error' end,
         error_detail = case when r.status_code between 200 and 299 then null
                             else left(coalesce(nullif(r.error_msg,''), r.content, 'HTTP ' || r.status_code), 300) end
    from net._http_response r
   where b.status = 'pending' and r.id = b.request_id;

  -- pg_net ne garde les réponses que quelques heures.
  update public.broadcasts set status = 'unknown'
   where status = 'pending' and created_at < now() - interval '6 hours';

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', id, 'kind', kind, 'subject', subject, 'recipients', recipients,
             'status', status, 'error_detail', error_detail,
             'sent_by_email', sent_by_email, 'created_at', created_at)
           order by created_at desc)
      from (select * from public.broadcasts order by created_at desc limit 30) x), '[]'::jsonb);
end;
$fn$;
revoke all on function public.admin_list_broadcasts() from public, anon;
grant execute on function public.admin_list_broadcasts() to authenticated;

-- 8. Désabonnement (public : le lien du mail contient le jeton).
create or replace function public.beta_unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  update public.beta_signups
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsub_token = p_token;
  return found;
end;
$fn$;
revoke all on function public.beta_unsubscribe(uuid) from public;
grant execute on function public.beta_unsubscribe(uuid) to anon, authenticated;
