# Kit de promotion — Backpack Lab

Budget : 10 €. Principe : tout le gratuit d'abord, les 10 € à la fin sur ce qui a déjà marché.
Préparé le 8 novembre 2026.

---

## 1. Plan sur 2 semaines

| Quand | Quoi |
|---|---|
| **Jour 0** (avant tout) | Pousser le site (nouvelle image de partage), inscrire le site à Google Search Console et Bing Webmaster, créer/mettre à jour les profils avec les bios du §4. |
| **Jours 1 à 7** | Un clip vertical par jour sur TikTok, Instagram Reels et YouTube Shorts, en alternant Rushr (§3 bis, priorité) et VFX (§3). Même clip, même légende, trois réseaux. Ordre conseillé : Rushr motion, VFX best-of, Rushr « trier ses rushes », VFX objets 3D, Rushr « en local », Rushr « presets », Rushr « appel aux testeurs ». |
| **Jours 3 à 7** | Posts communautés pour Rushr (§5) : un seul groupe par jour, pour pouvoir répondre aux commentaires. |
| **Mardi 17 novembre** (ou mer. / jeu.) | Lancement Product Hunt de Rushr (§6). Prévoir les visuels la veille. |
| **Jours 8 à 10** | Regarder quel clip a le mieux marché, le booster avec les 10 € (§7). |

---

## 2. Liens de suivi (à utiliser partout, jamais le lien nu)

Chaque lien amène sur le site normalement, mais te dit d'où vient le visiteur. Dans Microsoft Clarity, les visites sont filtrables par source/campagne.
Limite : Clarity ne mesure que les visiteurs qui ont accepté les cookies, les chiffres seront donc partiels.

**Vers l'accueil**

| Où le mettre | Lien |
|---|---|
| Bio TikTok | `https://thebackpacklab.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
| Bio Instagram | `https://thebackpacklab.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| YouTube (description, Shorts) | `https://thebackpacklab.com/?utm_source=youtube&utm_medium=social&utm_campaign=bio` |
| Behance | `https://thebackpacklab.com/?utm_source=behance&utm_medium=portfolio&utm_campaign=profil` |
| Vimeo | `https://thebackpacklab.com/?utm_source=vimeo&utm_medium=portfolio&utm_campaign=profil` |
| Annonce Discord | `https://thebackpacklab.com/?utm_source=discord&utm_medium=community&utm_campaign=lancement` |
| Boost payant (§7) | `https://thebackpacklab.com/?utm_source=instagram&utm_medium=paid&utm_campaign=boost-showreel` |

**Vers la page Rushr**

| Où le mettre | Lien |
|---|---|
| Product Hunt | `https://thebackpacklab.com/rushr?utm_source=producthunt&utm_medium=launch&utm_campaign=rushr-beta` |
| Reddit | `https://thebackpacklab.com/rushr?utm_source=reddit&utm_medium=community&utm_campaign=rushr-beta` |
| Groupes Facebook | `https://thebackpacklab.com/rushr?utm_source=facebook&utm_medium=community&utm_campaign=rushr-beta` |
| Discords de monteurs | `https://thebackpacklab.com/rushr?utm_source=discord&utm_medium=community&utm_campaign=rushr-beta` |

---

## 3. Clips verticaux (dossier `promo/clips/`)

Format 1080×1920, avec le son d'origine, titre au-dessus et adresse du site en dessous. Générés par `promo/make-clips.sh` (modifiable : nom, début, fin, titre).

| Fichier | Durée | Titre affiché | Jour conseillé |
|---|---|---|---|
| `01-best-of-vfx.mp4` | 12,8 s | Incrustation 3D & effets | Jour 1 (le plus dense, bon pour accrocher) |
| `03-objets-3d.mp4` | 8,7 s | Objets 3D incrustés | Jour 2 |
| `02-incrustation-ecran.mp4` | 13,4 s | Incrustation d'écran | Jour 3 |
| `04-interfaces-ecran.mp4` | 8 s | Interfaces à l'écran | Jour 4 |
| `00-showreel-complet.mp4` | 57 s | SHOWREEL VFX | Jour 5 (version complète) |

