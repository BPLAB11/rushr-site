-- Separate URL for the site's download buttons (download.html, account page).
-- download_url stays the one RushR uses for its update popup ("Télécharger" fallback);
-- site_download_url is what the website's download buttons link to. When it is empty,
-- the site falls back to download_url.

alter table public.app_versions
  add column if not exists site_download_url text;

-- Same function as before, with one more optional parameter (p_site_url). The old
-- signature is dropped so PostgREST doesn't see two overloads.
drop function if exists public.admin_upsert_version(text, text, text, text, boolean);

create or replace function public.admin_upsert_version(
  p_platform text,
  p_version text,
  p_url text default null,
  p_changelog text default null,
  p_mandatory boolean default false,
  p_site_url text default null)
returns public.app_versions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v public.app_versions;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  insert into public.app_versions(platform, latest_version, download_url, changelog, mandatory, site_download_url)
  values (lower(p_platform), p_version, nullif(btrim(p_url),''), nullif(btrim(p_changelog),''),
          coalesce(p_mandatory,false), nullif(btrim(p_site_url),''))
  returning * into v;
  return v;
end; $function$;

revoke all on function public.admin_upsert_version(text, text, text, text, boolean, text) from public, anon;
grant execute on function public.admin_upsert_version(text, text, text, text, boolean, text) to authenticated, service_role;
