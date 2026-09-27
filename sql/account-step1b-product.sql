-- Compte global BACKPACK LAB — chaque licence / module indique son logiciel.
-- Appliqué sur Supabase le 2026-09-27 (migration « account_license_product »).

-- Toutes les licences existantes sont des licences RUSHR (clés RUSHR-…) : valeur par défaut = 'RUSHR'.
-- Une future licence d'un autre logiciel devra préciser son product à la création.
alter table public.licenses
  add column if not exists product text not null default 'RUSHR';

-- Modules : logiciel parent, renseigné à la main quand on le connaît (NULL = inconnu, rien n'est deviné).
alter table public.module_licenses
  add column if not exists product text;

update public.module_licenses
  set product = 'RUSHR'
  where product is null and module_id like 'com.backpacklab.rushr.%';

-- get_my_account() renvoie maintenant le logiciel de chaque licence et de chaque module.
do $do$
declare d text;
begin
  select pg_get_functiondef('public.get_my_account()'::regprocedure) into d;
  if position($o$'id', l.id, 'license_key', l.license_key,$o$ in d) = 0
     or position($o$'id', m.id, 'module_id', m.module_id,$o$ in d) = 0 then
    raise exception 'get_my_account: motif attendu introuvable';
  end if;
  d := replace(d, $o$'id', l.id, 'license_key', l.license_key,$o$, $n$'id', l.id, 'product', l.product, 'license_key', l.license_key,$n$);
  d := replace(d, $o$'id', m.id, 'module_id', m.module_id,$o$, $n$'id', m.id, 'product', m.product, 'module_id', m.module_id,$n$);
  execute d;
end
$do$;
