-- Lancement (2026-11-15) : à l'inscription à la beta, l'inscrit reçoit directement l'e-mail d'accès
-- (licence créée + 3 étapes : créer son compte, télécharger, se connecter dans l'app), au lieu de l'ancien
-- e-mail de bienvenue (« le lien de téléchargement arrive très bientôt »).
-- Il est marqué access_sent_at : le bouton « Envoyer l'accès beta » de BP CENTER ne le lui renverra pas.
-- Si quoi que ce soit échoue (clé Resend absente, erreur), l'inscription reste enregistrée : licence et
-- marquage sont annulés ensemble, et l'inscrit pourra être servi depuis BP CENTER.
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_signup_access_on_signup ».

create or replace function public.beta_send_access(p_email text, p_name text, p_platform text, p_unsub_token uuid)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'vault'
as $function$
declare
  v_key   text;
  v_unsub text := 'https://thebackpacklab.com/unsubscribe?t=' || p_unsub_token::text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'NO_EMAIL_KEY'; end if;

  return net.http_post(
    'https://api.resend.com/emails',
    jsonb_build_object(
      'from', 'Backpack Lab <noreply@thebackpacklab.com>',
      'to', p_email,
      'reply_to', 'contact@thebackpacklab.com',
      'subject', 'Ta licence et le téléchargement de RUSHR 🎒 / Your RUSHR license and download',
      'html', public.render_beta_access_html(p_name, p_platform, p_email, v_unsub),
      'headers', jsonb_build_object('List-Unsubscribe', '<' || v_unsub || '>')),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 15000);
end;
$function$;

revoke all on function public.beta_send_access(text, text, text, uuid) from public, anon, authenticated;

create or replace function public.beta_signup_welcome()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'vault'
as $function$
begin
  begin
    perform public.claim_beta_key(NEW.email);
    perform public.beta_send_access(NEW.email, NEW.name, NEW.platform, NEW.unsub_token);
    update public.beta_signups set access_sent_at = now() where id = NEW.id;
  exception when others then
    null;  -- l'inscription est déjà enregistrée : on n'échoue jamais à cause de la licence ou du mail
  end;
  return NEW;
end;
$function$;
