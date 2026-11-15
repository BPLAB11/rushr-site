-- Envoi de l'accès beta depuis BP CENTER (2026-11-15).
-- BP CENTER parle à cette base avec la clé service_role (côté serveur uniquement) : auth.uid() y est vide,
-- donc admin_send_beta_access (réservée aux sessions admin du site) ne peut pas servir. Ces deux fonctions
-- font la même chose, mais ne sont exécutables QUE par service_role (jamais par anon / authenticated).
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_access_bp_center ».

create or replace function public.service_beta_access_audience()
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'to_send',      count(*) filter (where s.unsubscribed_at is null and s.access_sent_at is null),
    'to_send_win',  count(*) filter (where s.unsubscribed_at is null and s.access_sent_at is null and s.platform = 'WIN'),
    'to_send_mac',  count(*) filter (where s.unsubscribed_at is null and s.access_sent_at is null and s.platform = 'MAC'),
    'already_sent', count(*) filter (where s.access_sent_at is not null),
    'unsubscribed', count(*) filter (where s.unsubscribed_at is not null),
    'last_sent_at', max(s.access_sent_at))
  from public.beta_signups s;
$function$;

-- p_test = true  : un exemplaire Windows et un exemplaire Mac envoyés à p_test_email. Rien n'est attribué ni marqué.
-- p_test = false : chaque inscrit non désabonné et pas encore servi reçoit sa licence (claim_beta_key)
--                  et l'e-mail ; il est marqué access_sent_at. Tout est annulé si une étape échoue.
create or replace function public.service_send_beta_access(p_test boolean, p_test_email text, p_sent_by_email text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'vault'
as $function$
declare
  v_subject constant text := 'Ta licence et le téléchargement de RUSHR 🎒 / Your RUSHR license and download';
  v_from    constant text := 'Backpack Lab <noreply@thebackpacklab.com>';
  v_key     text;
  v_msgs    jsonb;
  v_rows    jsonb;
  v_el      jsonb;
  v_n       int;
  v_req     bigint;
  v_id      uuid;
  v_test_to text := lower(btrim(coalesce(p_test_email, '')));
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'NO_EMAIL_KEY'; end if;

  if p_test then
    if v_test_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
    v_msgs := jsonb_build_array(
      jsonb_build_object('from', v_from, 'to', v_test_to, 'reply_to', 'contact@thebackpacklab.com',
        'subject', '[TEST Windows] ' || v_subject,
        'html', public.render_beta_access_html('Prénom', 'WIN', v_test_to, '#')),
      jsonb_build_object('from', v_from, 'to', v_test_to, 'reply_to', 'contact@thebackpacklab.com',
        'subject', '[TEST macOS] ' || v_subject,
        'html', public.render_beta_access_html('Prénom', 'MAC', v_test_to, '#')));
    v_n := 2;
  else
    if exists (select 1 from public.broadcasts
                where kind = 'broadcast' and subject = v_subject
                  and created_at > now() - interval '5 minutes') then
      raise exception 'DUPLICATE_RECENT';
    end if;

    select count(*) into v_n from public.beta_signups
     where unsubscribed_at is null and access_sent_at is null;
    if v_n = 0   then raise exception 'NO_RECIPIENTS'; end if;
    if v_n > 100 then raise exception 'TOO_MANY_RECIPIENTS'; end if;

    with t as (
      update public.beta_signups set access_sent_at = now()
       where unsubscribed_at is null and access_sent_at is null
      returning name, email, platform, unsub_token)
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_rows from t;

    v_msgs := '[]'::jsonb;
    for v_el in select e from jsonb_array_elements(v_rows) as e loop
      perform public.claim_beta_key(v_el->>'email');
      v_msgs := v_msgs || jsonb_build_array(jsonb_build_object(
        'from',     v_from,
        'to',       v_el->>'email',
        'reply_to', 'contact@thebackpacklab.com',
        'subject',  v_subject,
        'html',     public.render_beta_access_html(v_el->>'name', v_el->>'platform', v_el->>'email',
                      'https://thebackpacklab.com/unsubscribe?t=' || (v_el->>'unsub_token')),
        'headers',  jsonb_build_object('List-Unsubscribe',
                      '<https://thebackpacklab.com/unsubscribe?t=' || (v_el->>'unsub_token') || '>')));
    end loop;
    v_n := jsonb_array_length(v_msgs);
  end if;

  v_req := net.http_post(
    'https://api.resend.com/emails/batch',
    v_msgs,
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 15000);

  insert into public.broadcasts(kind, subject, body, recipients, request_id, sent_by, sent_by_email)
  values (case when p_test then 'test' else 'broadcast' end,
          case when p_test then '[TEST] ' || v_subject else v_subject end,
          'Accès beta (BP CENTER) : compte + page /download + connexion dans l''app',
          v_n, v_req, null, nullif(btrim(coalesce(p_sent_by_email, '')), ''))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'recipients', v_n, 'test', p_test);
end;
$function$;

revoke all on function public.service_beta_access_audience() from public, anon, authenticated;
revoke all on function public.service_send_beta_access(boolean, text, text) from public, anon, authenticated;
grant execute on function public.service_beta_access_audience() to service_role;
grant execute on function public.service_send_beta_access(boolean, text, text) to service_role;
