# Handoff — Connexion de l'app RushR : ce qui a changé côté site et points à traiter

**Pour :** l'équipe qui travaille sur l'app desktop RushR (Windows + macOS)
**De :** l'équipe du site thebackpacklab.com
**Objet :** la connexion e-mail + mot de passe de RushR dépend maintenant de plusieurs éléments du site et de Supabase. Ce document décrit ce qui est en ligne, les écarts avec votre handoff, et ce que l'app doit gérer.

---

## 1. En résumé

| Sujet | État |
|-------|------|
| Page `https://thebackpacklab.com/auth/rushr-turnstile.html` | **En ligne** (V2, avec `rushrEmitToApp`), mais avec 2 écarts par rapport à votre fichier (§2 et §3) |
| Anti-robot (Cloudflare Turnstile) dans Supabase | **Actif** : toute connexion par mot de passe sans `captchaToken` est refusée |
| Comptes existants | La plupart **n'ont pas de mot de passe** (comptes créés par code e-mail ou Google) : ils ne peuvent pas se connecter dans l'app tant qu'ils n'en ont pas créé un sur le site (§5) |
| Double authentification par e-mail (nouveau, optionnelle pour l'utilisateur) | **Non gérée par l'app** : un compte qui l'active est refusé par la base dans l'app (§6) |
| Règles de mot de passe | 10 caractères minimum + minuscule + majuscule + chiffre + symbole (§7) |

---

## 2. Écart n°1 — la page de votre handoff ne dessinait pas le widget toute seule

**Constat (testé sur le site en ligne).** Avec le HTML exact de votre handoff, le widget Turnstile **n'apparaît pas** : il ne s'affiche que si `turnstileReady()` est appelée à la main.

**Cause.** Le script est chargé avec `?render=explicit` **sans paramètre `onload`**. Le script inline s'exécute avant que `window.turnstile` existe, il enregistre donc `window.onloadTurnstileCallback`… mais Cloudflare n'appelle cette fonction que si l'URL contient `&onload=onloadTurnstileCallback`. Rien ne déclenche donc le rendu.

**Correction appliquée sur le site (à reporter dans votre dépôt).**

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=turnstileReady" async defer></script>
```

et une garde au début de `renderWidget` pour éviter un second rendu si l'app appelle aussi `turnstileReady()` / `renderWidget()` :

```js
function renderWidget() {
  if (widgetId !== null) return;
  widgetId = turnstile.render('#captcha', { /* ... inchangé ... */ });
}
```

Le reste de votre fichier est repris tel quel (site key, `rushrEmitToApp`, `resetTurnstile`, `turnstileReady`, `window.emit` conservé comme alias de `rushrEmitToApp` pour l'ancienne version).

**Action RushR :** appliquer la même correction dans `build-tools/web/rushr-turnstile.html` **et** `Turnstile/captcha.html` (embarqué dans l'installateur), sinon les deux versions divergeront. Si l'app injecte déjà un patch JS après chargement, vérifier qu'il ne fait pas un second `turnstile.render` (la garde l'évite).

---

## 3. Écart n°2 — l'URL en `.html` répond par une redirection 308

```text
GET /auth/rushr-turnstile.html  ->  308  Location: /auth/rushr-turnstile  ->  200 text/html
```

- Tout le site est servi en « URL propres » (sans `.html`) : Vercel redirige **toute** adresse se terminant par `.html`, avant même de chercher le fichier. Nous avons essayé de servir l'adresse exacte sans redirection (fichier en `.html.html`) : **impossible**, nous avons rétabli la disposition précédente.
- Une WebView (WebView2 / WKWebView) suit une redirection 308 de navigation sans difficulté. **À confirmer par un vrai test.**
- Votre contrôle `curl -I https://thebackpacklab.com/auth/rushr-turnstile.html` affichera donc **308**, pas 200. Utiliser `curl -IL` (suit la redirection) : on obtient `200`, `Content-Type: text/html; charset=utf-8` et `X-Robots-Tag: noindex, nofollow`.
- Si l'app a besoin d'un 200 direct (par exemple si elle compare l'URL finale à `TurnstileBridgeUrl`), **dites-le-nous** : on pourra publier la page sous une autre adresse stable et vous mettrez à jour la constante `TurnstileBridgeUrl` dans `SupabaseConfig.cs`. L'adresse sans extension `https://thebackpacklab.com/auth/rushr-turnstile` répond 200 directement.

---

## 4. Ce que l'app doit faire avec Supabase (rappels)

Supabase **exige un jeton Turnstile** sur ces appels (CAPTCHA activé pour tout le projet) :

- `signInWithPassword` (`POST /auth/v1/token?grant_type=password`) → champ `gotrue_meta_security.captcha_token`
- `signUp`, `resend`, `resetPasswordForEmail`, `signInWithOtp` (si l'app les utilise un jour)

Points d'attention :

- Un jeton est **à usage unique** et expire au bout d'environ 5 minutes. Après chaque tentative de connexion (réussie ou non), appeler `resetTurnstile()` pour en obtenir un nouveau.
- Message d'erreur si le jeton manque : `captcha protection: request disallowed (no captcha_token found)`.
- Message d'erreur si le jeton est invalide ou déjà utilisé : `captcha protection: request disallowed (...)`.
- La clé de site `0x4AAAAAAF6SnMcgZRoez52X` est publique ; la clé secrète n'est que dans Supabase.

---

## 5. Problème n°3 — les comptes existants n'ont pas de mot de passe

Jusqu'ici, la connexion se faisait uniquement par **code envoyé par e-mail** ou par Google / Microsoft. Les inscrits à la beta et les comptes créés ainsi **n'ont pas de mot de passe**.

Conséquences pour l'app :

- `signInWithPassword` répond `Invalid login credentials` pour ces comptes (même message qu'un mauvais mot de passe : impossible de les distinguer côté app).
- **Message à prévoir dans l'app** quand cette erreur survient : « Mot de passe incorrect, ou compte sans mot de passe. Si tu t'es inscrit à la beta ou connecté avec un code ou Google, crée ton mot de passe ici : https://thebackpacklab.com/account?mode=password ».

Ce qui existe sur le site :

- **Mon compte** (`https://thebackpacklab.com/account`) : un compte sans mot de passe est **obligé d'en créer un** avant d'accéder à son espace (écran « Crée ton mot de passe »).
- `https://thebackpacklab.com/account?mode=password` ouvre directement l'écran « Crée ton mot de passe » (e-mail → code reçu → nouveau mot de passe). On peut préremplir l'adresse avec `&email=adresse@exemple.com`.
- Un e-mail d'invitation à créer son mot de passe est rédigé (`emails/invitation-mot-de-passe.md`) mais **pas encore envoyé** aux inscrits. À coordonner avec la date de sortie de la version de l'app qui exige le mot de passe.

**Décision à prendre :** garder aussi une connexion par code dans l'app pour la transition, ou imposer le mot de passe dès maintenant ?

---

## 6. Problème n°4 — la double authentification par e-mail n'est pas gérée par l'app

Un utilisateur peut activer, dans Mon compte, une **double authentification par e-mail** : après une connexion par **mot de passe**, un code à 6 chiffres reçu par e-mail doit être saisi. Elle est appliquée **côté base de données** (impossible à contourner) :

- Pour une session ouverte par mot de passe dont le code n'a pas été validé, les lignes `licenses` / `activations` (lecture), `profiles`, `support_tickets`, `module_licenses` sont **invisibles**, et les fonctions `get_my_account`, `claim_license`, `claim_free_license`, `claim_module_license`, `claim_my_beta_key`, `set_my_marketing_consent` lèvent l'exception **`SECOND_FACTOR_REQUIRED`**.
- Les connexions Google / Microsoft et par code e-mail ne sont **pas** concernées.
- Les politiques d'**insertion / mise à jour** de `activations` n'ont **pas** été modifiées (pour ne pas casser l'activation d'appareil), mais la lecture des licences l'est : une app qui ne gère pas la double authentification verra des listes vides ou l'erreur ci-dessus pour ces comptes.

**Pour gérer ce cas dans l'app** (fonctions RPC Supabase, appelables avec le jeton d'accès de l'utilisateur) :

| Appel | Résultat |
|-------|----------|
| `rpc('sec_status')` | `{ "email_2fa": bool, "needs_second_factor": bool, "can_delete": bool }` |
| `rpc('sec_send_login_code')` | `{ "status": "sent" \| "too_soon" \| "limit" \| "not_needed" }` (1 envoi / 30 s, 6 par session) |
| `rpc('sec_verify_login_code', { p_code: "123456" })` | `{ "status": "ok" \| "invalid" \| "expired" \| "locked" \| "none", "left": n }` (5 essais par code, code valable 10 min) |

Séquence conseillée après un `signInWithPassword` réussi :

1. Appeler `sec_status`. Si `needs_second_factor` est `false` → continuer normalement.
2. Sinon : appeler `sec_send_login_code`, afficher un champ « code reçu par e-mail », appeler `sec_verify_login_code`. Sur `ok`, continuer ; sur `invalid` afficher les essais restants ; sur `expired` / `locked` proposer de renvoyer un code.
3. La validation est liée à la **session** (claim `session_id` du JWT) : tant que l'app garde la même session (refresh token), elle n'a pas à redemander le code.

**Si l'app ne gère pas ce cas pour la première version,** il faut au minimum afficher un message clair : « Ce compte utilise la double authentification : connecte-toi à ton espace sur https://thebackpacklab.com/account pour la désactiver, ou utilise la version de l'app qui la prend en charge. » (la désactivation se fait dans Mon compte → Sécurité).

Le code SQL complet est dans `sql/account-security.sql` (dépôt du site), avec un test de non-régression `sql/account-security-test.sql`.

---

## 7. Règles de mot de passe (si l'app propose un jour création ou changement de mot de passe)

Supabase impose : **10 caractères minimum** + au moins une minuscule, une majuscule, un chiffre et un symbole (`! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " \ | < > ? , . / ` ~`).
Erreurs possibles : `weak_password` avec `reasons` = `length` / `characters` / `pwned`. Le site affiche une liste de règles en direct ; l'app devrait faire de même pour éviter des refus inattendus.

Autres réglages actifs : **« Confirm email »** (un compte non confirmé ne peut pas se connecter : erreur `Email not confirmed`), et **« Require current password when updating »**.

---

## 8. Checklist de test côté RushR

- [ ] Page de pont chargée dans la WebView : le widget s'affiche **sans** appel manuel, thème sombre.
- [ ] Après validation, le message `{"type":"token","token":"…"}` arrive bien à l'app (Windows : `chrome.webview.postMessage` ; macOS : `webkit.messageHandlers.webmessage` ; ou `invokeCSharpAction`).
- [ ] `{"type":"expired"}` et `{"type":"error"}` traités ; `resetTurnstile()` appelée après chaque tentative.
- [ ] Connexion réussie avec un compte **qui a un mot de passe** (créer un compte de test sur le site, ou utiliser « Mot de passe oublié ? » sur Mon compte).
- [ ] Message affiché pour un compte **sans mot de passe** (`Invalid login credentials`) avec le lien `account?mode=password`.
- [ ] Message / étape pour un compte avec **double authentification** active (`SECOND_FACTOR_REQUIRED`).
- [ ] Message pour `Email not confirmed` et `captcha protection: request disallowed`.
- [ ] La suite de la connexion (liste des licences, activation d'appareil) fonctionne après connexion.

---

## 9. Liens utiles

| Ressource | Adresse |
|-----------|---------|
| Page de pont Turnstile | `https://thebackpacklab.com/auth/rushr-turnstile.html` (→ 308 → `/auth/rushr-turnstile`) |
| Mon compte | `https://thebackpacklab.com/account` |
| Créer son mot de passe (comptes existants) | `https://thebackpacklab.com/account?mode=password` |
| Contact | `contact@thebackpacklab.com` |

Dites-nous dès que votre test est fait ou si vous préférez une autre adresse pour la page de pont.
