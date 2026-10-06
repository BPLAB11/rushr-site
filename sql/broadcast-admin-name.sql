-- Emailing admin : l'aperçu et le test utilisent le nom de l'admin connecté (plus « Alex » en dur).
-- Appliqué sur Supabase le 2026-10-06 (migration « broadcast_admin_name »).
-- Ordre de repli : nom du profil, sinon nom de l'inscription beta à la même adresse,
-- sinon début de l'adresse email, sinon « Alex ».

create or replace function public.admin_display_name()
returns text
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select coalesce(
    nullif(btrim((select p.full_name from public.profiles p where p.id = auth.uid())), ''),
    nullif(btrim((select b.name from public.beta_signups b where lower(b.email) = lower(auth.email()) order by b.created_at limit 1)), ''),
    nullif(split_part(coalesce(auth.email(), ''), '@', 1), ''),
    'Alex');
$fn$;
revoke all on function public.admin_display_name() from public, anon, authenticated;

do $do$
declare fn text; d text;
begin
  foreach fn in array array['public.admin_preview_broadcast(text,text,text)', 'public.admin_send_broadcast(text,text,text,text,boolean)'] loop
    select pg_get_functiondef(fn::regprocedure) into d;
    if position($o$p_cta_url, 'Alex', '#')$o$ in d) = 0 then
      raise exception 'motif attendu introuvable dans %', fn;
    end if;
    d := replace(d, $o$p_cta_url, 'Alex', '#')$o$, $n$p_cta_url, public.admin_display_name(), '#')$n$);
    execute d;
  end loop;
end
$do$;
