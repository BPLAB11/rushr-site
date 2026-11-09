-- ============================================================================
-- account-security-test.sql  (v2 : cobaye NON administrateur)
-- Test de account-security.sql. A lancer dans Supabase > SQL Editor APRES avoir applique
-- account-security.sql. Ne laisse AUCUNE trace : tout est annule a la fin (l'erreur finale
-- « TEST_RESULT » est volontaire, c'est elle qui affiche le resultat). Aucun e-mail n'est envoye.
--
-- Resultat attendu (cles du JSON) :
--   1_off                      { email_2fa:false, needs_second_factor:false }
--   2_enable                   { email_2fa:true,  needs_second_factor:false }   (session en cours validee)
--   3_sameSessionOk            { email_2fa:true,  needs_second_factor:false }
--   4_newSession               { email_2fa:true,  needs_second_factor:true  }   (autre session : code requis)
--   5_guard / 5b_claimGuard    SECOND_FACTOR_REQUIRED
--   6_rlsProfilesUnverified    0   (aucune ligne visible tant que la session n'est pas validee)
--   7_send                     { status:sent }   (ou « MAIL_NOT_CONFIGURED » si la cle Resend manque)
--   8_tooSoon                  { status:too_soon }
--   9_wrong                    { status:invalid, left:4 }
--   10_right                   { status:ok }
--   11_after                   { needs_second_factor:false }
--   12_rlsProfilesVerified     1
--   13_getMyAccount            ok
--   14_oauth                   { needs_second_factor:false }   (connexion Google/Microsoft jamais concernee)
-- ============================================================================
do $t$
declare
  uid uuid;
  sid uuid := gen_random_uuid();
  out jsonb := '{}'::jsonb;
  code text := '123456';
  cnt int;
  pol text;
begin
  -- un compte existant NON administrateur, avec une ligne de profil (les administrateurs voient tous les profils)
  select p.id into uid
    from public.profiles p
   where not exists (select 1 from public.admins a where a.user_id = p.id)
   order by p.created_at
   limit 1;
  if uid is null then raise exception 'Aucun compte non administrateur avec un profil : impossible de tester la ligne 6 (lancer le test apres une premiere connexion a Mon compte).'; end if;
  out := out || jsonb_build_object('cobaye_admin', exists (select 1 from public.admins a where a.user_id = uid));

  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated', 'email', 'test@example.com', 'session_id', sid, 'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 1)))::text, true);

  out := out || jsonb_build_object('1_off', public.sec_status());
  out := out || jsonb_build_object('2_enable', public.sec_set_email_2fa(true));
  out := out || jsonb_build_object('3_sameSessionOk', public.sec_status());

  -- nouvelle session connectee par mot de passe, non validee
  sid := gen_random_uuid();
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated', 'email', 'test@example.com', 'session_id', sid, 'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 1)))::text, true);
  out := out || jsonb_build_object('4_newSession', public.sec_status());
  begin perform public.get_my_account(); out := out || jsonb_build_object('5_guard', 'NOT RAISED'); exception when others then out := out || jsonb_build_object('5_guard', sqlerrm); end;
  begin perform public.claim_my_beta_key(); out := out || jsonb_build_object('5b_claimGuard', 'NOT RAISED'); exception when others then out := out || jsonb_build_object('5b_claimGuard', sqlerrm); end;

  execute 'set local role authenticated';
  select count(*) into cnt from public.profiles where id = uid;
  out := out || jsonb_build_object('6_rlsProfilesUnverified', cnt);
  execute 'reset role';

  begin out := out || jsonb_build_object('7_send', public.sec_send_login_code()); exception when others then out := out || jsonb_build_object('7_send', sqlerrm); end;
  begin out := out || jsonb_build_object('8_tooSoon', public.sec_send_login_code()); exception when others then out := out || jsonb_build_object('8_tooSoon', sqlerrm); end;

  -- on force un code connu pour tester la verification (le vrai code n'est jamais lisible)
  insert into public.login_challenges (session_id, user_id, code_hash, expires_at, send_count, sent_at)
  values (sid, uid, encode(digest(code || sid::text, 'sha256'), 'hex'), now() + interval '10 minutes', 1, now())
  on conflict (session_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;
  out := out || jsonb_build_object('9_wrong', public.sec_verify_login_code('000000'));
  out := out || jsonb_build_object('10_right', public.sec_verify_login_code(code));
  out := out || jsonb_build_object('11_after', public.sec_status());

  execute 'set local role authenticated';
  select count(*) into cnt from public.profiles where id = uid;
  out := out || jsonb_build_object('12_rlsProfilesVerified', cnt);
  execute 'reset role';

  begin perform public.get_my_account(); out := out || jsonb_build_object('13_getMyAccount', 'ok'); exception when others then out := out || jsonb_build_object('13_getMyAccount', sqlerrm); end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated', 'session_id', gen_random_uuid(), 'amr', jsonb_build_array(jsonb_build_object('method', 'oauth', 'timestamp', 1)))::text, true);
  out := out || jsonb_build_object('14_oauth', public.sec_status());

  raise exception 'TEST_RESULT: %', out::text;
end
$t$;
