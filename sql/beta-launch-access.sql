-- Lancement de la beta (2026-11-15) : les inscrits peuvent toujours obtenir leur licence, et l'e-mail
-- d'accès décrit le parcours actuel (compte + page de téléchargement + connexion dans l'app).
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_launch_access ».

-- 1. claim_beta_key : la réserve de clés BETA pré-générées est vide. Au lieu de répondre NO_KEYS_LEFT,
--    on crée une licence BETA neuve pour l'inscrit (même forme que claim_free_license : ACTIVE, 1 appareil,
--    sans expiration). Elle est liée à son adresse ; get_my_account la rattache au compte de même e-mail.
create or replace function public.claim_beta_key(p_email text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_email text := lower(btrim(p_email));
  v_key text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  select license_key into v_key from public.licenses where assigned_email = v_email limit 1;
  if v_key is not null then
    return v_key;
  end if;

  -- Pas d'inscription à la beta, pas de clé.
  if not exists (select 1 from public.beta_signups where lower(email) = v_email) then
    raise exception 'NOT_REGISTERED';
  end if;

  -- D'abord une clé de la réserve, s'il en reste.
  update public.licenses
    set assigned_email = v_email
    where id = (
      select id from public.licenses
      where plan = 'BETA' and status = 'ACTIVE' and max_devices >= 1
        and user_id is null and assigned_email is null
      order by license_key
      limit 1
      for update skip locked
    )
    returning license_key into v_key;

  -- Réserve vide : nouvelle licence pour cet inscrit.
  if v_key is null then
    insert into public.licenses(license_key, status, plan, max_devices, assigned_email, notes)
    values (public.gen_license_key(), 'ACTIVE', 'BETA', 1, v_email, 'Beta : créée à la demande (claim_beta_key)')
    returning license_key into v_key;
  end if;

  return v_key;
end;
$function$;

-- 2. E-mail d'accès beta (admin_send_beta_access) : un seul lien vers /download, qui choisit le bon
--    installeur et la licence ; plus de clé à saisir dans l'app, on s'y connecte avec son compte.
create or replace function public.render_beta_access_html(p_name text, p_platform text, p_email text, p_unsub_url text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  v_html    text;
  v_win     boolean := upper(coalesce(p_platform,'')) <> 'MAC';
  v_name    text := replace(replace(replace(replace(coalesce(p_name,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
  v_email   text := replace(replace(replace(replace(coalesce(p_email,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');
  v_os      text;
  v_note_fr text;
  v_note_en text;
begin
  if v_win then
    v_os := 'Windows';
    v_note_fr := 'RUSHR fonctionne sur Windows 10 et 11 (64 bits). Au premier lancement, Windows peut afficher « Windows a protégé votre ordinateur » (l''application n''est pas encore signée) : clique sur « Informations complémentaires », puis sur « Exécuter quand même ».';
    v_note_en := 'RUSHR runs on Windows 10 and 11 (64-bit). On first launch, Windows may show “Windows protected your PC” (the app is not signed yet): click “More info”, then “Run anyway”.';
  else
    v_os := 'macOS';
    v_note_fr := 'RUSHR pour Mac fonctionne sur les Mac <b style="color:#FFFFFF;">Apple Silicon</b> (M1 ou plus récent) avec macOS 12 ou plus récent. Il ne fonctionne pas encore sur les Mac Intel : si c''est ton cas, réponds à ce mail et nous te préviendrons dès qu''une version sera disponible. Au premier lancement, macOS peut indiquer qu''il ne peut pas vérifier l''application (elle n''est pas encore signée) : ouvre Réglages Système &gt; Confidentialité et sécurité, puis clique sur « Ouvrir quand même ».';
    v_note_en := 'RUSHR for Mac runs on <b style="color:#FFFFFF;">Apple Silicon</b> Macs (M1 or later) with macOS 12 or later. It does not run on Intel Macs yet: if that is your case, reply to this email and we will let you know as soon as a version is available. On first launch, macOS may say it cannot verify the app (it is not signed yet): open System Settings &gt; Privacy &amp; Security, then click “Open Anyway”.';
  end if;

  v_html := $mail$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>La beta de RUSHR est ouverte / The RUSHR beta is open</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0B;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0B0B0B;">Ta licence beta est prête : crée ton compte, télécharge RUSHR et connecte-toi. / Your beta license is ready: create your account, download RUSHR and sign in.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0B0B;">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#141417;border:1px solid #26262b;border-radius:16px;">

    <tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;letter-spacing:3px;font-weight:700;color:#FF6A00;">BACKPACK LAB</div>
      <div style="font-size:34px;line-height:1.1;font-weight:800;color:#FFFFFF;margin-top:6px;">RUSHR</div>
    </td></tr>

    <!-- FRANÇAIS -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#FFFFFF;">{{name}}, la beta de RUSHR est ouverte 🎒</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        Merci de t'être inscrit : ta licence beta est prête, liée à l'adresse <b style="color:#FFFFFF;">{{email}}</b>. RUSHR est gratuit pendant toute la beta. Voici les 3 étapes pour démarrer sur <b style="color:#FFFFFF;">{{os}}</b> :
      </p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>1. Crée ton compte avec cette adresse</b></p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">Sur la page de téléchargement, crée ton compte Backpack Lab avec <b style="color:#FFFFFF;">{{email}}</b> (e-mail et mot de passe, ou Google). Ta licence s'y ajoute automatiquement.</p>
      <p style="margin:12px 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>2. Télécharge et installe RUSHR</b></p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">Une fois connecté, la page te propose directement la version pour {{os}}.</p>
    </td></tr>
    <tr><td style="padding:0 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://thebackpacklab.com/download" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Créer mon compte et télécharger RUSHR</a>
      <div style="font-size:12px;line-height:1.6;color:#9A9A9E;padding-top:8px;">{{note_fr}}</div>
    </td></tr>
    <tr><td style="padding:18px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>3. Connecte-toi dans RUSHR</b></p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">Ouvre RUSHR et connecte-toi avec le même compte : avec Google, ou avec ton e-mail et ton mot de passe. Aucune clé à saisir. Tes retours façonnent directement l'outil.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://discord.gg/wtb3YUxuNN" style="display:block;text-align:center;background:transparent;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #3a3a41;">Besoin d'aide ? Rejoindre le Discord</a>
    </td></tr>

    <tr><td style="padding:22px 32px 6px 32px;"><div style="height:1px;background:#26262b;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

    <!-- ENGLISH -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h2 style="margin:0 0 14px 0;font-size:22px;line-height:1.25;color:#FFFFFF;">{{name}}, the RUSHR beta is open 🎒</h2>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        Thanks for signing up: your beta license is ready, tied to <b style="color:#FFFFFF;">{{email}}</b>. RUSHR is free for the whole beta. Here are the 3 steps to get started on <b style="color:#FFFFFF;">{{os}}</b>:
      </p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>1. Create your account with this address</b></p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">On the download page, create your Backpack Lab account with <b style="color:#FFFFFF;">{{email}}</b> (email and password, or Google). Your license is added to it automatically.</p>
      <p style="margin:12px 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>2. Download and install RUSHR</b></p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">Once you're signed in, the page offers the {{os}} version right away.</p>
    </td></tr>
    <tr><td style="padding:0 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://thebackpacklab.com/download" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Create my account and download RUSHR</a>
      <div style="font-size:12px;line-height:1.6;color:#9A9A9E;padding-top:8px;">{{note_en}}</div>
    </td></tr>
    <tr><td style="padding:18px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#FFFFFF;"><b>3. Sign in to RUSHR</b></p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">Open RUSHR and sign in with the same account: with Google, or with your email and password. No key to type. Your feedback directly shapes the tool.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <a href="https://discord.gg/wtb3YUxuNN" style="display:block;text-align:center;background:transparent;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #3a3a41;">Need help? Join the Discord</a>
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

  v_html := replace(v_html, '{{note_fr}}', v_note_fr);
  v_html := replace(v_html, '{{note_en}}', v_note_en);
  v_html := replace(v_html, '{{os}}', v_os);
  v_html := replace(v_html, '{{name}}', v_name);
  v_html := replace(v_html, '{{email}}', v_email);
  v_html := replace(v_html, '{{unsub}}', coalesce(p_unsub_url, '#'));
  return v_html;
end;
$function$;
