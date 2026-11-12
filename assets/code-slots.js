/* Saisie des codes de vérification en cases.
   Transforme automatiquement les champs  input.input-otp  (et  input[data-code-slots]) en 6 cases :
   les chiffres tombent dans leur case, le collage et la saisie automatique (SMS / e-mail) sont gérés, et un code
   refusé fait couler les chiffres. Le vrai champ <input> reste dans la page, invisible : le reste du code
   (lecture de .value, envoi du formulaire, messages d'erreur via la classe « invalid ») n'a rien à changer.
   Nombre de cases : attribut data-slots (6 par défaut).
   Inspiré du composant CodeSlots de React Bits, réécrit sans React. */
(function () {
  'use strict';

  var DEFAULT_SLOTS = 6;
  var CASCADE_MS = 20;      // décalage entre deux cases quand plusieurs chiffres arrivent d'un coup (collage)
  var SINK_MS = 300;        // durée de la descente d'un chiffre refusé
  var valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function digitsOf(raw) { return String(raw == null ? '' : raw).replace(/\D/g, ''); }

  function enhance(input) {
    if (input.__codeSlots || input.type === 'hidden') return;
    var n = parseInt(input.getAttribute('data-slots'), 10) || DEFAULT_SLOTS;

    var wrap = document.createElement('div');
    wrap.className = 'code-slots';
    var row = document.createElement('div');
    row.className = 'code-slots__row';
    row.setAttribute('data-status', 'idle');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(row);
    row.appendChild(input);

    input.__codeSlots = true;
    input.classList.add('code-slots__input');
    input.maxLength = n;
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('pattern', '[0-9]*');
    if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'one-time-code');

    var slots = [], digits = [], fills = [];
    for (var i = 0; i < n; i++) {
      var slot = document.createElement('span');
      slot.className = 'code-slots__slot';
      slot.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span'); fill.className = 'code-slots__fill';
      var digit = document.createElement('span'); digit.className = 'code-slots__digit';
      slot.appendChild(fill); slot.appendChild(digit);
      row.appendChild(slot);
      slots.push(slot); digits.push(digit); fills.push(fill);
    }

    var shown = [];                 // chiffre affiché dans chaque case
    var sinkTimer = null;

    function current() { return digitsOf(valueDesc.get.call(input)).slice(0, n); }
    function setRaw(v) { valueDesc.set.call(input, v); }

    function render() {
      var d = current(), landing = 0, active = Math.min(d.length, n - 1);
      for (var i = 0; i < n; i++) {
        var ch = d.charAt(i), had = !!shown[i], delay = 0;
        if (ch && !had) { delay = landing * CASCADE_MS; landing++; }
        slots[i].style.transitionDelay = delay ? delay + 'ms' : '';
        fills[i].style.transitionDelay = delay ? delay + 'ms' : '';
        digits[i].style.transitionDelay = delay ? delay + 'ms' : '';
        if (ch) digits[i].textContent = ch;                 // le chiffre reste affiché pendant qu'il s'efface
        if (ch) slots[i].setAttribute('data-filled', ''); else slots[i].removeAttribute('data-filled');
        slots[i].removeAttribute('data-sink');
        if (i === active) slots[i].setAttribute('data-active', ''); else slots[i].removeAttribute('data-active');
        shown[i] = ch;
      }
    }

    function setStatus(s) { row.setAttribute('data-status', s); }

    // Une valeur écrite par le code de la page (input.value = '123456' ou '') met aussi les cases à jour.
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () { return valueDesc.get.call(input); },
      set: function (v) { clearTimeout(sinkTimer); setRaw(digitsOf(v).slice(0, n)); render(); }
    });

    function toEnd() { try { var l = input.value.length; input.setSelectionRange(l, l); } catch (e) {} }

    input.addEventListener('input', function () {
      clearTimeout(sinkTimer);
      var d = digitsOf(valueDesc.get.call(input)).slice(0, n);
      if (d !== valueDesc.get.call(input)) setRaw(d);
      if (row.getAttribute('data-status') === 'error') { setStatus('idle'); input.classList.remove('invalid'); }
      render(); toEnd();
    });
    // « 123 456 » collé : le navigateur couperait avant de filtrer, on prend donc les chiffres nous-mêmes
    input.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData);
      if (!text) return;
      e.preventDefault();
      var d = digitsOf(text.getData('text')).slice(0, n);
      if (!d) return;
      setRaw(d);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('focus', function () { render(); setTimeout(toEnd, 0); });
    input.addEventListener('click', toEnd);
    input.addEventListener('select', toEnd);

    // Code refusé (la page ajoute la classe « invalid ») : rouge, puis les chiffres coulent en cascade, puis le champ se vide.
    function sink() {
      var d = current();
      setStatus('error');
      if (!d) return;
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (var i = d.length - 1, k = 0; i >= 0; i--, k++) {
        slots[i].style.transitionDelay = reduce ? '' : (k * CASCADE_MS) + 'ms';
        fills[i].style.transitionDelay = digits[i].style.transitionDelay = slots[i].style.transitionDelay;
        slots[i].setAttribute('data-sink', '');
      }
      clearTimeout(sinkTimer);
      sinkTimer = setTimeout(function () {
        setRaw(''); render(); setStatus('error');
        if (document.activeElement === input) toEnd();
      }, reduce ? 150 : (d.length - 1) * CASCADE_MS + SINK_MS);
    }
    new MutationObserver(function () {
      if (input.classList.contains('invalid')) { if (row.getAttribute('data-status') !== 'error') sink(); }
      else if (row.getAttribute('data-status') === 'error') setStatus('idle');
    }).observe(input, { attributes: true, attributeFilter: ['class'] });

    render();
  }

  function scan() {
    var list = document.querySelectorAll('input.input-otp, input[data-code-slots]');
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  function start() {
    scan();
    // les fenêtres de l'espace compte sont créées après le chargement de la page
    if (window.MutationObserver) new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
