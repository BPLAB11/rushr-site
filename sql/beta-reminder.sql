-- Relance des inscrits beta qui n'ont pas encore créé leur compte (2026-11-27).
-- Constat : tous les inscrits ont reçu l'e-mail d'accès, mais presque aucun n'a créé son compte Backpack Lab,
-- donc pas de licence liée ni de téléchargement. Cet e-mail insiste sur cette étape, avec un bouton qui ouvre
-- directement la création de compte puis la page de téléchargement.
-- Envoyé depuis BP CENTER (clé service_role uniquement), comme l'accès beta.
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_reminder ».

alter table public.beta_signups add column if not exists reminder_sent_at timestamptz;

-- Inscrit « sans compte » : aucun utilisateur avec la même adresse, et pas désabonné.
create or replace function public.beta_reminder_targets()
 returns table(name text, email text, platform text, unsub_token uuid)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select s.name, lower(s.email), s.platform, s.unsub_token
  from public.beta_signups s
  where s.unsubscribed_at is null
    and not exists (select 1 from auth.users u where lower(u.email) = lower(s.email));
$function$;
revoke all on function public.beta_reminder_targets() from public, anon, authenticated;

create or replace function public.render_beta_reminder_html(p_name text, p_platform text, p_email text, p_unsub_url text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  v_html  text;
  v_os    text := case when upper(coalesce(p_platform,'')) = 'MAC' then 'macOS' else 'Windows' end;
  v_name  text := replace(replace(replace(replace(coalesce(nullif(btrim(p_name),''),'Salut'),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
  v_email text := replace(replace(replace(replace(coalesce(p_email,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
begin
  v_html := $mail$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Rushr t'attend / Rushr is waiting for you</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0B;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0B0B0B;">Ta licence est prête : il te reste juste à créer ton compte pour télécharger Rushr. / Your license is ready: just create your account to download Rushr.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0B0B;">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#141417;border:1px solid #26262b;border-radius:16px;">

    <tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;letter-spacing:3px;font-weight:700;color:#FF6A00;">BACKPACK LAB</div>
      <div style="font-size:34px;line-height:1.1;font-weight:800;color:#FFFFFF;margin-top:6px;">RUSHR</div>
    </td></tr>

    <!-- FRANÇAIS -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#FFFFFF;">{{name}}, Rushr t'attend 🎒</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        La beta de <b style="color:#FFFFFF;">RUSHR</b> est ouverte et ta licence est prête. Il ne manque qu'une étape : <b style="color:#FFFFFF;">créer ton compte Backpack Lab avec l'adresse {{email}}</b>. C'est lui qui relie ta licence et débloque le téléchargement.
      </p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>Ça prend 2 minutes :</b></p>
      <p style="margin:0 0 4px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">1. Crée ton compte avec <b style="color:#FFFFFF;">{{email}}</b> (e-mail et mot de passe, Google ou Microsoft).</p>
      <p style="margin:0 0 4px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">2. Télécharge Rushr : la page te propose directement la version pour {{os}}.</p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">3. Ouvre Rushr et connecte-toi avec le même compte. Aucune clé à saisir.</p>
    </td></tr>
    <tr><td style="padding:0 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://thebackpacklab.com/account?next=download&amp;mode=signup" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Créer mon compte et télécharger RUSHR</a>
      <div style="font-size:12px;line-height:1.6;color:#9A9A9E;padding-top:8px;">Utilise bien l'adresse {{email}} : avec une autre adresse, ta licence ne serait pas retrouvée. Tu as déjà un compte avec cette adresse ? Connecte-toi simplement sur la même page.</div>
    </td></tr>
    <tr><td style="padding:12px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://thebackpacklab.com/guide" style="display:block;text-align:center;background:transparent;color:#FF8A3D;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #5a3a22;">Lire le guide de démarrage</a>
    </td></tr>
    <tr><td style="padding:12px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://discord.gg/wtb3YUxuNN" style="display:block;text-align:center;background:transparent;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #3a3a41;">Besoin d'aide ? Rejoindre le Discord</a>
    </td></tr>

    <tr><td style="padding:22px 32px 6px 32px;"><div style="height:1px;background:#26262b;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

    <!-- ENGLISH -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h2 style="margin:0 0 14px 0;font-size:22px;line-height:1.25;color:#FFFFFF;">{{name}}, Rushr is waiting for you 🎒</h2>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        The <b style="color:#FFFFFF;">RUSHR</b> beta is open and your license is ready. Just one step is missing: <b style="color:#FFFFFF;">create your Backpack Lab account with {{email}}</b>. That's what links your license and unlocks the download.
      </p>
      <p style="margin:0 0 4px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">1. Create your account with <b style="color:#FFFFFF;">{{email}}</b> (email and password, Google or Microsoft).</p>
      <p style="margin:0 0 4px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">2. Download Rushr: the page offers the {{os}} version right away.</p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">3. Open Rushr and sign in with the same account. No key to type.</p>
    </td></tr>
    <tr><td style="padding:0 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://thebackpacklab.com/account?next=download&amp;mode=signup" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Create my account and download RUSHR</a>
    </td></tr>

    <tr><td style="padding:24px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#D6D6DA;">À très vite / See you soon,<br><b style="color:#FFFFFF;">L'équipe BACKPACK LAB</b></p>
      <p style="margin:14px 0 0 0;font-size:12px;line-height:1.6;color:#6E6E73;">
        Une question ? Réponds à ce mail ou écris à <a href="mailto:contact@thebackpacklab.com" style="color:#9A9A9E;">contact@thebackpacklab.com</a>.
        Tu reçois ce message car tu t'es inscrit à la beta de RUSHR sur thebackpacklab.com.
        <a href="{{unsub}}" style="color:#9A9A9E;">Se désabonner</a><br>
        You received this because you signed up for the RUSHR beta at thebackpacklab.com.
        <a href="{{unsub}}" style="color:#9A9A9E;">Unsubscribe</a><br><a href="https://thebackpacklab.com/privacy" style="color:#9A9A9E;">Confidentialité / Privacy</a> · <a href="https://thebackpacklab.com/legal" style="color:#9A9A9E;">Mentions légales / Legal notice</a>
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
$mail$;
  v_html := replace(v_html, '{{os}}', v_os);
  v_html := replace(v_html, '{{name}}', v_name);
  v_html := replace(v_html, '{{email}}', v_email);
  v_html := replace(v_html, '{{unsub}}', coalesce(p_unsub_url, '#'));
  return v_html;
end;
$function$;

-- p_test = true  : un exemplaire Windows et un exemplaire Mac à p_test_email ; rien n'est marqué.
-- p_test = false : chaque inscrit sans compte (non désabonné) reçoit la relance ; reminder_sent_at est mis à jour.
create or replace function public.service_send_beta_reminder(p_test boolean, p_test_email text, p_sent_by_email text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'vault'
as $function$
declare
  v_subject constant text := 'Rushr t''attend : il ne te reste qu''une étape 🎒 / Rushr is waiting: one step left';
  v_from    constant text := 'Backpack Lab <noreply@thebackpacklab.com>';
  v_key     text;
  v_msgs    jsonb := '[]'::jsonb;
  v_t       record;
  v_n       int;
  v_req     bigint;
  v_id      uuid;
  v_test_to text := lower(btrim(coalesce(p_test_email, '')));
  v_unsub   text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'NO_EMAIL_KEY'; end if;

  if p_test then
    if v_test_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
    v_msgs := jsonb_build_array(
      jsonb_build_object('from', v_from, 'to', v_test_to, 'reply_to', 'contact@thebackpacklab.com',
        'subject', '[TEST Windows] ' || v_subject, 'html', public.render_beta_reminder_html('Prénom', 'WIN', v_test_to, '#')),
      jsonb_build_object('from', v_from, 'to', v_test_to, 'reply_to', 'contact@thebackpacklab.com',
        'subject', '[TEST macOS] ' || v_subject, 'html', public.render_beta_reminder_html('Prénom', 'MAC', v_test_to, '#')));
    v_n := 2;
  else
    if exists (select 1 from public.broadcasts where kind = 'broadcast' and subject = v_subject
                and created_at > now() - interval '5 minutes') then
      raise exception 'DUPLICATE_RECENT';
    end if;
    for v_t in select * from public.beta_reminder_targets() loop
      v_unsub := 'https://thebackpacklab.com/unsubscribe?t=' || v_t.unsub_token::text;
      v_msgs := v_msgs || jsonb_build_array(jsonb_build_object(
        'from', v_from, 'to', v_t.email, 'reply_to', 'contact@thebackpacklab.com', 'subject', v_subject,
        'html', public.render_beta_reminder_html(v_t.name, v_t.platform, v_t.email, v_unsub),
        'headers', jsonb_build_object('List-Unsubscribe', '<' || v_unsub || '>')));
    end loop;
    v_n := jsonb_array_length(v_msgs);
    if v_n = 0 then raise exception 'NO_RECIPIENTS'; end if;
    if v_n > 100 then raise exception 'TOO_MANY_RECIPIENTS'; end if;
    update public.beta_signups s set reminder_sent_at = now()
     where lower(s.email) in (select t.email from public.beta_reminder_targets() t);
  end if;

  v_req := net.http_post('https://api.resend.com/emails/batch', v_msgs, '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 15000);

  insert into public.broadcasts(kind, subject, body, recipients, request_id, sent_by, sent_by_email)
  values (case when p_test then 'test' else 'broadcast' end,
          case when p_test then '[TEST] ' || v_subject else v_subject end,
          'Relance beta (BP CENTER) : inscrits sans compte, créer son compte puis télécharger',
          v_n, v_req, null, nullif(btrim(coalesce(p_sent_by_email, '')), ''))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'recipients', v_n, 'test', p_test);
end;
$function$;

-- Le compteur de BP CENTER : combien d'inscrits sans compte, et la date de la dernière relance.
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
    'last_sent_at', max(s.access_sent_at),
    'no_account',   (select count(*) from public.beta_reminder_targets()),
    'last_reminder_at', max(s.reminder_sent_at))
  from public.beta_signups s;
$function$;

revoke all on function public.render_beta_reminder_html(text, text, text, text) from public, anon, authenticated;
revoke all on function public.service_send_beta_reminder(boolean, text, text) from public, anon, authenticated;
revoke all on function public.service_beta_access_audience() from public, anon, authenticated;
grant execute on function public.service_send_beta_reminder(boolean, text, text) to service_role;
grant execute on function public.service_beta_access_audience() to service_role;
