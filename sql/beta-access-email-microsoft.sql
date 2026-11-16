-- E-mail d'accès beta (render_beta_access_html) : Microsoft ajouté aux façons de se connecter (2026-11-16),
-- à l'étape 1 (création du compte) et à l'étape 3 (connexion dans l'app), en français et en anglais.
-- Appliqué sur Supabase (projet backpack-rushr) sous le nom « beta_access_email_microsoft ».
do $do$
declare
  d text := pg_get_functiondef('public.render_beta_access_html(text,text,text,text)'::regprocedure);
  pairs text[][] := array[
    array['(e-mail et mot de passe, ou Google)', '(e-mail et mot de passe, Google ou Microsoft)'],
    array['avec Google, ou avec ton e-mail et ton mot de passe', 'avec Google, Microsoft, ou avec ton e-mail et ton mot de passe'],
    array['(email and password, or Google)', '(email and password, Google or Microsoft)'],
    array['with Google, or with your email and password', 'with Google, Microsoft, or with your email and password']];
  i int;
begin
  if position('Microsoft' in d) > 0 then return; end if;
  for i in 1..array_length(pairs, 1) loop
    if position(pairs[i][1] in d) = 0 then raise exception 'MARKER_NOT_FOUND: %', pairs[i][1]; end if;
    d := replace(d, pairs[i][1], pairs[i][2]);
  end loop;
  execute d;
end
$do$;
