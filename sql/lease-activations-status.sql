-- get_my_account(): expose le statut de bail de chaque appareil (cahier des charges, section 7-8).
-- Le dashboard s'en sert pour afficher si un appareil compte toujours dans la limite, et
-- jusqu'à quand (lease_expires_at), ou s'il est en cours de libération (revoked_at).

create or replace function public.get_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
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
      select jsonb_build_object('created_at', b.created_at, 'platform', b.platform)
      from public.beta_signups b where lower(b.email) = v_email limit 1),
    'is_admin', public.is_admin()
  ) into v_res;

  return v_res;
end;
$function$;

revoke all on function public.get_my_account() from public, anon;
grant execute on function public.get_my_account() to authenticated;
