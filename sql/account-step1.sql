-- Compte global BACKPACK LAB — étape 1 (licences, appareils, modules regroupés par compte).
-- Appliqué sur Supabase le 2026-09-27 (migration « account_step1 »).
-- Ne touche PAS à get_my_license / claim_license / deactivate_activation / submit_support_ticket.

-- 1. Les modules ont enfin un propriétaire, rattachable par email ou par clé.
alter table public.module_licenses
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_email text;

create index if not exists module_licenses_user_id_idx on public.module_licenses(user_id);
create index if not exists licenses_user_id_idx on public.licenses(user_id);
create index if not exists licenses_assigned_email_idx on public.licenses(lower(assigned_email));

drop policy if exists module_licenses_select_own on public.module_licenses;
create policy module_licenses_select_own on public.module_licenses
  for select to authenticated using (user_id = auth.uid());

-- 2. Tout le compte en un seul appel. Rattache au passage TOUTES les licences/modules
--    émis à l'adresse email vérifiée (le code reçu par email prouve qu'elle appartient à la personne).
create or replace function public.get_my_account()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(auth.email());
  v_res   jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

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
        'email_pref_releases', p.email_pref_releases,
        'email_pref_tips', p.email_pref_tips,
        'email_pref_offers', p.email_pref_offers)
      from public.profiles p where p.id = v_uid),
    'licenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'license_key', l.license_key, 'status', l.status, 'plan', l.plan,
        'max_devices', l.max_devices, 'expires_at', l.expires_at, 'created_at', l.created_at,
        'activations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'machine_name', a.machine_name, 'app_version', a.app_version,
            'activated_at', a.activated_at, 'last_check_at', a.last_check_at)
            order by a.activated_at)
          from public.activations a where a.license_id = l.id), '[]'::jsonb)
      ) order by l.created_at)
      from public.licenses l where l.user_id = v_uid), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'module_id', m.module_id, 'status', m.status, 'plan', m.plan,
        'activation_key', m.activation_key, 'created_at', m.created_at)
        order by m.created_at)
      from public.module_licenses m where m.user_id = v_uid), '[]'::jsonb),
    'beta_signup', (
      select jsonb_build_object('created_at', b.created_at, 'platform', b.platform)
      from public.beta_signups b where lower(b.email) = v_email limit 1),
    'is_admin', public.is_admin()
  ) into v_res;

  return v_res;
end;
$fn$;

revoke all on function public.get_my_account() from public, anon;
grant execute on function public.get_my_account() to authenticated;

-- 3. Rattacher un module à son compte avec sa clé (même principe que claim_license).
create or replace function public.claim_module_license(p_key text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v public.module_licenses;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v from public.module_licenses where activation_key = btrim(p_key);
  if not found then raise exception 'LICENSE_NOT_FOUND'; end if;
  if v.user_id is not null and v.user_id <> auth.uid() then raise exception 'LICENSE_ALREADY_CLAIMED'; end if;
  update public.module_licenses set user_id = auth.uid() where id = v.id;
end;
$fn$;

revoke all on function public.claim_module_license(text) from public, anon;
grant execute on function public.claim_module_license(text) to authenticated;
