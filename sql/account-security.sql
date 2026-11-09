-- ============================================================================
-- account-security.sql
-- Espace compte : adresse e-mail / mot de passe modifiables, profil enrichi (telephone, societe)
-- et DOUBLE AUTHENTIFICATION PAR E-MAIL (code a 6 chiffres), appliquee cote base.
--
-- A coller dans Supabase > SQL Editor (un seul bloc). Idempotent (rejouable).
-- Le site fonctionne meme AVANT l'application de ce script : les fonctions sec_* sont detectees
-- a l'execution et les nouveaux champs n'apparaissent qu'apres.
--
-- Principe de la double authentification
--  * L'utilisateur l'active (a la creation du compte ou dans Mon compte) : table user_security.
--  * Apres une connexion par MOT DE PASSE (claim `amr` = password), chaque session doit etre validee
--    par un code envoye par e-mail (table login_challenges, une ligne par session Auth).
--    Les connexions Google / Microsoft (double auth du fournisseur) et par code e-mail (meme boite)
--    ne sont pas concernees.
--  * Tant que la session n'est pas validee, les fonctions du compte (get_my_account, claim_*...) et les
--    lignes « _own » de licenses / activations / profiles / support_tickets / module_licenses sont refusees
--    par la base : impossible a contourner depuis le navigateur.
--  * Envoi du code : Resend via pg_net, cle dans vault ('resend_api_key'), comme les autres e-mails.
--
-- Attention : un client qui se connecte par mot de passe et ne sait pas afficher l'etape « code »
-- (ex. une application de bureau) sera refuse pour les comptes qui ont active la double authentification.
-- ============================================================================

-- 1) Profil : telephone + societe ------------------------------------------------------
alter table public.profiles add column if not exists phone   text;
alter table public.profiles add column if not exists company text;
alter table public.profiles drop constraint if exists profiles_phone_chk;
alter table public.profiles add  constraint profiles_phone_chk
  check (phone is null or (char_length(phone) <= 32 and phone ~ '^[0-9+()./ -]*$'));
alter table public.profiles drop constraint if exists profiles_company_chk;
alter table public.profiles add  constraint profiles_company_chk
  check (company is null or char_length(company) <= 120);

-- 2) Tables de la double authentification -------------------------------------------------
create table if not exists public.user_security (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email_2fa  boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.login_challenges (
  session_id  uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text,
  expires_at  timestamptz,
  attempts    int  not null default 0,
  send_count  int  not null default 0,
  sent_at     timestamptz,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_challenges_user_sent_idx on public.login_challenges (user_id, sent_at);
alter table public.user_security   enable row level security;   -- aucune policy : acces par les fonctions uniquement
alter table public.login_challenges enable row level security;
revoke all on table public.user_security, public.login_challenges from anon, authenticated;

-- 3) Cette session doit-elle encore valider un code ? --------------------------------------
create or replace function public.sec_needs_second_factor()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
begin
  if v_uid is null then return false; end if;
  if not exists (select 1 from public.user_security s where s.user_id = v_uid and s.email_2fa) then return false; end if;
  -- seule une connexion par mot de passe est concernee
  if not exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a where a->>'method' = 'password'
  ) then return false; end if;
  v_sid := nullif(auth.jwt()->>'session_id', '')::uuid;
  if v_sid is null then return true; end if;
  return not exists (
    select 1 from public.login_challenges c
    where c.session_id = v_sid and c.user_id = v_uid and c.verified_at is not null
  );
end;
$function$;

create or replace function public.sec_session_ok()
returns boolean language sql stable security definer set search_path to 'public'
as $function$ select not public.sec_needs_second_factor(); $function$;

create or replace function public.sec_require_second_factor()
returns void language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if public.sec_needs_second_factor() then raise exception 'SECOND_FACTOR_REQUIRED'; end if;
end;
$function$;

create or replace function public.sec_status()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'email_2fa', coalesce((select s.email_2fa from public.user_security s where s.user_id = auth.uid()), false),
    'needs_second_factor', public.sec_needs_second_factor()
  );
$function$;