Tu as aussi `rushr-motion-9x16-final.mp4` dans Téléchargements (25 s, 1080×1920) : poste-le pour Rushr, par exemple le jour 3.

**Légendes à copier** (mettre le lien de suivi dans la bio, pas dans la légende)

1. `Incrustation 3D, effets, étalonnage : un aperçu de ce qu'on fait chez Backpack Lab 🎒 Lien en bio. #vfx #incrustation3d #montagevideo #clipvideo #videaste`
2. `Des objets 3D qui s'intègrent dans une vraie prise. Tu veux le même effet sur ton clip ? Écris-nous 👇 #3d #vfx #motiondesign #clipvideo #montage`
3. `Remplacer un écran, ajouter une interface : l'incrustation d'écran en action. #vfx #postproduction #montagevideo #videaste #effetsvisuels`
4. `Des interfaces et du texte qui vivent dans la scène. Backpack Lab : VFX et logiciels pour monteurs. #motiondesign #vfx #montagevideo #postprod`
5. `Le showreel complet de Backpack Lab 🎒 VFX, incrustation 3D, et les logiciels qu'on développe pour les monteurs. Lien en bio.`

**Heures** : en semaine 12 h–13 h ou 18 h–20 h. Réponds aux commentaires dans l'heure qui suit, c'est ce qui aide le plus.

**À vérifier avant de publier** : la musique des clips doit être libre de droits ou t'appartenir, sinon TikTok et Instagram peuvent couper le son ou bloquer la vidéo. Vérifie aussi que les artistes et clients visibles sont d'accord pour que leurs images servent à ta promotion.

---

## 3 bis. Clips Rushr (dossier `promo/clips/`)

Format 1080×1920, 30 images/s, **sans son** : ajoute un son tendance ou une musique libre directement dans l'appli (TikTok, Instagram, YouTube Shorts), c'est meilleur pour la portée et ça évite les soucis de droits. Créés à partir des captures du logiciel, dans l'univers noir et orange de ta vidéo. Générés par `promo/make-rushr-clips.sh` (textes et recadrages dans `promo/rushr-scenes.html`).

| Fichier | Durée | Message | Pour quoi |
|---|---|---|---|
| `rushr-00-motion-25s.mp4` | 25 s | Ta vidéo existante : le chaos des rushes, les 3 étapes, inscription | Premier post, présentation générale |
| `rushr-01-trier-ses-rushes.mp4` | 17 s | Importer, prévisualiser, taguer au clavier, Prepare | Le clip « démo » complet |
| `rushr-02-rushes-en-local.mp4` | 12 s | Tes rushes ne quittent jamais ton ordinateur, mode Copie | Rassure : confidentialité et fichiers intacts |
| `rushr-03-presets-et-structure.mp4` | 15 s | Un preset, une arborescence propre en un clic | Parle aux mariages, clips, FPV, docs |
| `rushr-04-appel-aux-testeurs.mp4` | 9 s | On cherche des monteurs pour tester, licence offerte | À poster dans les communautés |

**YouTube Shorts** (titre ≤ 100 caractères, ajoute `#Shorts` dans le titre ou la description ; la page de téléchargement de la vidéo te demande « Pas destinée aux enfants »)

| Clip | Titre | Description |
|---|---|---|
| 00 motion | `Trie tes rushes avant le montage — Rushr #Shorts` | `Rushr, le logiciel qui trie tes rushes avant que tu ouvres ton logiciel de montage. Beta sur préinscription, licence offerte pendant la beta. 👉 thebackpacklab.com #Shorts #montagevideo #dérushage` |
| 01 trier | `Combien de temps tu perds à trier tes rushes ? #Shorts` | `Importe tes dossiers de prises, prévisualise, tague au clavier (touches 1 à 9) et un clic sur Prepare range tout. Rushr est en beta, licence offerte. 👉 thebackpacklab.com #Shorts #montagevideo #premierepro #davinciresolve` |
| 02 en local | `Tes rushes ne quittent jamais ton PC — Rushr #Shorts` | `Rushr fonctionne en local et travaille en mode Copie par défaut : tes fichiers originaux restent intacts. Beta sur préinscription. 👉 thebackpacklab.com #Shorts #montagevideo #videaste` |
| 03 presets | `Un projet propre dès la première minute #Shorts` | `Mariage, clip, FPV, documentaire… choisis un preset et Rushr crée l'arborescence du projet en un clic. Beta sur préinscription. 👉 thebackpacklab.com #Shorts #montagevideo #workflow` |
| 04 testeurs | `On cherche des monteurs pour tester Rushr #Shorts` | `Rushr est en beta : licence offerte pendant la beta, hors ligne, et tes retours façonnent la V1. Inscris-toi sur thebackpacklab.com #Shorts #montagevideo #beta` |

