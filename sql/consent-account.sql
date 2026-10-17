-- Confirmation (ou retrait) du consentement aux emails d'information depuis le compte.
-- Appliqué sur Supabase le 2026-10-17 (migration « account_marketing_consent »).
--
-- Le visiteur est identifié par son adresse email VÉRIFIÉE par le code de connexion (auth.email()) :
-- il ne peut agir que sur sa propre inscription.
--   oui -> consentement enregistré (date + source 'account'), désabonnement éventuel levé
--   non -> désabonné

-- 1. get_my_account() renvoie l'état de consentement de l'inscription beta.
do $do$
declare d text;
begin
  select pg_get_functiondef('public.get_my_account()'::regprocedure) into d;
  if (length(d) - length(replace(d, 'jsonb_build_object(''created_at'', b.created_at, ''platform'', b.platform)', '')))
       / length('jsonb_build_object(''created_at'', b.created_at, ''platform'', b.platform)') <> 1 then
    raise exception 'get_my_account : motif attendu introuvable ou en double';
  end if;
  d := replace(d,
    'jsonb_build_object(''created_at'', b.created_at, ''platform'', b.platform)',
    'jsonb_build_object(''created_at'', b.created_at, ''platform'', b.platform, ''marketing_consent_at'', b.marketing_consent_at, ''marketing_consent_source'', b.marketing_consent_source, ''unsubscribed_at'', b.unsubscribed_at)');
  execute d;
end
$do$;

-- 2. Choix du consentement par l'utilisateur connecté.
create or replace function public.set_my_marketing_consent(p_consent boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_email text := lower(auth.email());
  v_row   public.beta_signups;
begin
  if auth.uid() is null or v_email is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_consent is null then raise exception 'INVALID_CHOICE'; end if;

  if p_consent then
    update public.beta_signups
       set marketing_consent_at = now(),
           marketing_consent_source = 'account',
           unsubscribed_at = null,
           last_contact_at = now()
     where lower(email) = v_email
     returning * into v_row;
  else
    update public.beta_signups
       set unsubscribed_at = coalesce(unsubscribed_at, now()),
           marketing_consent_at = null,
           marketing_consent_source = 'account-withdrawn'
     where lower(email) = v_email
     returning * into v_row;
  end if;

  if v_row.id is null then raise exception 'NO_SIGNUP'; end if;

  return jsonb_build_object(
    'marketing_consent_at', v_row.marketing_consent_at,
    'marketing_consent_source', v_row.marketing_consent_source,
    'unsubscribed_at', v_row.unsubscribed_at);
end;
$fn$;

revoke all on function public.set_my_marketing_consent(boolean) from public, anon;
grant execute on function public.set_my_marketing_consent(boolean) to authenticated;