-- 4) Envoi du code par e-mail ----------------------------------------------------------------
create or replace function public.sec_send_login_code()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(auth.email());
  v_sid   uuid;
  v_row   public.login_challenges;
  v_key   text;
  v_code  text;
  v_html  text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.sec_needs_second_factor() then return jsonb_build_object('status', 'not_needed'); end if;
  v_sid := nullif(auth.jwt()->>'session_id', '')::uuid;
  if v_sid is null or v_email is null then raise exception 'NO_SESSION'; end if;

  delete from public.login_challenges where created_at < now() - interval '7 days';

  select * into v_row from public.login_challenges where session_id = v_sid;
  if found then
    if v_row.sent_at is not null and v_row.sent_at > now() - interval '30 seconds' then
      return jsonb_build_object('status', 'too_soon');
    end if;
    if v_row.send_count >= 6 then return jsonb_build_object('status', 'limit'); end if;
  end if;
  if (select count(*) from public.login_challenges where user_id = v_uid and sent_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('status', 'limit');
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then raise exception 'MAIL_NOT_CONFIGURED'; end if;

  v_code := lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');

  insert into public.login_challenges (session_id, user_id, code_hash, expires_at, attempts, sent_at, send_count)
  values (v_sid, v_uid, encode(digest(v_code || v_sid::text, 'sha256'), 'hex'), now() + interval '10 minutes', 0, now(), 1)
  on conflict (session_id) do update
    set code_hash  = excluded.code_hash,
        expires_at = excluded.expires_at,
        attempts   = 0,
        sent_at    = now(),
        send_count = public.login_challenges.send_count + 1
    where public.login_challenges.verified_at is null;

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Vérifiez votre connexion,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Quelqu'un vient de saisir le mot de passe de votre compte Backpack Lab. Saisissez ce code pour terminer la connexion. Il expire dans 10 minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de vérification</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">__CODE__</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe dès maintenant depuis <a href="https://thebackpacklab.com/account" style="color:#5FE8A8;text-decoration:underline;">thebackpacklab.com/account</a> (lien « Mot de passe oublié ? ») : sans ce code, personne ne peut accéder à votre compte. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Verify your sign-in</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Someone just entered your Backpack Lab password. Enter the code above to finish signing in. It expires in 10 minutes. If this wasn't you, change your password right away at thebackpacklab.com/account ("Forgot password?"): without this code nobody can access your account. Never share this code with anyone.</td>
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
      'subject', 'Votre code de vérification / Your verification code — BACKPACK LAB',
      'html',    v_html
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key)
  );
  return jsonb_build_object('status', 'sent');
end;
$fn$;

-- 5) Verification du code (renvoie un statut ; ne leve pas d'erreur pour que le compteur d'essais soit conserve)
create or replace function public.sec_verify_login_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $fn$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
  v_row public.login_challenges;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_sid := nullif(auth.jwt()->>'session_id', '')::uuid;
  if v_sid is null then raise exception 'NO_SESSION'; end if;

  select * into v_row from public.login_challenges where session_id = v_sid and user_id = v_uid for update;
  if not found then return jsonb_build_object('status', 'none'); end if;
  if v_row.verified_at is not null then return jsonb_build_object('status', 'ok'); end if;
  if v_row.code_hash is null then return jsonb_build_object('status', 'none'); end if;
  if v_row.expires_at < now() then return jsonb_build_object('status', 'expired'); end if;
  if v_row.attempts >= 5 then return jsonb_build_object('status', 'locked'); end if;

  if v_row.code_hash = encode(digest(btrim(coalesce(p_code, '')) || v_sid::text, 'sha256'), 'hex') then
    update public.login_challenges set verified_at = now(), code_hash = null where session_id = v_sid;
    return jsonb_build_object('status', 'ok');
  end if;
  update public.login_challenges set attempts = attempts + 1 where session_id = v_sid;
  return jsonb_build_object('status', 'invalid', 'left', greatest(0, 4 - v_row.attempts));
end;
$fn$;

