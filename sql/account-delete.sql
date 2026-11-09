-- ============================================================================
-- account-delete.sql
-- Suppression DEFINITIVE du compte par l'utilisateur (Mon compte > Supprimer mon compte).
-- A coller dans Supabase > SQL Editor APRES account-security.sql. Idempotent (rejouable).
--
-- Deroulement : 1) sec_send_delete_code() envoie un code a 6 chiffres par e-mail (valable 15 min)
--               2) delete_my_account(code) verifie le code puis supprime / anonymise.
-- Les deux exigent une session valide (double authentification comprise) et refusent les administrateurs.
--
-- Ce qui est supprime : le compte (auth.users, identites, sessions), le profil, les reglages de securite,
-- les tickets de support, l'inscription beta (liste d'e-mails).
-- Ce qui est anonymise : les telechargements (lien avec le compte coupe) ; les licences et licences de
-- modules sont DETACHEES de la personne (user_id et assigned_email effaces), la ligne est conservee.
-- Ce qui est conserve (obligations comptables) : les commandes de la boutique (shop_orders).
-- ============================================================================

create table if not exists public.account_deletions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code_hash  text,
  expires_at timestamptz,
  attempts   int not null default 0,
  sent_at    timestamptz
);
alter table public.account_deletions enable row level security;
revoke all on table public.account_deletions from anon, authenticated;

-- sec_status : indique si le compte peut etre supprime depuis l'interface (jamais pour un administrateur)
create or replace function public.sec_status()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'email_2fa', coalesce((select s.email_2fa from public.user_security s where s.user_id = auth.uid()), false),
    'needs_second_factor', public.sec_needs_second_factor(),
    'can_delete', (auth.uid() is not null and not exists (select 1 from public.admins a where a.user_id = auth.uid()))
  );
$function$;

-- 1) Envoi du code de confirmation -----------------------------------------------------------
create or replace function public.sec_send_delete_code()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_row   public.account_deletions;
  v_key   text;
  v_code  text;
  v_html  text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.sec_require_second_factor();
  if exists (select 1 from public.admins a where a.user_id = v_uid) then return jsonb_build_object('status', 'admin'); end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null then raise exception 'NO_EMAIL'; end if;

  select * into v_row from public.account_deletions where user_id = v_uid;
  if found and v_row.sent_at is not null and v_row.sent_at > now() - interval '60 seconds' then
    return jsonb_build_object('status', 'too_soon');
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'MAIL_NOT_CONFIGURED'; end if;

  v_code := lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into public.account_deletions (user_id, code_hash, expires_at, attempts, sent_at)
  values (v_uid, encode(digest(v_code || v_uid::text, 'sha256'), 'hex'), now() + interval '15 minutes', 0, now())
  on conflict (user_id) do update
    set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now();

  v_html := $mail$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0B;margin:0;padding:36px 0;font-family:Inter,Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:0 16px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;">
        <!-- Logo -->
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle"><img src="https://thebackpacklab.com/assets/bp-mark-120.png" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px;"></td>
              <td valign="middle" style="padding-left:12px;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:1px;">BACKPACK&nbsp;LAB</td>
            </tr></table>
          </td>
        </tr>
        <!-- Salutation + introduction -->
        <tr>
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Confirmez la suppression de votre compte,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Vous avez demandé la suppression définitive de votre compte Backpack Lab. Saisissez ce code pour confirmer. Cette action est irréversible. Le code expire dans 15 minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de suppression</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">__CODE__</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Ne saisissez pas ce code et ne le communiquez à personne. Quelqu'un a peut-être accès à votre session : changez votre mot de passe dès maintenant depuis <a href="https://thebackpacklab.com/account" style="color:#5FE8A8;text-decoration:underline;">thebackpacklab.com/account</a> et écrivez-nous à <a href="mailto:contact@thebackpacklab.com" style="color:#5FE8A8;text-decoration:underline;">contact@thebackpacklab.com</a>.</td>
        </tr>
        <!-- Signature -->
        <tr>
          <td align="left" style="padding:0 0 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#C8C8CC;font-size:13px;line-height:1.6;">Cordialement,<br><b style="color:#ffffff;">L'équipe Backpack Lab</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Separateur + version anglaise -->
        <tr><td style="padding:0 0 24px 0;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr>
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Confirm your account deletion</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">You asked to permanently delete your Backpack Lab account. Enter the code above to confirm. This action cannot be undone. The code expires in 15 minutes. If this wasn't you, do not enter or share this code: change your password right away at thebackpacklab.com/account and contact us at contact@thebackpacklab.com.</td>
        </tr>
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#9A9A9E;font-size:13px;line-height:1.6;">Best regards,<br><b style="color:#ffffff;">The Backpack Lab team</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Pied de page -->
        <tr>
          <td align="left" style="color:#5E5E64;font-size:11px;line-height:1.6;">&#169; 2026 BACKPACK LAB &#183; thebackpacklab.com</td>
        </tr>
      </table>
    </td>
  </tr>
