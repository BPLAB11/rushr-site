/* Bouton « Soutenir » à pièce qui se retourne (style Buy Me a Coffee).

   UN SEUL ENDROIT À RENSEIGNER : SUPPORT_URL ci-dessous (Buy Me a Coffee, Ko-fi, PayPal.me,
   lien de paiement Stripe…). Tant qu'il est vide, tout ce qui porte l'attribut data-support reste
   caché : aucune page n'affiche un bouton qui ne mène nulle part.

   Balisage d'un bouton (les libellés suivent la langue de la page grâce à data-fr / data-en) :

   <button type="button" class="coin-btn" data-support-btn>
     <span class="coin-wrap" aria-hidden="true"><span class="coin">
       <span class="coin-face coin-front">…tasse…</span><span class="coin-face coin-back">…cœur…</span>
     </span></span>
     <span data-fr="Soutenir Rushr" data-en="Support Rushr">Soutenir Rushr</span>
   </button>

   Un clic lance la pièce (elle se retourne en l'air et retombe sur l'autre face), puis le lien
   s'ouvre dans un nouvel onglet. Avec « réduire les animations », le lien s'ouvre tout de suite. */
(function(){
  var SUPPORT_URL = 'https://donate.stripe.com/5kQ4gB2S94bB4b83CfcbC00';

  // https uniquement, sans caractère pouvant casser un attribut.
  function safeUrl(u){ return /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? u : ''; }
  var url = safeUrl(SUPPORT_URL);

  function openLink(){
    var w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (e) {} }
    else { location.href = url; }   // fenêtre bloquée : on y va dans cet onglet
  }

  function bind(btn){
    var coin = btn.querySelector('.coin');
    var angle = 0, busy = false;
    btn.addEventListener('click', function(){
      if (busy || !url) return;
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still || !coin || !coin.animate) { openLink(); return; }

      busy = true;
      btn.setAttribute('aria-busy', 'true');
      var from = angle, to = angle + 1800 + 180;   // cinq tours et demi : elle retombe sur l'autre face
      angle = to;
      var flip = coin.animate([
        { transform: 'translateY(0) rotateY(' + from + 'deg)' },
        { transform: 'translateY(-18px) rotateY(' + (from + (to - from) * 0.45) + 'deg)', offset: 0.45 },
        { transform: 'translateY(0) rotateY(' + to + 'deg)' }
      ], { duration: 1100, easing: 'cubic-bezier(.3,.7,.35,1)' });
      flip.onfinish = function(){
        coin.style.transform = 'rotateY(' + to + 'deg)';
        busy = false;
        btn.removeAttribute('aria-busy');
        openLink();
      };
    });
  }

  document.querySelectorAll('[data-support]').forEach(function(el){ el.hidden = !url; });
  document.querySelectorAll('[data-support-btn]').forEach(bind);
})();
