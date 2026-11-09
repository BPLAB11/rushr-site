-- ============================================================================
-- account-delete-test.sql
-- Test de account-delete.sql. A lancer dans Supabase > SQL Editor APRES avoir applique account-delete.sql.
-- Il SUPPRIME reellement un compte de test dans la transaction, verifie le resultat, puis ANNULE TOUT :
-- l'erreur finale « TEST_RESULT » est volontaire, et aucun e-mail n'est envoye (la file pg_net est annulee).
--
-- Resultat attendu :
--   cobaye_admin              false
--   1_send                    { status: sent }   (ou « MAIL_NOT_CONFIGURED » si la cle Resend manque)
--   2_wrong                   { status: invalid, left: 4 }
--   3_delete                  { status: ok }
--   4_userStillExists         false
--   5_profileStillExists      false
--   6_ticketsLeft             0
--   7_licensesStillLinked     0   (licences detachees : user_id et assigned_email effaces)
--   8_betaSignupLeft          0
--   9_downloadsKept           (nombre de telechargements conserves, anonymises : user_id null)
-- ============================================================================
do $t$
declare
  uid uuid;
  uemail text;
  sid uuid := gen_random_uuid();
  out jsonb := '{}'::jsonb;
  code text := '654321';
  n int;
begin
  select p.id into uid
    from public.profiles p
   where not exists (select 1 from public.admins a where a.user_id = p.id)
   order by p.created_at
   limit 1;
  if uid is null then raise exception 'Aucun compte non administrateur avec un profil.'; end if;
  select lower(email) into uemail from auth.users where id = uid;
  out := out || jsonb_build_object('cobaye_admin', exists (select 1 from public.admins a where a.user_id = uid));

  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated', 'email', uemail, 'session_id', sid, 'amr', jsonb_build_array(jsonb_build_object('method', 'otp', 'timestamp', 1)))::text, true);

  begin out := out || jsonb_build_object('1_send', public.sec_send_delete_code()); exception when others then out := out || jsonb_build_object('1_send', sqlerrm); end;

  -- on force un code connu (le vrai code n'est jamais lisible)
  insert into public.account_deletions (user_id, code_hash, expires_at, attempts, sent_at)
  values (uid, encode(digest(code || uid::text, 'sha256'), 'hex'), now() + interval '15 minutes', 0, now())
  on conflict (user_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;

  out := out || jsonb_build_object('2_wrong', public.delete_my_account('000000'));
  out := out || jsonb_build_object('3_delete', public.delete_my_account(code));

  out := out || jsonb_build_object('4_userStillExists', exists (select 1 from auth.users where id = uid));
  out := out || jsonb_build_object('5_profileStillExists', exists (select 1 from public.profiles where id = uid));
  select count(*) into n from public.support_tickets where user_id = uid;
  out := out || jsonb_build_object('6_ticketsLeft', n);
  select count(*) into n from public.licenses where user_id = uid or lower(assigned_email) = uemail;
  out := out || jsonb_build_object('7_licensesStillLinked', n);
  select count(*) into n from public.beta_signups where lower(email) = uemail;
  out := out || jsonb_build_object('8_betaSignupLeft', n);
  select count(*) into n from public.downloads where user_id is null;
  out := out || jsonb_build_object('9_downloadsKept', n);

  raise exception 'TEST_RESULT: %', out::text;
end
$t$;