Dans la description YouTube, le lien du site est cliquable : utilise le lien de suivi YouTube du §2 (vers l'accueil, ou vers `/rushr` pour les clips Rushr : `https://thebackpacklab.com/rushr?utm_source=youtube&utm_medium=social&utm_campaign=shorts`).

**Légendes TikTok / Instagram** (lien en bio)
- 00 : `Des centaines de rushes, un seul dossier en vrac ? Rushr les trie avant le montage 🎒 Beta sur préinscription, lien en bio. #montagevideo #dérushage #videaste`
- 01 : `Importer, prévisualiser, taguer au clavier, Prepare. Le tri des rushes en un flux. Licence offerte pendant la beta, lien en bio. #montagevideo #premierepro #davinciresolve`
- 02 : `Tes rushes restent chez toi : 100 % en local, mode Copie, originaux intacts. Rushr, lien en bio. #montagevideo #videaste #workflow`
- 03 : `Un preset, une arborescence propre en un clic. Rushr, beta sur préinscription, lien en bio. #montagevideo #wedding #fpv #workflow`
- 04 : `On cherche des monteurs pour tester Rushr. Licence offerte pendant la beta, lien en bio. #montagevideo #beta #videaste`

**À savoir**
- La dernière image de chaque clip indique « Windows · macOS (Apple Silicon) », alors que ta vidéo `rushr-00` dit « Windows & macOS ». Si tu veux être cohérent, dis-le-moi et je modifie le texte de l'un ou de l'autre.
- Les images du logiciel viennent des captures du site (projets d'exemple « Dupont_Wedding », etc.) : aucune donnée réelle n'apparaît.

---

## 4. Bios

**TikTok / Instagram** (court)
> 🎒 Backpack Lab · Logiciels & VFX pour créateurs vidéo
> Rushr (beta) · incrustation 3D · effets visuels
> 👇 Le labo

**YouTube / Behance / Vimeo** (plus long)
> Backpack Lab est un petit studio qui développe des logiciels desktop pour les monteurs (Rushr, SoundBox, SONIQ) et réalise des effets visuels : incrustation 3D, incrustation d'écran, effets pour clips et créateurs. Devis et questions : contact@thebackpacklab.com

---

## 5. Posts de communauté (Rushr)

Règle d'or : parle du problème, pas de ton produit. Lis les règles d'autopromotion de chaque groupe avant de poster. Joins une courte vidéo d'écran. Réponds à tous les commentaires.

**En français (groupes Facebook, Discords de monteurs)**
> Vous aussi vous perdez du temps à trier vos rushes avant même d'ouvrir Premiere ou DaVinci ?
> J'ai fait un petit outil pour ça : on importe les dossiers de prises, on prévisualise, on tague au clavier (touches 1 à 9) et un clic sur « Prepare » range tout dans l'arborescence du projet. Ça marche hors ligne, vos fichiers originaux ne sont pas touchés (mode Copie par défaut).
> C'est en beta, licence offerte pendant la beta. Je cherche des monteurs pour le tester et me dire ce qui manque.
> Lien + démo : [lien Rushr avec suivi]

**En anglais (Reddit, selon les règles du sous-forum)**
> **I built a free-during-beta tool to sort footage before opening the editor — looking for feedback**
> Every project I'd spend the first hour copying, renaming and sorting takes into folders. So I built Rushr: import your footage folders, preview each clip, tag with the keyboard (keys 1–9), then one "Prepare" click moves everything into a clean project structure. It runs offline, never uploads anything, and works in Copy mode by default so your originals stay untouched.
> It's in beta (Windows and macOS on Apple Silicon). I'm looking for editors to try it and tell me what's missing. [link]

---

## 6. Product Hunt — Rushr

À préparer la veille : 3 à 5 images (captures `assets/rushr-app-shot.png`, `rushr-dashboard-shot.png`, `rushr-structure-shot.png`), le logo (`assets/rushr-favicon-512.png`), et idéalement la vidéo `rushr-motion-9x16-final.mp4`. Lancer à 00 h 01 heure du Pacifique (9 h 01 en France), un mardi, mercredi ou jeudi.

- **Nom** : Rushr
- **Tagline** (45 car., limite 60) : `Sort your footage before you open your editor`
- **Description** (limite 260) : `Rushr is a desktop app for video editors. Import your takes, preview them, tag with your keyboard (keys 1-9), then hit Prepare to sort everything into a clean project structure. Works offline, your footage never leaves your machine.`
- **Catégories** : Video Editing, Productivity, Desktop App

**Premier commentaire (du créateur)**
> Hi everyone, I'm [prénom], maker of Rushr 👋
> I'm a video editor, and the part I hated most was the tedious sorting of footage before the actual edit starts. Rushr is built around that moment: import folders of takes, preview them, tag with the keyboard, reject the bad ones, and press Prepare to get everything into a clean project structure, ready for Premiere, DaVinci or any editor.
> It runs offline and never uploads your files. It's in beta, with a free license during the beta, on Windows and macOS (Apple Silicon for now).
> I'd love to hear what's missing from your own workflow. What would make this part of your day faster?

> Ne pas demander de votes dans les posts : Product Hunt peut annuler les votes suspects. Demande plutôt des retours et des avis.

---

## 7. Les 10 €

À faire seulement si un clip s'est démarqué en organique. Sinon, ne dépense rien.

1. Attends 5 à 7 jours après les premiers posts. Choisis le clip avec le plus de partages et de sauvegardes par rapport à ses vues (pas simplement le plus vu).
2. Booste-le sur **Instagram** (le bouton « Booster » permet de commencer petit, environ 1 €/jour ; à vérifier dans l'appli). TikTok impose souvent un minimum plus élevé.
3. Réglages : objectif « visites du site » ou « clics sur le lien », France (+ pays francophones si tu veux), 18–40 ans, centres d'intérêt montage vidéo, Premiere Pro, DaVinci Resolve, vidéaste. Budget 10 €, durée 5 jours.
4. Utilise le lien de suivi « Boost payant » du §2.
5. Au bout de 5 jours : combien de visites et d'inscriptions beta ? Ça te dit si ça vaut le coup de remettre de l'argent.

À attendre : quelques centaines de personnes touchées, pas des milliers. Le but est de tester, pas de faire exploser les chiffres.

---

## 8. Annonce Discord (ton serveur)

> 🎒 **Nouveau sur le site Backpack Lab !**
> Le site fait peau neuve : on y présente nos logiciels (Rushr en beta, SoundBox, SONIQ, RENAME à venir) et notre travail de VFX avec un showreel.
> 👉 [lien Discord avec suivi]
> Vos retours sur Rushr nous aident à construire la V1 : dites-nous ce qui vous manque.

---

## 9. Checklist rapide

- [ ] Pousser le site (image de partage + titre) et vérifier l'aperçu en collant le lien dans un message Discord ou WhatsApp.
- [ ] Google Search Console : ajouter `thebackpacklab.com`, envoyer `https://thebackpacklab.com/sitemap.xml`.
- [ ] Bing Webmaster Tools : importer le site depuis Search Console.
- [ ] Bios et liens de suivi sur TikTok, Instagram, YouTube, Behance, Vimeo.
- [ ] Musique et accords des artistes vérifiés.
- [ ] Décider : Mac Intel non pris en charge (build Apple Silicon uniquement), à préciser sur le site avant l'afflux de visiteurs.
