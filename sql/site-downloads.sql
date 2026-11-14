-- Links behind the website's download buttons (download.html, account page), one per
-- platform, set from the admin's "Boutons de téléchargement du site" card. Kept apart from
-- app_versions, whose download_url is what RushR itself uses for updates. When a platform
-- has no row (or an empty url), the site falls back to the latest app_versions.download_url.

-- 1) Table + admin function (applied first: purely additive).
create table if not exists public.site_downloads (
  platform   text primary key check (platform in ('windows', 'mac')),
  url        text,
  updated_at timestamptz not null default now()
);

alter table public.site_downloads enable row level security;

drop policy if exists "site_downloads readable by all" on public.site_downloads;
create policy "site_downloads readable by all" on public.site_downloads
  for select using (true);

grant select on public.site_downloads to anon, authenticated;

create or replace function public.admin_set_site_download(p_platform text, p_url text)
returns public.site_downloads
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v public.site_downloads;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  insert into public.site_downloads(platform, url, updated_at)
  values (lower(p_platform), nullif(btrim(p_url), ''), now())
  on conflict (platform) do update set url = excluded.url, updated_at = now()
  returning * into v;
  return v;
end; $function$;

revoke all on function public.admin_set_site_download(text, text) from public, anon;
grant execute on function public.admin_set_site_download(text, text) to authenticated, service_role;

-- 2) Cleanup, applied once the new site was live: undo app-versions-site-url.sql
-- (app_versions.site_download_url and the 6-argument admin_upsert_version).
drop function if exists public.admin_upsert_version(text, text, text, text, boolean, text);

create or replace function public.admin_upsert_version(
  p_platform text,
  p_version text,
  p_url text default null,
  p_changelog text default null,
  p_mandatory boolean default false)
returns public.app_versions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v public.app_versions;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  insert into public.app_versions(platform, latest_version, download_url, changelog, mandatory)
  values (lower(p_platform), p_version, nullif(btrim(p_url),''), nullif(btrim(p_changelog),''), coalesce(p_mandatory,false))
  returning * into v;
  return v;
end; $function$;

revoke all on function public.admin_upsert_version(text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_upsert_version(text, text, text, text, boolean) to authenticated, service_role;

alter table public.app_versions drop column if exists site_download_url;
