/* Page Rushr : deux moments animés au scroll (GSAP + ScrollTrigger, assets/vendor).
   1. Hero : la capture de l'app part inclinée en 3D et se redresse en scrollant, avec un reflet qui la balaie.
   2. « Du chaos au montage » : la section est épinglée et rejoue le vrai flux de Rushr, avec ses vrais écrans
      (Views/StructureBuilderView, RushManagerView, ReviewStructureView de l'app) et ses vrais raccourcis :
        1. Création du projet : préréglage MUSIC VIDEO, arborescence, « Créer le projet ».
        2. Ctrl+I : import du dossier CAM_A, vignettes générées, compteurs du pied de liste.
        3. Touches 1-9 : chaque clip reçoit la catégorie n (ordre des dossiers de RUSHES) ; Suppr = REJECT.
        4. Clic sur « Préparer » : chaque clip part dans RUSHES/<catégorie> ou REJECTS, puis l'explorateur de fichiers
           montre le dossier du projet créé sur le disque.
      Les libellés sont ceux de l'app (Services/LocalizationFrench.cs) en français, ou l'anglais d'origine.
   Si « réduire les animations » est activé : pas d'épinglage, l'état final s'affiche directement.
   Sans JS (ou si GSAP ne charge pas) : la liste des 4 étapes reste lisible, la scène est masquée. */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ 1. Hero */
  var mock = document.querySelector('.mock');
  if (mock && !reduce) {
    mock.classList.add('gs');
    gsap.fromTo(mock,
      { rotateX: 24, scale: 0.9, y: 30, transformPerspective: 1400, transformOrigin: '50% 0%' },
      { rotateX: 0, scale: 1, y: 0, ease: 'none',
        scrollTrigger: { start: 0, end: '+=520', scrub: 0.6 } });
    // Le reflet n'est pas lié à la position du scroll (il s'arrêtait au milieu si on s'arrêtait de scroller) :
    // il traverse toute la capture d'un coup dès qu'on commence à scroller, et se réarme en revenant en haut.
    var shine = mock.querySelector('.mock-shine');
    if (shine) {
      // x: 0 obligatoire : GSAP lit le translateX(-110%) du CSS comme un décalage en pixels et l'ajoutait
      // à xPercent, si bien que le reflet finissait au milieu de la capture.
      var sweep = gsap.fromTo(shine, { x: 0, xPercent: -110 }, { x: 0, xPercent: 110, duration: 1.3, ease: 'power2.inOut', paused: true });
      ScrollTrigger.create({ start: 40, onEnter: function () { sweep.restart(); }, onLeaveBack: function () { sweep.pause(0); } });
    }
  }

  /* ------------------------------------------------------------------ 2. Le flux */
  var story = document.getElementById('story');
  var stage = document.getElementById('storyStage');
  if (!story || !stage) return;
  story.classList.add('story-js');

  function en() { return document.documentElement.lang === 'en'; }
  function tr(fr, eng) { return en() ? eng : fr; }
  // Libellé statique : setLang() (rushr.html) le bascule tout seul grâce à data-fr / data-en.
  function L(fr, eng) { return '<span data-fr="' + fr + '" data-en="' + eng + '">' + tr(fr, eng) + '</span>'; }
  var UI = 'assets/rushr-ui/';

  // Catégories = sous-dossiers de RUSHES du préréglage MUSIC VIDEO, dans l'ordre des touches 1-9.
  // BROLL et DRONE ont leur couleur fixe dans l'app (GetCategoryHex) ; les autres viennent de sa palette.
  var CATS = [
    { name: 'BEHIND_THE_SCENES', color: '#22C7E0' },
    { name: 'BROLL', color: '#8BE05A' },
    { name: 'DRONE', color: '#2D9CFF' },
    { name: 'PERFORMANCE', color: '#FF5ACD' },
    { name: 'VFX_PLATES', color: '#FFB02E' }
  ];
  var REJECT = { name: 'REJECT', color: '#FF3B3B' };
  // Les 12 rushes du dossier CAM_A (vignettes : images du clip de la page d'accueil, assets/rush-thumbs.webp).
  var CLIPS = [
    ['C0012.MP4', '2,4 Go', '2.4 GB', 3], ['C0013.MP4', '1,1 Go', '1.1 GB', 1], ['C0014.MP4', '3,2 Go', '3.2 GB', 3],
    ['C0017.MP4', '870 Mo', '870 MB', 4], ['C0018.MP4', '412 Mo', '412 MB', -1], ['C0021.MP4', '2,8 Go', '2.8 GB', 3],
    ['C0022.MP4', '1,6 Go', '1.6 GB', 1], ['C0025.MP4', '1,9 Go', '1.9 GB', 1], ['C0026.MP4', '2,2 Go', '2.2 GB', 3],
    ['C0027.MP4', '96 Mo', '96 MB', -1], ['C0029.MP4', '1,3 Go', '1.3 GB', 4], ['C0031.MP4', '2,7 Go', '2.7 GB', 3]
  ];
  var N = CLIPS.length;
  function catOf(i) { return CLIPS[i][3] < 0 ? REJECT : CATS[CLIPS[i][3]]; }
  function thumbPos(i) { return '0 ' + (i * 100 / (N - 1)) + '%'; }

  /* ---------------------------------------------------------------- la fenêtre Rushr */
  // Comme dans l'app : dossier ouvert s'il a des enfants dépliés, fermé sinon (y compris pour les fichiers).
  function node(depth, name, open, cls) {
    return '<div class="rw-node ' + (cls || '') + '" style="padding-left:' + (depth * 22) + 'px"><img src="' + UI +
      (open ? 'folder-open.webp' : 'folder-close.webp') + '" alt="">' + name + '</div>';
  }
  var tree = [
    [0, 'CLIP_NOVA', 1, 'root'], [1, 'RUSHES', 1], [2, 'PERFORMANCE'], [2, 'BROLL'], [2, 'DRONE'], [2, 'VFX_PLATES'],
    [2, 'BEHIND_THE_SCENES'], [1, 'REJECTS'], [1, 'AUDIO'], [1, 'EXPORT'], [1, 'PROJECT_FILES'], [1, 'ASSETS']
  ];
  var treeHtml = tree.map(function (n) { return node(n[0], n[1], n[2], n[3]); }).join('');

  var cardsHtml = CLIPS.map(function (c, i) {
    return '<div class="rw-rush"><b class="sel"></b><div class="rw-thumb"><div class="rw-dots"><b></b><b></b><b></b></div>' +
      '<i style="background-position:' + thumbPos(i) + '"></i></div><div class="rw-name">' + c[0] + '</div>' +
      '<div class="rw-size" data-fr="' + c[1] + '" data-en="' + c[2] + '">' + tr(c[1], c[2]) + '</div>' +
      '<div class="rw-tag" style="background:' + catOf(i).color + '">' + catOf(i).name + '</div></div>';
  }).join('');

  function chip(c) {
    return '<span class="rw-chip" style="color:' + c.color + ';border-color:' + c.color + '99;background:' + c.color + '26">' + c.name + '</span>';
  }

    // Explorateur de fichiers : le dossier du projet tel que Rushr l'a créé sur le disque (icônes dessinées ici).
  var FOLDER = '<svg viewBox="0 0 84 68"><path d="M4 10a4 4 0 0 1 4-4h21l7 7h40a4 4 0 0 1 4 4v4H4z" fill="#C9961A"/><rect x="4" y="19" width="76" height="45" rx="4" fill="#F2C443"/></svg>';
  var MINI = '<svg class="rw-mini" viewBox="0 0 16 13"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1H6l1.5 1.5h6A1.5 1.5 0 0 1 15 4v1H1z" fill="#C9961A"/><rect x="1" y="4" width="14" height="8.5" rx="1.2" fill="#F2C443"/></svg>';
  var TOP = ['ASSETS', 'AUDIO', 'EXPORT', 'PROJECT_FILES', 'REJECTS', 'RUSHES'];
  var SUB = CATS.map(function (c) { return c.name; });
  function items(list, id) {
    return '<div class="grid" id="' + id + '">' + list.map(function (n) { return '<div class="it" data-n="' + n + '">' + FOLDER + '<span>' + n + '</span></div>'; }).join('') + '</div>';
  }
  function side(depth, name, open, id) {
    return '<div' + (id ? ' id="' + id + '"' : '') + ' style="padding-left:' + (6 + depth * 14) + 'px"><i>' + (open ? '⌄' : '›') + '</i>' + MINI + name + '</div>';
  }
  var sideHtml = side(0, L('Ce PC', 'This PC'), 1) + side(1, 'Data (D:)', 1) + side(2, 'PROJETS', 1) + side(3, 'CLIP_NOVA', 1, 'exSideRoot') +
    TOP.map(function (n) { return n === 'RUSHES' ? side(4, n, 1, 'exSideRushes') : side(4, n, 0); }).join('') +
    SUB.map(function (n) { return side(5, n, 0); }).join('');

  stage.innerHTML =
    '<div class="rw">' +
      '<aside class="rw-rail">' +
        '<div class="rw-logo"><img src="' + UI + 'rushr_logo_rail_bar.webp" alt=""><img src="' + UI + 'rushr_logo_rail_ltng.webp" alt=""><img src="' + UI + 'rushr_logo_rail_r.webp" alt=""></div>' +
        '<div class="rw-ver">1.0.19-beta</div>' +
        '<div class="rw-nav"><span class="rw-navbtn" data-nav="sb"><img src="' + UI + 'home.webp" alt=""></span>' +
        '<span class="rw-navbtn" data-nav="rm"><img src="' + UI + 'rmanager.webp" alt=""></span></div>' +
        '<span class="rw-navbtn set"><img src="' + UI + 'setting.webp" alt=""></span>' +
      '</aside>' +
      '<div class="rw-main">' +
        /* Création du projet (StructureBuilderView) */
        '<div class="rw-page rw-sb">' +
          '<div class="rw-panel">' +
            '<div class="rw-h1">' + L('Création du projet', 'Structure Builder') + '</div>' +
            '<div class="rw-sub">' + L('Renseignez le nom, le client, le préréglage et la destination.', 'Enter the project name, client, preset, and destination.') + '</div>' +
            '<div class="rw-label" style="margin-top:28px">' + L('NOM DU PROJET', 'PROJECT NAME') + '</div><div class="rw-field">CLIP_NOVA</div>' +
            '<div class="rw-label">CLIENT</div><div class="rw-field">NOVA RECORDS</div>' +
            '<div class="rw-label">' + L('PRÉRÉGLAGE', 'PRESET') + '</div><div class="rw-field">MUSIC VIDEO<span class="dd">▾</span></div>' +
            '<div class="rw-label">DESTINATION</div><div style="display:flex;gap:8px"><div class="rw-field" style="flex:1">D:\\PROJETS</div><span class="rw-btn shape" style="height:40px;color:#A0A0A6">' + L('Parcourir', 'Browse') + '</span></div>' +
            '<div class="rw-slot">' +
              '<span class="rw-btn primary" id="rwCreate">' + L('Créer le projet', 'Create project') + '</span>' +
              '<span class="rw-ok" id="rwOk">' + L('✓ CLIP_NOVA créé avec succès', '✓ CLIP_NOVA created successfully') + '</span>' +
              '<span class="rw-btn primary" id="rwContinue" style="opacity:0">' + L('Continuer vers le gestionnaire de rushes →', 'Continue to Rush Manager →') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="rw-panel" style="padding:30px">' +
            '<div class="rw-h1">' + L('Création de la structure', 'Project structure preview') + '</div>' +
            '<div class="rw-sub">' + L("Ajoutez, renommez ou supprimez des dossiers dans l'arborescence.", 'Add, rename, or remove folders in the tree.') + '</div>' +
            '<div class="rw-card rw-tree"><div id="rwTree">' + treeHtml + '</div>' +
              '<div style="display:flex;gap:12px;margin-top:18px"><span class="rw-btn primary" style="width:140px;height:40px">' + L('+ Dossier', '+ Folder') + '</span>' +
              '<span class="rw-btn danger" style="width:140px;height:40px">' + L('Supprimer', 'Delete') + '</span></div></div>' +
          '</div>' +
        '</div>' +
        /* Gestionnaire de rushes (RushManagerView) */
        '<div class="rw-page rw-rm">' +
          '<div class="rw-rm-head">' +
            '<div class="rw-h1">' + L('Gestionnaire de rushes', 'Rush Manager') + '</div>' +
            '<div class="rw-sub">' + L('Importez, prévisualisez et triez vos rushes rapidement.', 'Import, preview and sort your rushes quickly.') + '</div>' +
            '<div class="rw-tools">' +
              '<span class="rw-btn primary" id="rwImport" style="width:160px">' + L('Importer un dossier', 'Import folder') + '</span>' +
              '<span class="rw-btn shape" style="width:90px;height:34px;font-weight:700;font-size:13px;background:transparent;border:0">' + L('Effacer', 'Clear') + '</span>' +
              '<span class="rw-icbtn"><img src="' + UI + 'save.webp" alt=""></span><span class="rw-icbtn"><img src="' + UI + 'save-as.webp" alt=""></span>' +
              '<span class="rw-icbtn" id="rwReviewBtn"><img src="' + UI + 'folder-open.webp" alt=""></span>' +
              '<span class="rw-status" id="rwStatus"></span>' +
              '<span class="rw-proj"><small>' + L('PROJET EN COURS', 'CURRENT PROJECT') + '</small><b>CLIP_NOVA</b></span>' +
            '</div>' +
            '<div class="rw-prog" id="rwProg"><i></i></div>' +
          '</div>' +
          '<div class="rw-panel rw-left">' +
            '<div class="rw-top"><span class="rw-seg"><span class="on"><img src="' + UI + 'grid.webp" alt=""></span><span><img src="' + UI + 'list.webp" alt=""></span></span>' +
              '<span class="rw-filter">' + L('Filtre :', 'Filter:') + '</span><span class="rw-combo">' + L('Tous', 'All') + '</span>' +
              '<span class="rw-search"><b>⌕</b>' + L('Rechercher des rushes…', 'Search rushes...') + '</span></div>' +
            '<div class="rw-cards"><div class="rw-group" id="rwGroup"><img src="' + UI + 'folder.webp" alt=""><b>CAM_A</b><span id="rwGroupCount">· 0 clips</span><em>' + L('supprimer', 'delete') + '</em></div>' +
              '<div class="rw-grid">' + cardsHtml + '</div></div>' +
            '<div class="rw-foot"><div class="row"><span class="rw-c-imp" id="rwImp"></span><span class="rw-c-tag" id="rwTag"></span><span class="rw-c-rej" id="rwRej"></span><span class="rw-c-rem" id="rwRem"></span></div>' +
              '<div class="row2"><span id="rwFiles"></span><span id="rwSize"></span></div></div>' +
          '</div>' +
          '<div class="rw-right">' +
            '<div class="rw-card"><div class="rw-ct">' + L('Aperçu', 'Preview') + '</div><div class="rw-prev"><i id="rwPrev"></i></div>' +
              '<div class="rw-seek"><span id="rwT0">00:00</span><span class="tr"><i id="rwSeek"></i></span><span id="rwT1">00:00</span></div>' +
              '<div class="rw-ctrl"><img src="' + UI + 'previous.webp" alt=""><img src="' + UI + 'play.webp" alt=""><img src="' + UI + 'next.webp" alt="">' +
              '<span class="vol"><img src="' + UI + 'volume-mid.webp" alt=""><span></span></span></div></div>' +
            '<div class="rw-card"><div class="rw-ct">' + L('Catégories', 'Categories') + '</div>' +
              '<div class="rw-catin"><span class="rw-field">' + L('Nouvelle catégorie…', 'New category...') + '</span><span class="rw-btn primary">' + L('Ajouter', 'Add') + '</span></div>' +
              '<div class="rw-chips" id="rwChips">' + CATS.map(chip).join('') + chip(REJECT) + '</div></div>' +
            '<div class="rw-card"><div class="rw-ct">' + L('Infos vidéo', 'Video info') + '</div><div class="rw-info" id="rwInfo"></div></div>' +
            '<div class="rw-card"><div class="rw-act"><span class="rw-btn primary" id="rwPrepare">' + L('Préparer', 'Prepare') + '</span><span class="xml">' + L('Exporter XML', 'Export XML') + '</span></div></div>' +
          '</div>' +
          /* Explorateur de fichiers ouvert sur le projet, après Préparer */
          '<div class="rw-ex" id="rwEx">' +
            '<div class="tb"><div class="tab">' + MINI + '<span id="exTab">CLIP_NOVA</span><span style="margin-left:auto;color:#999">✕</span></div><span style="padding:0 12px 8px;color:#bbb">+</span>' +
              '<div class="win"><span>—</span><span>☐</span><span>✕</span></div></div>' +
            '<div class="nav"><span class="arr">←→↑⟳</span><div class="addr">' + MINI + '<span id="exAddr"></span></div><div class="srch">' + L('Rechercher', 'Search') + '</div></div>' +
            '<div class="body"><div class="side">' + sideHtml + '</div><div class="pane">' + items(TOP, 'exA') + items(SUB, 'exB') + '</div></div>' +
            '<div class="st" id="exSt"></div>' +
          '</div>' +
        '</div>' +
        '<svg class="rw-cursor" id="rwCursor" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.9L4 20z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>' +
      '</div>' +
    '</div>' +
    '<div class="st-hud" id="stHud"></div>';

  var $ = function (id) { return document.getElementById(id); };
  var rw = stage.querySelector('.rw'), main = stage.querySelector('.rw-main');
  var pageSB = stage.querySelector('.rw-sb'), pageRM = stage.querySelector('.rw-rm');
  var navs = stage.querySelectorAll('.rw-navbtn[data-nav]');
  var rushes = Array.prototype.slice.call(stage.querySelectorAll('.rw-rush'));
  var thumbs = rushes.map(function (r) { return r.querySelector('.rw-thumb i'); });
  var tags = rushes.map(function (r) { return r.querySelector('.rw-tag'); });
  var sels = rushes.map(function (r) { return r.querySelector('.sel'); });
  var chips = Array.prototype.slice.call(stage.querySelectorAll('.rw-chip'));
  var nodes = Array.prototype.slice.call($('rwTree').children);
  var exA = Array.prototype.slice.call($('exA').children), exB = Array.prototype.slice.call($('exB').children);
  var exRushes = $('exA').querySelector('[data-n="RUSHES"]');
  var hud = $('stHud'), cursor = $('rwCursor');

  // Mise à l'échelle : la fenêtre est dessinée en 1440 x 860, comme l'app agrandie (4 cartes de rush par ligne).
  var scale = 1;
  function fit() { scale = stage.clientWidth / 1440; rw.style.transform = 'scale(' + scale + ')'; }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);

  // Centre d'un élément, en pixels de la zone principale où vit le curseur (.rw-main). Calculé sur la mise en page (offsetLeft/Top),
  // pas sur getBoundingClientRect : les pages animées (glissement, échelle) ne décalent donc pas la cible.
  // La pointe du curseur est en (4, 2) dans son dessin : on la pose pile au centre de l'élément.
  function at(el) {
    var x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x - 4, y: y - 2 };
  }

  /* ---------------------------------------------------------------- calendrier (4 unités = 4 étapes) */
  var T_TAG0 = 2.05, T_TAGSTEP = 0.07;
  function tagAt(i) { return T_TAG0 + i * T_TAGSTEP; }
  function cardAt(i) { return 1.22 + i * 0.045; }

  var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  tl.set(cursor, { x: 980, y: 720 }, 0);

  // Étape 1 : l'arborescence du préréglage se dessine, puis « Créer le projet ».
  tl.fromTo(nodes, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.08, stagger: 0.028 }, 0.06);
  tl.to(cursor, { x: function () { return at($('rwCreate')).x; }, y: function () { return at($('rwCreate')).y; }, duration: 0.16, ease: 'power2.inOut' }, 0.42);
  tl.to('#rwCreate', { scale: 0.98, duration: 0.02, yoyo: true, repeat: 1 }, 0.6);
  tl.to('#rwCreate', { opacity: 0, duration: 0.04 }, 0.64);
  tl.to('#rwOk', { opacity: 1, duration: 0.05 }, 0.66);
  tl.to('#rwOk', { opacity: 0, duration: 0.04 }, 0.76);
  tl.to('#rwContinue', { opacity: 1, duration: 0.05 }, 0.78);
  tl.to(cursor, { x: function () { return at($('rwContinue')).x; }, y: function () { return at($('rwContinue')).y; }, duration: 0.06 }, 0.78);
  tl.to('#rwContinue', { scale: 0.98, duration: 0.02, yoyo: true, repeat: 1 }, 0.86);
  // Passage au gestionnaire de rushes.
  tl.fromTo(pageSB, { opacity: 1 }, { opacity: 0, duration: 0.08, immediateRender: false }, 0.9);
  tl.fromTo(pageRM, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.1 }, 0.94);
  tl.to(cursor, { x: 760, y: 560, opacity: 0, duration: 0.1 }, 0.92);

  // Étape 2 : Ctrl+I, import du dossier CAM_A.
  tl.to('#rwImport', { scale: 0.98, duration: 0.02, yoyo: true, repeat: 1 }, 1.12);
  tl.fromTo('#rwProg', { opacity: 0 }, { opacity: 1, duration: 0.03, immediateRender: false }, 1.16);
  tl.fromTo('#rwProg i', { scaleX: 0 }, { scaleX: 1, duration: 0.62, ease: 'none', immediateRender: false }, 1.18);
  tl.to('#rwProg', { opacity: 0, duration: 0.05 }, 1.9);
  tl.fromTo('#rwGroup', { opacity: 0 }, { opacity: 1, duration: 0.05, immediateRender: false }, 1.2);
  rushes.forEach(function (r, i) {
    tl.fromTo(r, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.06, immediateRender: false }, cardAt(i));
    tl.fromTo(thumbs[i], { opacity: 0 }, { opacity: 1, duration: 0.05, immediateRender: false }, cardAt(i) + 0.08);
  });

  // Étape 3 : chaque clip est sélectionné, prévisualisé et tagué au clavier.
  rushes.forEach(function (r, i) {
    var t = tagAt(i), c = CLIPS[i][3];
    tl.fromTo(tags[i], { scale: 0 }, { scale: 1, duration: 0.04, ease: 'back.out(2.5)', immediateRender: false }, t + 0.035);
    var ch = chips[c < 0 ? CATS.length : c];
    tl.fromTo(ch, { scale: 1 }, { scale: 1.08, duration: 0.02, yoyo: true, repeat: 1, immediateRender: false }, t + 0.02);
  });

  // Étape 4 : clic sur « Préparer », puis l'explorateur montre le dossier du projet sur le disque.
  tl.fromTo(cursor, { opacity: 0 }, { opacity: 1, duration: 0.03, immediateRender: false }, 3.0);
  tl.to(cursor, { x: function () { return at($('rwPrepare')).x; }, y: function () { return at($('rwPrepare')).y; }, duration: 0.1, ease: 'power2.inOut' }, 3.0);
  tl.to('#rwPrepare', { scale: 0.98, duration: 0.02, yoyo: true, repeat: 1 }, 3.12);
  tl.fromTo('#rwEx', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.06, immediateRender: false }, 3.58);
  tl.fromTo(exA, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.04, stagger: 0.016, immediateRender: false }, 3.62);
  tl.to(cursor, { x: function () { return at(exRushes).x; }, y: function () { return at(exRushes).y; }, duration: 0.08, ease: 'power2.inOut' }, 3.7);
  tl.to(exRushes, { scale: 0.96, duration: 0.01, yoyo: true, repeat: 3 }, 3.81);
  tl.to(exA, { opacity: 0, duration: 0.02 }, 3.85);
  tl.fromTo(exB, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.04, stagger: 0.016, immediateRender: false }, 3.86);
  tl.set({}, {}, 4.0);

  /* ---------------------------------------------------------------- textes, compteurs, sélection : calculés depuis le temps */
  var KEY_LABEL = function (i) { var c = CLIPS[i][3]; return c < 0 ? tr('Suppr', 'Delete') : String(c + 1); };
  function hudHtml(keys, label, color) {
    return keys.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join('<span class="plus">+</span>') +
      '<span class="lab" style="--c:' + (color || '#FF6A00') + '">' + label + '</span>';
  }
  function ramp(t, a, b) { return t < a || t > b ? 0 : Math.min(1, (t - a) / 0.03, (b - t) / 0.03); }
  function fmtSpeed(t) { return Math.round(380 + 60 * Math.sin(t * 37) + 25 * Math.sin(t * 91)); }
  var GB = [2.4, 1.1, 3.2, 0.87, 0.412, 2.8, 1.6, 1.9, 2.2, 0.096, 1.3, 2.7];
  var DUR = ['00:42', '01:08', '00:57', '00:12', '00:03', '01:21', '00:36', '00:49', '01:02', '00:01', '00:18', '01:15'];
  var lastHud = '';

  function sync() {
    var t = tl.time();
    var imported = t < cardAt(0) ? 0 : Math.min(N, Math.floor((t - cardAt(0)) / 0.045) + 1);
    var tagged = 0, rejected = 0, sel = -1;
    for (var i = 0; i < N; i++) {
      if (t >= tagAt(i)) sel = i;
      if (t >= tagAt(i) + 0.035) { if (CLIPS[i][3] < 0) rejected++; else tagged++; }
    }
    if (t >= 3.0) sel = -1;

    // rail : l'accueil (création du projet), puis le gestionnaire de rushes
    navs[0].classList.toggle('on', t < 0.94);
    navs[1].classList.toggle('on', t >= 0.94);

    // barre de statut
    var st;
    if (t < 1.16) st = tr("Aucun dossier importé pour l'instant.", 'No folder imported yet.');
    else if (t < 1.8) st = tr('Importation des rushes… ', 'Importing rushes... ') + imported + '/' + N + ' (' + (14 + (imported * 7) % 9) + (en() ? '.' : ',') + (imported * 3) % 10 + ' ' + tr('fichiers/s', 'files/s') + ')';
    else if (t < T_TAG0) st = tr(N + ' fichiers vidéo importés.', N + ' video files imported.');
    else if (t < 3.14) {
      var k = sel < 0 ? N - 1 : sel, c = catOf(k);
      st = c === REJECT ? tr('Marqué REJECT : ', 'Marked as REJECT: ') + CLIPS[k][0] : tr('Étiqueté : ', 'Tagged: ') + CLIPS[k][0] + ' → ' + c.name;
    } else if (t < 3.55) {
      var done = Math.min(N, Math.floor((t - 3.14) / 0.033));
      st = tr('Préparation… ', 'Preparing... ') + done + '/' + N + ' (' + fmtSpeed(t) + ' ' + tr('Mo', 'MB') + '/s)';
    } else st = tr('Préparé : ' + N + ' fichiers.', 'Prepared: ' + N + ' files.');
    $('rwStatus').textContent = st;

    // pied de liste et en-tête du dossier
    var size = 0; for (var j = 0; j < imported; j++) size += GB[j];
    $('rwImp').textContent = tr('Importés : ', 'Imported : ') + imported;
    $('rwTag').textContent = tr('Étiquetés : ', 'Tagged : ') + tagged;
    $('rwRej').textContent = tr('Rejetés : ', 'Rejected : ') + rejected;
    $('rwRem').textContent = tr('Restants : ', 'Remaining : ') + (imported - tagged - rejected);
    $('rwFiles').textContent = imported + ' ' + tr('fichiers', 'files');
    $('rwSize').textContent = tr('Taille totale : ', 'Total size: ') + (imported ? (size.toFixed(1).replace('.', en() ? '.' : ',') + ' ' + tr('Go', 'GB')) : '0 ' + tr('Mo', 'MB'));
    $('rwGroupCount').textContent = '· ' + imported + ' clips';

    // sélection, aperçu, infos vidéo
    sels.forEach(function (s, i) { s.style.opacity = i === sel ? 1 : 0; });
    var p = $('rwPrev');
    if (sel >= 0) {
      p.style.opacity = 1; p.style.backgroundPosition = thumbPos(sel);
      var f = Math.min(1, (t - tagAt(sel)) / T_TAGSTEP);
      $('rwSeek').style.width = (f * 55) + '%';
      $('rwT1').textContent = DUR[sel];
      $('rwInfo').innerHTML = '<span class="imp">' + tr('Dossier importé : ', 'Import folder: ') + 'CAM_A</span>' +
        '<span>' + tr('Résolution : ', 'Resolution: ') + '3840x2160</span><span>Format : MP4</span>' +
        '<span>' + tr('Durée : ', 'Duration: ') + DUR[sel] + '</span><span>Codec : H.265</span>' +
        '<span>' + tr('Taille : ', 'Size: ') + tr(CLIPS[sel][1], CLIPS[sel][2]) + '</span><span>' + tr('IPS : ', 'FPS: ') + '25</span>';
    } else {
      p.style.opacity = 0; $('rwSeek').style.width = '0'; $('rwT1').textContent = '00:00';
      $('rwInfo').innerHTML = '<span class="imp">' + tr('Dossier importé : ', 'Import folder: ') + (imported ? 'CAM_A' : '-') + '</span>' +
        '<span>' + tr('Résolution : -', 'Resolution: -') + '</span><span>Format : -</span><span>' + tr('Durée : -', 'Duration: -') + '</span>' +
        '<span>Codec : -</span><span>' + tr('Taille : -', 'Size: -') + '</span><span>' + tr('IPS : -', 'FPS: -') + '</span>';
    }

    // touches pressées
    var h = '', o = 0;
    if (t >= 1.06 && t <= 1.36) { h = hudHtml(['Ctrl', 'I'], tr('Importer un dossier', 'Import folder')); o = ramp(t, 1.06, 1.36); }
    else if (t >= 1.98 && t <= 2.95) {
      var kk = sel < 0 ? 0 : sel, cc = catOf(kk);
      h = hudHtml([KEY_LABEL(kk)], cc.name, cc.color); o = ramp(t, 1.98, 2.95);
    }
    if (h !== lastHud) { hud.innerHTML = h; lastHud = h; }
    hud.style.opacity = o;

    // explorateur : CLIP_NOVA, puis double-clic sur RUSHES
    var inRushes = t >= 3.85;
    $('exTab').textContent = inRushes ? 'RUSHES' : 'CLIP_NOVA';
    $('exAddr').innerHTML = tr('Ce PC', 'This PC') + ' <b>›</b> Data (D:) <b>›</b> PROJETS <b>›</b> CLIP_NOVA' + (inRushes ? ' <b>›</b> RUSHES' : '');
    $('exSt').textContent = (inRushes ? SUB.length : TOP.length) + ' ' + tr('éléments', 'items');
    $('exSideRoot').classList.toggle('on', !inRushes);
    $('exSideRushes').classList.toggle('on', inRushes);
    exRushes.classList.toggle('sel', t >= 3.8 && !inRushes);

    // étape active et barre de progression
    var idx = Math.min(3, Math.floor(t));
    steps.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
    // frise horizontale sur ordinateur (barre au-dessus des étapes)
    if (bar) bar.style.transform = 'scaleX(' + (t / 4) + ')';
  }

  var steps = Array.prototype.slice.call(story.querySelectorAll('.story-step'));
  var bar = story.querySelector('.story-bar i');
  tl.eventCallback('onUpdate', sync);

  if (reduce) {
    tl.progress(1);
    sync();
    steps.forEach(function (s) { s.classList.add('on'); });
    return;
  }

  tl.progress(0);
  sync();
  ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: function () { return '+=' + Math.round(window.innerHeight * 3.2); },
    pin: true,
    scrub: 0.6,
    animation: tl,
    invalidateOnRefresh: true,
    onRefreshInit: fit
  });
})();
