/* BACKPACK LAB — consentement aux traceurs (Microsoft Clarity).
   Rien n'est chargé chez Microsoft tant que le visiteur n'a pas accepté.
   Le choix est mémorisé : 13 mois pour un accord, 6 mois pour un refus.
   API : window.BPLConsent.open() rouvre le bandeau, window.BPLConsent.get() renvoie le choix. */
(function () {
  'use strict';

  var CLARITY_ID = 'y7gx8q653a';
  var KEY = 'bpl_consent';
  var DAY = 24 * 60 * 60 * 1000;
  var ACCEPT_MS = 395 * DAY;   // ~13 mois
  var REFUSE_MS = 183 * DAY;   // ~6 mois
  var CLARITY_COOKIES = ['_clck', '_clsk', 'CLID', 'ANONCHK', 'MR', 'MUID', 'SM'];

  var TXT = {
    fr: {
      title: 'Cookies et mesure d’audience',
      body: 'Avec votre accord, nous utilisons Microsoft Clarity pour comprendre comment le site est utilisé (clics, défilement, navigation) et l’améliorer. Rien n’est envoyé à Microsoft sans votre accord, et vous pouvez changer d’avis à tout moment via « Gérer mes cookies » en bas de page.',
      more: 'En savoir plus',
      accept: 'Accepter',
      refuse: 'Refuser'
    },
    en: {
      title: 'Cookies and audience measurement',
      body: 'With your consent, we use Microsoft Clarity to understand how the site is used (clicks, scrolling, navigation) and improve it. Nothing is sent to Microsoft without your consent, and you can change your mind at any time via “Manage my cookies” at the bottom of the page.',
      more: 'Learn more',
      accept: 'Accept',
      refuse: 'Decline'
    }
  };

  function lang() {
    return String(document.documentElement.lang || 'fr').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr';
  }

  /* ---------- choix mémorisé ---------- */
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (o.c !== 'accepted' && o.c !== 'refused') || typeof o.t !== 'number') return null;
      var age = Date.now() - o.t;
      if (age < 0 || age > (o.c === 'accepted' ? ACCEPT_MS : REFUSE_MS)) return null;
      return o.c;
    } catch (e) { return null; }
  }
  function write(choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ c: choice, t: Date.now() })); } catch (e) { /* stockage bloqué : le bandeau reviendra */ }
  }

  /* ---------- Microsoft Clarity ---------- */
  function loadClarity() {
    if (window.__bplClarityLoaded) {
      try { window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }); } catch (e) {}
      return;
    }
    window.__bplClarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    // Publicité refusée par défaut : nous n'en faisons pas. Mesure d'audience accordée par le visiteur.
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  }

  function deleteCookie(name) {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    var expired = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    for (var i = 0; i < domains.length; i++) {
      document.cookie = name + expired + (domains[i] ? '; domain=' + domains[i] : '');
    }
  }
  function stopClarity() {
    // Si Clarity a déjà été chargé dans cette page, on lui demande d'effacer ses cookies et d'arrêter.
    try { if (typeof window.clarity === 'function' && window.__bplClarityLoaded) window.clarity('consent', false); } catch (e) {}
    for (var i = 0; i < CLARITY_COOKIES.length; i++) deleteCookie(CLARITY_COOKIES[i]);
  }

  /* ---------- bandeau ---------- */
  var box = null;

  function injectCss() {
    if (document.getElementById('bpl-consent-css')) return;
    var s = document.createElement('style');
    s.id = 'bpl-consent-css';
    s.textContent =
      '#bpl-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:760px;margin:0 auto;' +
      'background:#141417;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px 20px;' +
      'box-shadow:0 18px 60px rgba(0,0,0,.6);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;font-size:13.5px;line-height:1.55}' +
      '#bpl-consent[hidden]{display:none}' +
      '#bpl-consent .bpl-t{font-weight:800;font-size:15px;margin-bottom:6px}' +
      '#bpl-consent p{color:#B4B4B9;margin:0}' +
      '#bpl-consent a{color:#5FE8A8;text-decoration:underline}' +
      '#bpl-consent .bpl-b{display:flex;gap:10px;margin-top:14px}' +
      '#bpl-consent button{flex:1;min-width:0;border:0;border-radius:10px;padding:12px 16px;font:700 14px Inter,system-ui,sans-serif;cursor:pointer;transition:filter .15s}' +
      '#bpl-consent button:hover{filter:brightness(1.08)}' +
      '#bpl-consent button:focus-visible{outline:2px solid #5FE8A8;outline-offset:2px}' +
      '#bpl-consent .bpl-no{background:#fff;color:#0B0B0B}' +
      '#bpl-consent .bpl-ok{background:#35DC8E;color:#04150C}' +
      '@media(max-width:520px){#bpl-consent{left:10px;right:10px;bottom:10px;padding:16px}#bpl-consent .bpl-b{flex-direction:column}}';
    document.head.appendChild(s);
  }

  function render() {
    if (!box) return;
    var t = TXT[lang()];
    box.querySelector('.bpl-t').textContent = t.title;
    box.querySelector('.bpl-p').firstChild.nodeValue = t.body + ' ';
    box.querySelector('.bpl-more').textContent = t.more;
    box.querySelector('.bpl-ok').textContent = t.accept;
    box.querySelector('.bpl-no').textContent = t.refuse;
  }

  function build() {
    if (box) return;
    injectCss();
    box = document.createElement('div');
    box.id = 'bpl-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'false');
    box.setAttribute('aria-labelledby', 'bpl-consent-t');
    box.hidden = true;
    box.innerHTML =
      '<div class="bpl-t" id="bpl-consent-t"></div>' +
      '<p class="bpl-p">x <a class="bpl-more" href="/privacy#cookies"></a></p>' +
      '<div class="bpl-b"><button type="button" class="bpl-no"></button><button type="button" class="bpl-ok"></button></div>';
    box.querySelector('.bpl-ok').addEventListener('click', function () { choose('accepted'); });
    box.querySelector('.bpl-no').addEventListener('click', function () { choose('refused'); });
    document.body.appendChild(box);
    render();
  }

  function choose(choice) {
    write(choice);
    if (box) box.hidden = true;
    if (choice === 'accepted') loadClarity(); else stopClarity();
  }

  function open(focus) {
    build();
    render();
    box.hidden = false;
    if (focus) { var b = box.querySelector('.bpl-no'); if (b) b.focus(); }
  }

  window.BPLConsent = {
    open: function () { open(true); },
    get: read
  };

  /* ---------- démarrage ---------- */
  function init() {
    var c = read();
    if (c === 'accepted') loadClarity();
    else if (c === 'refused') stopClarity();
    else open(false);
    // la langue de la page peut changer après le chargement (bouton FR/EN)
    try {
      new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
