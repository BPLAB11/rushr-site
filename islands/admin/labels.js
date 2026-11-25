// Traductions « humaines » des données brutes d'analytics : pages, sources, clics, pays, appareils.

const PAGE_NAMES = {
  '/': 'Accueil',
  '/rushr': 'Rushr',
  '/software': 'Nos logiciels',
  '/soundbox': 'SoundBox',
  '/soniq': 'SONIQ',
  '/shop': 'Boutique',
  '/packs': 'Presets & Packs',
  '/support': 'Support Rushr',
  '/guide': 'Guide Rushr',
  '/download': 'Télécharger Rushr',
  '/derushage': 'Article « Dérushage »',
  '/account': 'Mon compte',
  '/claim': 'Réclamer ma licence',
  '/services': 'Services',
  '/merci': 'Merci (après commande)',
  '/legal': 'Mentions légales',
  '/privacy': 'Confidentialité',
  '/terms': 'CGV',
  '/review': 'Review client',
  '/unsubscribe': 'Désabonnement',
  '/404': 'Page introuvable',
};

export function pageName(path) {
  if (!path) return 'Inconnue';
  let p = String(path).replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return PAGE_NAMES[p] || p;
}

// Sources de trafic, regroupées en canaux lisibles.
export const CHANNELS = {
  partner: { label: 'Partenaire', badge: 'success' },
  social: { label: 'Réseau social', badge: 'info' },
  search: { label: 'Moteur de recherche', badge: 'warning' },
  direct: { label: 'Accès direct', badge: 'secondary' },
  site: { label: 'Autre site', badge: 'outline' },
  internal: { label: 'Tests & interne', badge: 'danger' },
};

const SOCIAL = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^fb$|^facebook$/, 'Facebook'],
  [/(^|\.)instagram\.com$|^ig$|^instagram$/, 'Instagram'],
  [/(^|\.)threads\.(net|com)$|^threads$/, 'Threads'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^linkedin$/, 'LinkedIn'],
  [/(^|\.)tiktok\.com$|^tiktok$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$|^youtube$/, 'YouTube'],
  [/(^|\.)(x\.com|twitter\.com)$|^t\.co$|^twitter$|^x$/, 'X (Twitter)'],
  [/(^|\.)reddit\.com$|^reddit$/, 'Reddit'],
  [/(^|\.)(discord\.com|discord\.gg|discordapp\.com)$|^discord$/, 'Discord'],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$/, 'WhatsApp'],
  [/(^|\.)snapchat\.com$|^snapchat$/, 'Snapchat'],
  [/(^|\.)pinterest\.[a-z.]+$|^pinterest$/, 'Pinterest'],
];
const SEARCH = [
  [/(^|\.)google\.[a-z.]+$|^google$/, 'Google'],
  [/(^|\.)bing\.com$|^bing$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)qwant\.com$/, 'Qwant'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'Yahoo'],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai)$/, 'Assistant IA'],
];
const INTERNAL = /^(test|localhost|127\.0\.0\.1)(:\d+)?$|(^|\.)thebackpacklab\.com$|\.workers\.dev$|(^|\.)vercel\.(com|app)$|\.pages\.dev$/;

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function classifySource(source, medium) {
  const s = String(source || 'direct').toLowerCase().replace(/^www\./, '').replace(/^(l|lm|m|mobile)\./, '');
  const raw = String(source || '').toLowerCase();
  if ((medium || '').toLowerCase() === 'partenaire') return { channel: 'partner', name: capitalize(s), key: 'partner:' + s };
  if (s === 'direct') return { channel: 'direct', name: 'Accès direct', key: 'direct' };
  if (INTERNAL.test(s) || INTERNAL.test(raw)) return { channel: 'internal', name: raw || s, key: 'internal:' + raw };
  for (const [re, name] of SOCIAL) if (re.test(s)) return { channel: 'social', name, key: 'social:' + name };
  for (const [re, name] of SEARCH) if (re.test(s)) return { channel: 'search', name, key: 'search:' + name };
  return { channel: 'site', name: s, key: 'site:' + s };
}

// Regroupe les lignes « by_campaign » (source/medium/campaign) par source lisible.
export function groupSources(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const c = classifySource(r.source, r.medium);
    const cur = map.get(c.key) || { ...c, visitors: 0, signups: 0, campaigns: new Set() };
    cur.visitors += r.visitors || 0;
    cur.signups += r.signups || 0;
    if (r.campaign) cur.campaigns.add(r.campaign);
    map.set(c.key, cur);
  }
  return [...map.values()].sort((a, b) => b.visitors - a.visitors || b.signups - a.signups);
}

const EVENTS = {
  cta_beta: 'A cliqué sur « Rejoindre la bêta »',
  discord: 'Est parti vers le Discord',
  download: 'A lancé un téléchargement',
  add_to_cart: 'A ajouté un article au panier',
  begin_payment: 'A commencé un paiement',
  waitlist_signup: 'S\'est inscrit à une liste d\'attente',
};
export function eventName(ev) {
  return EVENTS[ev] || ev;
}

let regionNames;
try { regionNames = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch { regionNames = null; }
export function countryName(cc) {
  if (!cc || cc === '??') return 'Inconnu';
  try { return (regionNames && regionNames.of(cc)) || cc; } catch { return cc; }
}
export function countryFlag(cc) {
  if (!cc || cc.length !== 2 || cc === '??') return '🏳️';
  return cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function deviceName(d) {
  return { desktop: 'Ordinateur', mobile: 'Téléphone', tablet: 'Tablette' }[d] || 'Inconnu';
}

export const nf = new Intl.NumberFormat('fr-FR');
export function pct(part, total, digits = 0) {
  if (!total) return '0 %';
  const v = part / total * 100;
  if (part > 0 && v < Math.pow(10, -digits) / 2 * 2 && Number(v.toFixed(digits)) === 0) return '< ' + (digits ? '0,' + '0'.repeat(digits - 1) + '1' : '1') + ' %';
  return (part / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) + ' %';
}
export function fmtDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60);
  return m + ' min ' + String(s % 60).padStart(2, '0') + ' s';
}
