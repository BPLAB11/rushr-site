-- E-mail d'accès beta (render_beta_access_html) : bouton vers le guide de démarrage /guide,
-- juste après l'étape 3, en français et en anglais (2026-11-16).
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_access_email_guide_link ».
-- La migration modifie la fonction en place (idempotente : ne fait rien si le lien est déjà là).
do $do$
declare
  d text := pg_get_functiondef('public.render_beta_access_html(text,text,text,text)'::regprocedure);
  fr_mark text := E'Tes retours façonnent directement l''outil.</p>\n    </td></tr>';
  en_mark text := E'Your feedback directly shapes the tool.</p>\n    </td></tr>';
  btn text := E'\n    <tr><td style="padding:12px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">\n      <a href="https://thebackpacklab.com/guide" style="display:block;text-align:center;background:transparent;color:#FF8A3D;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;border:1px solid #5a3a22;">%s</a>\n    </td></tr>';
begin
  if position('thebackpacklab.com/guide' in d) > 0 then return; end if;
  if position(fr_mark in d) = 0 or position(en_mark in d) = 0 then raise exception 'MARKERS_NOT_FOUND'; end if;
  d := replace(d, fr_mark, fr_mark || format(btn, 'Lire le guide de démarrage'));
  d := replace(d, en_mark, en_mark || format(btn, 'Read the getting-started guide (French)'));
  execute d;
end
$do$;
