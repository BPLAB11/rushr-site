-- Libération de machine (cahier des charges, section 8).
-- 1. Retire deactivate_activation : libération instantanée accessible à tout utilisateur
--    connecté, qui rouvrait la faille de double usage. Plus aucun appelant.
-- 2. Libération immédiate réservée au support : quota mensuel par licence, journalisée.

drop function if exists public.deactivate_activation(uuid);

alter table public.licenses
  add column if not exists immediate_release_quota integer not null default 2,
  add column if not exists immediate_releases_month date;

create or replace function public.support_release_device(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device  public.activations%rowtype;
  v_license public.licenses%rowtype;
  v_month   date := date_trunc('month', now())::date;
  v_used    integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_device from public.activations where id = p_device_id;
  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  select * into v_license from public.licenses where id = v_device.license_id for update;

  if v_license.immediate_releases_month is distinct from v_month then
    v_used := 0;
  else
    v_used := v_license.immediate_releases_this_month;
  end if;

  if v_used >= v_license.immediate_release_quota then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  -- lease_expires_at = now() : la formule de slot occupé (revoked_at IS NULL OR
  -- lease_expires_at > now()) libère le slot immédiatement.
  update public.activations
     set revoked_at = now(), lease_expires_at = now()
   where id = v_device.id;

  update public.licenses
     set immediate_releases_this_month = v_used + 1,
         immediate_releases_month = v_month
   where id = v_license.id;

  insert into public.license_audit (license_id, device_id, event)
  values (v_license.id, v_device.id, 'release_immediate');

  return jsonb_build_object('status', 'released_now', 'used', v_used + 1, 'quota', v_license.immediate_release_quota);
end;
$$;

revoke all on function public.support_release_device(uuid) from public, anon;
grant execute on function public.support_release_device(uuid) to authenticated;