</table>$mail$;
  v_html := replace(v_html, '__CODE__', v_code);

  perform net.http_post(
    'https://api.resend.com/emails',
    jsonb_build_object(
      'from',    'Backpack Lab <noreply@thebackpacklab.com>',
      'to',      v_email,
      'subject', 'Confirmez la suppression de votre compte / Confirm your account deletion — BACKPACK LAB',
      'html',    v_html
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key)
  );
  return jsonb_build_object('status', 'sent');
end;
$fn$;

-- 2) Suppression ----------------------------------------------------------------------------------
create or replace function public.delete_my_account(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_row   public.account_deletions;
  v_key   text;
  v_html  text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.sec_require_second_factor();
  if exists (select 1 from public.admins a where a.user_id = v_uid) then return jsonb_build_object('status', 'admin'); end if;

  select * into v_row from public.account_deletions where user_id = v_uid for update;
  if not found or v_row.code_hash is null then return jsonb_build_object('status', 'none'); end if;
  if v_row.expires_at < now() then return jsonb_build_object('status', 'expired'); end if;
  if v_row.attempts >= 5 then return jsonb_build_object('status', 'locked'); end if;

  if v_row.code_hash <> encode(digest(btrim(coalesce(p_code, '')) || v_uid::text, 'sha256'), 'hex') then
    update public.account_deletions set attempts = attempts + 1 where user_id = v_uid;
    return jsonb_build_object('status', 'invalid', 'left', greatest(0, 4 - v_row.attempts));
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  -- donnees rattachees a la personne
  delete from public.support_tickets where user_id = v_uid;
  if v_email is not null then
    delete from public.beta_signups where lower(email) = v_email;
  end if;
  update public.licenses        set user_id = null, assigned_email = null where user_id = v_uid or (v_email is not null and lower(assigned_email) = v_email);
  update public.module_licenses set user_id = null, assigned_email = null where user_id = v_uid or (v_email is not null and lower(assigned_email) = v_email);

  -- e-mail de confirmation (au mieux : un echec d'envoi n'empeche pas la suppression)
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
    if v_key is not null and v_email is not null then
      v_html := replace($mail$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0B;margin:0;padding:36px 0;font-family:Inter,Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:0 16px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;">
        <!-- Logo -->
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle"><img src="https://thebackpacklab.com/assets/bp-mark-120.png" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px;"></td>
              <td valign="middle" style="padding-left:12px;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:1px;">BACKPACK&nbsp;LAB</td>
            </tr></table>
          </td>
        </tr>
        <!-- Salutation + introduction -->
        <tr>
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Votre compte a été supprimé,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Votre compte Backpack Lab et ses données personnelles ont été supprimés définitivement, comme vous l'avez demandé. Vos licences ont été détachées de votre adresse. Merci d'avoir testé nos logiciels.</td>
        </tr>
        <!-- Compte concerne -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="left" style="padding:16px 20px 0 20px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Compte supprimé / Account</td></tr>
              <tr><td align="left" style="padding:4px 20px 18px 20px;color:#ffffff;font-size:17px;line-height:1.4;font-weight:700;word-break:break-all;">__EMAIL__</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Écrivez-nous immédiatement à <a href="mailto:contact@thebackpacklab.com" style="color:#5FE8A8;text-decoration:underline;">contact@thebackpacklab.com</a> en précisant l'adresse concernée.</td>
        </tr>
        <!-- Signature -->
        <tr>
          <td align="left" style="padding:0 0 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#C8C8CC;font-size:13px;line-height:1.6;">Cordialement,<br><b style="color:#ffffff;">L'équipe Backpack Lab</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Separateur + version anglaise -->
        <tr><td style="padding:0 0 24px 0;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr>
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Your account was deleted</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Your Backpack Lab account and its personal data were permanently deleted, as you requested. Your licenses were detached from your address. Thank you for trying our software. If this wasn't you, contact us right away at contact@thebackpacklab.com.</td>
        </tr>
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#9A9A9E;font-size:13px;line-height:1.6;">Best regards,<br><b style="color:#ffffff;">The Backpack Lab team</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Pied de page -->
        <tr>
          <td align="left" style="color:#5E5E64;font-size:11px;line-height:1.6;">&#169; 2026 BACKPACK LAB &#183; thebackpacklab.com</td>
        </tr>
      </table>
    </td>
  </tr>
</table>$mail$, '__EMAIL__', v_email);
      perform net.http_post(
        'https://api.resend.com/emails',
        jsonb_build_object(
          'from',    'Backpack Lab <noreply@thebackpacklab.com>',
          'to',      v_email,
          'subject', 'Votre compte a été supprimé / Your account was deleted — BACKPACK LAB',
          'html',    v_html
        ),
        '{}'::jsonb,
        jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key)
      );
    end if;
  exception when others then null;
  end;

  -- le compte : profil, securite, codes et telechargements (anonymises) suivent par les cles etrangeres
  delete from auth.users where id = v_uid;
  return jsonb_build_object('status', 'ok');
end;
$fn$;

revoke all on function public.sec_send_delete_code()   from public, anon;
revoke all on function public.delete_my_account(text)  from public, anon;
grant execute on function public.sec_send_delete_code()  to authenticated;
grant execute on function public.delete_my_account(text) to authenticated;