-- 6) Activer / desactiver la double authentification -------------------------------------
create or replace function public.sec_set_email_2fa(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_uid uuid := auth.uid();
  v_sid uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not p_enabled and public.sec_needs_second_factor() then raise exception 'SECOND_FACTOR_REQUIRED'; end if;

  insert into public.user_security (user_id, email_2fa, updated_at) values (v_uid, p_enabled, now())
  on conflict (user_id) do update set email_2fa = excluded.email_2fa, updated_at = now();

  -- la session en cours est consideree comme validee (l'utilisateur est present)
  if p_enabled and v_sid is not null then
    insert into public.login_challenges (session_id, user_id, verified_at) values (v_sid, v_uid, now())
    on conflict (session_id) do update set verified_at = coalesce(public.login_challenges.verified_at, now());
  end if;
  return public.sec_status();
end;
$fn$;

-- 7) Droits : connecte uniquement ------------------------------------------------------------
revoke all on function public.sec_needs_second_factor()      from public, anon;
revoke all on function public.sec_session_ok()               from public, anon;
revoke all on function public.sec_require_second_factor()    from public, anon;
revoke all on function public.sec_status()                   from public, anon;
revoke all on function public.sec_send_login_code()          from public, anon;
revoke all on function public.sec_verify_login_code(text)    from public, anon;
revoke all on function public.sec_set_email_2fa(boolean)     from public, anon;
grant execute on function public.sec_needs_second_factor()   to authenticated;
grant execute on function public.sec_session_ok()            to authenticated;
grant execute on function public.sec_require_second_factor() to authenticated;
grant execute on function public.sec_status()                to authenticated;
grant execute on function public.sec_send_login_code()       to authenticated;
grant execute on function public.sec_verify_login_code(text) to authenticated;
grant execute on function public.sec_set_email_2fa(boolean)  to authenticated;

-- 8) get_my_account : profil enrichi (telephone, societe) + controle de la double authentification
create or replace function public.get_my_account()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(auth.email());
  v_res   jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.sec_require_second_factor();

  if v_email is not null then
    update public.licenses        set user_id = v_uid where user_id is null and lower(assigned_email) = v_email;
    update public.module_licenses set user_id = v_uid where user_id is null and lower(assigned_email) = v_email;
  end if;

  insert into public.profiles(id) values (v_uid) on conflict (id) do nothing;

  select jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_uid,
      'email', v_email,
      'created_at', (select u.created_at from auth.users u where u.id = v_uid)
    ),
    'profile', (
      select jsonb_build_object(
        'full_name', p.full_name, 'language', p.language,
        'phone', p.phone, 'company', p.company,
        'email_pref_releases', p.email_pref_releases,
        'email_pref_tips', p.email_pref_tips,
        'email_pref_offers', p.email_pref_offers)
      from public.profiles p where p.id = v_uid),
    'licenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'product', l.product, 'license_key', l.license_key, 'status', l.status, 'plan', l.plan,
        'max_devices', l.max_devices, 'expires_at', l.expires_at, 'created_at', l.created_at,
        'activations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'machine_name', a.machine_name, 'app_version', a.app_version,
            'activated_at', a.activated_at, 'last_check_at', a.last_check_at,
            'lease_expires_at', a.lease_expires_at, 'revoked_at', a.revoked_at)
            order by a.activated_at)
          from public.activations a where a.license_id = l.id), '[]'::jsonb)
      ) order by l.created_at)
      from public.licenses l where l.user_id = v_uid), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'product', m.product, 'module_id', m.module_id, 'status', m.status, 'plan', m.plan,
        'activation_key', m.activation_key, 'created_at', m.created_at)
        order by m.created_at)
      from public.module_licenses m where m.user_id = v_uid), '[]'::jsonb),
    'beta_signup', (
      select jsonb_build_object('created_at', b.created_at, 'platform', b.platform, 'marketing_consent_at', b.marketing_consent_at, 'marketing_consent_source', b.marketing_consent_source, 'unsubscribed_at', b.unsubscribed_at)
      from public.beta_signups b where lower(b.email) = v_email limit 1),
    'is_admin', public.is_admin()
  ) into v_res;

  return v_res;
end;
$function$;

-- 9) claim_my_beta_key : adresse confirmee obligatoire + double authentification ---------------
create or replace function public.claim_my_beta_key()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_email text := lower(auth.email());
begin
  if auth.uid() is null or v_email is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  perform public.sec_require_second_factor();
  if not exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_CONFIRMED';
  end if;
  return public.claim_beta_key(v_email);   -- exige deja une inscription beta (NOT_REGISTERED sinon)
end;
$function$;

-- 10) Autres fonctions du compte : ajoute le controle en tete (idempotent) ------------------
do $do$
declare
  r   record;
  def text;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('claim_license', 'claim_free_license', 'claim_module_license', 'set_my_marketing_consent')
      and p.prolang = (select oid from pg_language where lanname = 'plpgsql')
  loop
    def := pg_get_functiondef(r.oid);
    if position('sec_require_second_factor' in def) = 0 then
      def := regexp_replace(def, '\mbegin\M', E'begin\n  perform public.sec_require_second_factor();', 'i');
      execute def;
    end if;
  end loop;
end
$do$;

-- 11) Policies « _own » : la session doit etre validee ---------------------------------------
do $do$
declare r record;
begin
  for r in
    select * from pg_policies
    where schemaname = 'public'
      and policyname like '%\_own'
      and (
        (tablename in ('licenses', 'activations') and cmd = 'SELECT')
        or (tablename in ('profiles', 'support_tickets', 'module_licenses') and cmd in ('SELECT', 'UPDATE'))
      )
  loop
    if r.qual is not null and position('sec_session_ok' in r.qual) = 0 then
      execute format('alter policy %I on %I.%I using ((%s) and (select public.sec_session_ok()))',
                     r.policyname, r.schemaname, r.tablename, r.qual);
    end if;
    if r.with_check is not null and position('sec_session_ok' in r.with_check) = 0 then
      execute format('alter policy %I on %I.%I with check ((%s) and (select public.sec_session_ok()))',
                     r.policyname, r.schemaname, r.tablename, r.with_check);
    end if;
  end loop;
end
$do$;

-- 12) Le compte a-t-il deja un mot de passe ? (invite les comptes crees par code / Google a en creer un) -----
create or replace function public.sec_has_password()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select u.encrypted_password is not null and u.encrypted_password <> '' from auth.users u where u.id = auth.uid()), false);
$function$;
revoke all on function public.sec_has_password() from public, anon;
grant execute on function public.sec_has_password() to authenticated;
