# Boutique mugs : état et checklist d'ouverture

Fichier de suivi interne (non publié : `*.md` est exclu par `.vercelignore`).
Dernière mise à jour : 4 novembre 2026.

## Architecture (résumé)
`shop.html` (panier, adresse) -> `shop-checkout` (prix serveur, devis Gelato, page SumUp) -> `shop-sumup-webhook`
(paiement confirmé -> commande Gelato) -> `shop-gelato-webhook` (statuts, suivi) -> `/merci?ref=BPL-...`.
Mug 11 oz uniquement (15 oz désactivé, fichiers 15oz conservés). Les fichiers d'impression sont envoyés à Gelato
par URL (`/assets/mugs/print/11oz/...`) : Gelato ne reprend PAS le design des produits de la boutique Gelato
(testé : `files: []` / `designId: null`). Les mockups du site viennent de la boutique Gelato (`assets/mugs/*.webp`).

## Fait et vérifié
- Devis Gelato réel : 19,99 EUR + 4,99 EUR (DPD) = 24,98 EUR, 5 à 7 jours. Coût Gelato du mug : 5,13 EUR.
- Création de la page SumUp et de la commande en attente : OK.
- Brouillon Gelato avec le même message que le webhook de paiement : OK (supprimé ensuite).
- Webhook Gelato (`?k=<GELATO_WEBHOOK_SECRET>`) : test 200.
- Secrets Supabase en place : GELATO_API_KEY, GELATO_UID_MUG_11, SUMUP_API_KEY, SUMUP_MERCHANT_CODE,
  GELATO_WEBHOOK_SECRET, GELATO_ORDER_TYPE=draft.
- Page `terms` (CGV FR/EN) publiée.

## Reste à faire avant `SHOP_LIVE = true`
1. **Test du maillon paiement SumUp -> commande Gelato** (jamais exécuté de bout en bout) : bac à sable SumUp
   ou un vrai paiement remboursable avec `GELATO_ORDER_TYPE=draft`.
2. **Médiateur de la consommation : CM2C** (choisi, inscription à faire quand les fonds le permettent).
   Après l'inscription : remplacer le texte entre crochets de l'article 12 de `terms.html`
   (attributs `data-fr`/`data-en` ET contenu) par le texte ci-dessous, puis vérifier l'adresse sur le
   certificat/la clause fournie par le CM2C.
3. **Mention de TVA** (art. 293 B du CGI dans `terms.html`) : confirmer que le statut est bien la franchise en base.
4. **Activité déclarée** (guichet unique) : ajouter la vente de produits imprimés (mugs) ; vérifier `legal.html`.
5. **Politique de confidentialité** : citer Gelato (impression et livraison) et SumUp (paiement) comme destinataires.
6. Vérifier la marge, puis passer `GELATO_ORDER_TYPE` à `order` (ou supprimer le secret) et faire UNE vraie
   commande d'échantillon pour contrôler la qualité d'impression.
7. Passer `SHOP_LIVE = true` dans `shop.html` et republier.

## Texte prêt pour l'article 12 (CM2C)
FR :
> Pour toute réclamation, écrire d'abord à contact@thebackpacklab.com. Si le litige persiste, le consommateur peut
> recourir gratuitement au médiateur de la consommation : **CM2C (Centre de la Médiation de la Consommation de
> Conciliateurs de Justice)**, site <https://cm2c.net>, 49 rue de Ponthieu, 75008 Paris (adresse à confirmer sur la
> clause fournie par le CM2C à l'adhésion). La saisine se fait en ligne ou par courrier, après une réclamation écrite
> préalable auprès de BACKPACK LAB restée sans réponse satisfaisante, au plus tard un an après cette réclamation.

EN :
> For any complaint, first write to contact@thebackpacklab.com. If the dispute persists, the consumer may use the
> consumer mediator free of charge: **CM2C (Centre de la Médiation de la Consommation de Conciliateurs de Justice)**,
> website <https://cm2c.net>, 49 rue de Ponthieu, 75008 Paris, France (address to be confirmed against the clause
> supplied by CM2C on joining). The mediator can be contacted online or by post, after a prior written complaint to
> BACKPACK LAB that has not been satisfactorily answered, and no later than one year after that complaint.
