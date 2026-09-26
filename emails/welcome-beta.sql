-- Mail de bienvenue beta (table public.beta_signups). Appliqué sur Supabase le 2026-09-26
-- (migrations « beta_signup_welcome_email » puis « beta_send_welcome_helper »).
-- Corps du mail généré à partir de welcome-beta.html — modifier le HTML puis régénérer ce fichier.
-- Mécanisme : Resend via pg_net, clé dans vault ('resend_api_key'), comme review_notify_*.
-- Trigger sur INSERT uniquement : une ré-inscription (upsert -> UPDATE) ne renvoie pas le mail.
-- Renvoyer à quelqu'un à la main (une personne à la fois : Resend limite à ~2 req/s) :
--   select public.beta_send_welcome('adresse@exemple.com', 'Prénom');
--   puis lire net._http_response (status_code 200 = accepté par Resend).

create or replace function public.beta_send_welcome(p_email text, p_name text)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
declare
  v_key  text;
  v_name text;
  v_html text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return null; end if;

  v_name := replace(replace(replace(replace(coalesce(p_name,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;');

  v_html := $mail$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Bienvenue dans la beta de RUSHR / Welcome to the RUSHR beta</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0B;">
<!-- preheader (texte d'aperçu dans la boîte mail) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0B0B0B;">Tu fais partie des premiers à tester RUSHR. Rejoins-nous sur Discord et Instagram. / You're among the first to test RUSHR.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0B0B;">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#141417;border:1px solid #26262b;border-radius:16px;">

    <!-- En-tête -->
    <tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;letter-spacing:3px;font-weight:700;color:#FF6A00;">BACKPACK LAB</div>
      <div style="font-size:34px;line-height:1.1;font-weight:800;color:#FFFFFF;margin-top:6px;">RUSHR</div>
    </td></tr>

    <!-- ================= FRANÇAIS ================= -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#FFFFFF;">Bienvenue dans la beta, {{name}} 🎒</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        Ton inscription est bien enregistrée, merci ! Tu fais désormais partie des <b style="color:#FFFFFF;">premiers à tester RUSHR</b>.
      </p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        <b style="color:#FFFFFF;">RUSHR</b> est l'outil de dérushage pensé pour les vidéastes, les monteurs et les créateurs.
        Tu structures ton projet, tu importes tes prises, tu les prévisualises et tu les tagues au clavier (touches 1 à 9) —
        puis un clic sur « Prepare » range tout dans les bons dossiers, <b style="color:#FFFFFF;">avant même d'ouvrir ton logiciel de montage</b>.
        Tout se passe en local : tes rushes ne quittent jamais ta machine.
      </p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        RUSHR est gratuit pendant toute la beta, et tes retours façonnent directement l'outil. Le lien de téléchargement arrive très bientôt.
      </p>
    </td></tr>

    <!-- Boutons -->
    <tr><td style="padding:20px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:0 0 12px 0;">
            <a href="https://discord.gg/hyrP2f9g" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Rejoindre le Discord →</a>
            <div style="font-size:12px;color:#9A9A9E;text-align:center;padding-top:6px;">Annonces, support, idées et bugs</div>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://www.instagram.com/bpack.lab" style="display:block;text-align:center;background:transparent;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #3a3a41;">Nous suivre sur Instagram →</a>
            <div style="font-size:12px;color:#9A9A9E;text-align:center;padding-top:6px;">Les coulisses de RUSHR et de BACKPACK LAB</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Séparateur -->
    <tr><td style="padding:22px 32px 6px 32px;"><div style="height:1px;background:#26262b;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

    <!-- ================= ENGLISH ================= -->
    <tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
      <h2 style="margin:0 0 14px 0;font-size:22px;line-height:1.25;color:#FFFFFF;">Welcome to the beta, {{name}} 🎒</h2>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        You're signed up, thank you! You're now among the <b style="color:#FFFFFF;">first people to test RUSHR</b>.
      </p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        <b style="color:#FFFFFF;">RUSHR</b> is the dérushage tool built for videographers, editors and creators.
        Set up your project structure, import your clips, preview them and tag them from the keyboard (keys 1–9) —
        then one click on “Prepare” sorts everything into the right folders, <b style="color:#FFFFFF;">before you even open your editing software</b>.
        Everything runs locally: your footage never leaves your machine.
      </p>
      <p style="margin:0 0 6px 0;font-size:15px;line-height:1.65;color:#D6D6DA;">
        RUSHR is free for the whole beta, and your feedback directly shapes the tool. The download link is coming very soon.
      </p>
    </td></tr>

    <tr><td style="padding:20px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:0 0 12px 0;">
            <a href="https://discord.gg/hyrP2f9g" style="display:block;text-align:center;background:#FF6A00;color:#0B0B0B;text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:10px;">Join the Discord →</a>
            <div style="font-size:12px;color:#9A9A9E;text-align:center;padding-top:6px;">Announcements, support, ideas and bug reports</div>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://www.instagram.com/bpack.lab" style="display:block;text-align:center;background:transparent;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #3a3a41;">Follow us on Instagram →</a>
            <div style="font-size:12px;color:#9A9A9E;text-align:center;padding-top:6px;">Behind the scenes of RUSHR and BACKPACK LAB</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Pied de mail -->
    <tr><td style="padding:24px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#D6D6DA;">À très vite / See you soon,<br><b style="color:#FFFFFF;">L'équipe BACKPACK LAB</b></p>
      <p style="margin:14px 0 0 0;font-size:12px;line-height:1.6;color:#6E6E73;">
        Une question ? Écris-nous à <a href="mailto:contact@thebackpacklab.com" style="color:#9A9A9E;">contact@thebackpacklab.com</a>.
        Tu reçois ce message car tu t'es inscrit à la beta de RUSHR sur thebackpacklab.com. Pas de spam : uniquement les infos utiles.<br>
        You received this because you signed up for the RUSHR beta at thebackpacklab.com. No spam, only useful updates.
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
$mail$;
  v_html := replace(v_html, '{{name}}', v_name);

  return net.http_post(
    'https://api.resend.com/emails',
    jsonb_build_object(
      'from',    'Backpack Lab <noreply@thebackpacklab.com>',
      'to',      p_email,
      'subject', 'Bienvenue dans la beta de RUSHR 🎒 / Welcome to the RUSHR beta',
      'html',    v_html
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key)
  );
end;
$fn$;

-- Fonction interne : ne doit pas être appelable depuis le site (sinon = relais de spam).
revoke all on function public.beta_send_welcome(text, text) from public, anon, authenticated;

create or replace function public.beta_signup_welcome()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
begin
  perform public.beta_send_welcome(NEW.email, NEW.name);
  return NEW;
exception when others then
  return NEW;  -- l'inscription est déjà enregistrée : on n'échoue jamais à cause du mail
end;
$fn$;

drop trigger if exists trg_beta_signup_welcome on public.beta_signups;
create trigger trg_beta_signup_welcome
  after insert on public.beta_signups
  for each row execute function public.beta_signup_welcome();
