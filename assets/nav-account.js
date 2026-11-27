/* Menu : quand quelqu'un est connecté, son prénom remplace « Mon compte » (lien vers /account).
   - La session est lue dans le stockage du navigateur (aucun appel réseau pour l'afficher).
   - Le nom vient du profil (rempli sur la page Mon compte, gardé en cache sous « bpl_nav_name »),
     sinon du compte Google / Microsoft, sinon du début de l'adresse e-mail.
   - Seuls les liens du menu (barre et menu mobile) changent, pas les liens dans le texte des pages.
   - Déconnecté : rien ne change, le menu affiche « Mon compte ». */
(function () {
  var SESSION_KEY = 'sb-vztqykihtnkscwcodkyf-auth-token';
  var NAME_KEY = 'bpl_nav_name';

  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function session() { var s = read(SESSION_KEY); return s && s.user && s.user.id ? s : null; }

  function fullName(s) {
    var c = read(NAME_KEY);
    if (c && c.uid === s.user.id && c.name) return String(c.name).trim();
    var m = s.user.user_metadata || {};
    return String(m.full_name || m.name || String(s.user.email || '').split('@')[0] || '').trim();
  }

  function apply() {
    var s = session();
    if (!s) return;
    var full = fullName(s);
    var label = full.split(/\s+/)[0];
    if (!label) return;
    var links = document.querySelectorAll('nav a[href="account"], .mobile-menu a[href="account"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      // setLang() réécrit le texte depuis data-fr / data-en : on y met aussi le prénom.
      a.setAttribute('data-fr', label.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
      a.setAttribute('data-en', label.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
      a.textContent = label;
      a.title = full;
      a.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'My account: ' : 'Mon compte : ') + full);
      a.style.maxWidth = '12em';
      a.style.overflow = 'hidden';
      a.style.textOverflow = 'ellipsis';
      a.style.whiteSpace = 'nowrap';
    }
  }

  apply();

  // En arrière-plan, quand la page a son client Supabase : nom du profil à jour (s'il a changé).
  var s = session();
  if (s && window.SB && window.SB.from) {
    window.SB.from('profiles').select('full_name').eq('id', s.user.id).maybeSingle().then(function (r) {
      var n = r && r.data && r.data.full_name && String(r.data.full_name).trim();
      if (!n) return;
      try { localStorage.setItem(NAME_KEY, JSON.stringify({ uid: s.user.id, name: n })); } catch (e) {}
      apply();
    }, function () {});
  }
})();
