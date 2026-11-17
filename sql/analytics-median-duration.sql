-- Statistiques admin (analytics_admin_summary) : ajoute la durée médiane par page vue (2026-11-17).
-- La moyenne était tirée vers le haut par quelques onglets restés ouverts des heures ; la médiane donne la durée typique.
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « analytics_median_duration ».
do $do$
declare
  d text := pg_get_functiondef('public.analytics_admin_summary(integer)'::regprocedure);
  mark text := $m$'avg_duration_ms', (select coalesce(avg(duration_ms),0) from public.page_views where created_at > since and not is_bot and duration_ms is not null),$m$;
  add text := $m$
    'median_duration_ms', (select coalesce(percentile_cont(0.5) within group (order by duration_ms),0) from public.page_views where created_at > since and not is_bot and duration_ms is not null),$m$;
begin
  if position('median_duration_ms' in d) > 0 then return; end if;
  if position(mark in d) = 0 then raise exception 'MARKER_NOT_FOUND'; end if;
  execute replace(d, mark, mark || add);
end
$do$;
