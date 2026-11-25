import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight, Check, Clock, Copy, Eye, Globe, Handshake, Info, Link2, Monitor, MousePointerClick,
  RefreshCw, Smartphone, Sparkles, TrendingDown, TrendingUp, UserPlus, Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  CHANNELS, countryFlag, countryName, deviceName, eventName, fmtDuration, groupSources, nf, pageName, pct,
} from './labels';

const SITE = 'thebackpacklab.com';
const rpc = (name, args) => window.BPL_ADMIN.rpc(name, args);

function viewVisible() {
  const v = document.getElementById('view-analytics');
  return v && v.style.display !== 'none' && document.visibilityState === 'visible';
}

/* ---------- petits composants ---------- */

function Hint({ children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Explication" className="inline-flex text-muted-foreground hover:text-foreground">
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}

function SectionTitle({ icon: Icon, children, hint }) {
  return (
    <CardTitle className="flex items-center gap-2">
      {Icon && <Icon className="size-4 text-primary" />}
      {children}
      {hint && <Hint>{hint}</Hint>}
    </CardTitle>
  );
}

function Kpi({ icon: Icon, label, value, sub, hint, delta }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">{label}{hint && <Hint>{hint}</Hint>}</span>
          <Icon className="size-4" />
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {delta}
          {sub && <span>{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function Delta({ now, before }) {
  if (!before) return null;
  const d = (now - before) / before * 100;
  const up = d >= 0;
  return (
    <Badge variant={up ? 'success' : 'danger'} className="px-1.5">
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {(up ? '+' : '') + Math.round(d)} %
    </Badge>
  );
}

// Liste avec barre horizontale proportionnelle : la façon la plus simple de lire « qui pèse le plus ».
function BarList({ rows, total, empty = 'Pas encore de données sur cette période.', color = 'bg-primary' }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
          <span className={cn('absolute inset-y-0 left-0 rounded-md opacity-15', color)} style={{ width: `${Math.max(2, r.value / max * 100)}%` }} />
          <span className="relative flex min-w-0 items-center gap-2 truncate">{r.label}</span>
          <span className="relative flex shrink-0 items-baseline gap-2 tabular-nums">
            <span className="font-medium">{nf.format(r.value)}</span>
            {total ? <span className="w-11 text-right text-xs text-muted-foreground">{pct(r.value, total)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CopyButton({ text, label = 'Copier' }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const ok = () => { setDone(true); setTimeout(() => setDone(false), 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, ok); else ok();
      }}
    >
      {done ? <Check /> : <Copy />}
      {done ? 'Copié' : label}
    </Button>
  );
}

/* ---------- sections ---------- */

function LiveStrip({ live }) {
  const n = live?.count ?? null;
  return (
    <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="relative flex size-2.5">
        <span className={cn('absolute inline-flex size-full rounded-full opacity-60', n ? 'animate-ping bg-primary' : '')} />
        <span className={cn('relative inline-flex size-2.5 rounded-full', n ? 'bg-primary' : 'bg-muted-foreground')} />
      </span>
      <span className="text-sm">
        <b className="text-base">{n === null ? '—' : n}</b>{' '}
        {n === 1 ? 'personne sur le site en ce moment' : 'personnes sur le site en ce moment'}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {(live?.by_path || []).map((p) => (
          <Badge key={p.path} variant="secondary">{pageName(p.path)} · {p.count}</Badge>
        ))}
      </div>
      <span className="ml-auto text-xs text-muted-foreground">Mis à jour toutes les 15 s</span>
    </Card>
  );
}

function Summary({ data, days, sources }) {
  const lines = [];
  const visits = data.unique_visitors || 0;
  const views = data.total_views || 0;
  const signups = data.funnel?.beta_signups || 0;
  lines.push(
    <>Sur les <b>{days} derniers jours</b>, le site a reçu <b>{nf.format(visits)} visites</b> pour <b>{nf.format(views)} pages vues</b>
      {visits ? <> (environ {(views / visits).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pages par visite)</> : null}.</>
  );
  lines.push(
    signups
      ? <><b>{nf.format(signups)} {signups > 1 ? 'personnes se sont inscrites' : 'personne s\'est inscrite'}</b> à la bêta Rushr, soit {pct(signups, visits, 1)} des visites.</>
      : <>Aucune inscription à la bêta Rushr sur cette période.</>
  );
  const real = sources.filter((s) => s.channel !== 'internal');
  const realTotal = real.reduce((a, s) => a + s.visitors, 0);
  const top = real[0];
  const country = (data.by_country || [])[0];
  const countryTotal = (data.by_country || []).reduce((a, c) => a + c.count, 0);
  if (top) {
    lines.push(
      <>Les visiteurs arrivent surtout par <b>{top.channel === 'direct' ? 'accès direct' : top.name}</b> ({pct(top.visitors, realTotal)})
        {country ? <>, et viennent surtout de <b>{countryName(country.country)}</b> ({pct(country.count, countryTotal)})</> : null}.</>
    );
  }
  const topPage = (data.by_path || [])[0];
  const mobile = (data.by_device || []).find((d) => d.device === 'mobile')?.count || 0;
  const devTotal = (data.by_device || []).reduce((a, d) => a + d.count, 0);
  if (topPage) {
    lines.push(<>Page la plus vue : <b>{pageName(topPage.path)}</b>. {devTotal ? <>{pct(mobile, devTotal)} des pages sont vues sur téléphone.</> : null}</>);
  }
  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent">
      <CardHeader>
        <SectionTitle icon={Sparkles}>En bref</SectionTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-foreground/90">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /><span>{l}</span></li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DailyChart({ daily, days }) {
  const points = useMemo(() => {
    const byDay = new Map((daily || []).map((d) => [String(d.day).slice(0, 10), d.count]));
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ key, label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), count: byDay.get(key) || 0 });
    }
    return out;
  }, [daily, days]);
  const best = points.reduce((a, p) => (p.count > a.count ? p : a), { count: 0 });
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={Eye} hint="Chaque point = le nombre de pages vues ce jour-là. Un pic correspond souvent à une publication sur les réseaux ou à un partage.">
          Pages vues par jour
        </SectionTitle>
        <CardDescription>
          {best.count ? <>Meilleur jour : <b className="text-foreground">{best.label}</b> avec {nf.format(best.count)} pages vues.</> : 'Pas encore de données sur cette période.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64 pl-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#35DC8E" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#35DC8E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tick={{ fill: '#9A9A9E', fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fill: '#9A9A9E', fontSize: 11 }} />
            <ChartTooltip
              cursor={{ stroke: 'rgba(255,255,255,.15)' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
                    <div className="font-medium">{payload[0].payload.label}</div>
                    <div className="text-muted-foreground"><b className="text-foreground">{nf.format(payload[0].value)}</b> pages vues</div>
                  </div>
                ) : null
              }
            />
            <Area dataKey="count" type="monotone" stroke="#35DC8E" strokeWidth={2} fill="url(#fillViews)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Sources({ sources }) {
  const [showInternal, setShowInternal] = useState(false);
  const internal = sources.filter((s) => s.channel === 'internal');
  const rows = sources.filter((s) => showInternal || s.channel !== 'internal');
  const total = rows.reduce((a, s) => a + s.visitors, 0);
  const max = Math.max(...rows.map((r) => r.visitors), 1);
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <SectionTitle icon={Globe} hint="On regarde la toute première page de chaque visite : d'où venait la personne ? « Accès direct » = adresse tapée, favori, ou lien ouvert depuis une appli (WhatsApp, Messages…) qui ne dit pas d'où il vient.">
          D'où viennent les visiteurs
        </SectionTitle>
        <CardDescription>Visites et inscriptions à la bêta, par provenance.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Visites</TableHead>
                <TableHead className="text-right">Inscrits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.key}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.name}</span>{s.channel === 'direct' && <span className="text-xs text-muted-foreground">lien tapé, favori, appli de messagerie…</span>}
                        {s.channel !== 'direct' && <Badge variant={CHANNELS[s.channel].badge}>{CHANNELS[s.channel].label}</Badge>}
                      </div>
                      <div className="h-1 rounded-full bg-muted">
                        <div className="h-1 rounded-full bg-primary/70" style={{ width: `${Math.max(2, s.visitors / max * 100)}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {nf.format(s.visitors)} <span className="text-xs text-muted-foreground">· {pct(s.visitors, total)}</span>
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', s.signups ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                    {s.signups}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Pas encore de données sur cette période.</p>
        )}
        {internal.length > 0 && (
          <button type="button" onClick={() => setShowInternal((v) => !v)} className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {showInternal
              ? 'Masquer tes tests et visites internes'
              : `${internal.reduce((a, s) => a + s.visitors, 0)} visites de tests ou internes masquées (localhost, préversions, liens « test »). Afficher`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function Funnel({ data }) {
  const f = data.funnel || { rushr_visitors: 0, beta_signups: 0, beta_signups_from_rushr: 0 };
  const visits = data.unique_visitors || 0;
  const steps = [
    { label: 'Visites du site', value: visits, help: 'Toutes les visites sur la période.' },
    { label: 'Ont vu la page Rushr', value: f.rushr_visitors, help: 'Visites qui sont passées par la page Rushr.' },
    { label: 'Inscrits à la bêta', value: f.beta_signups_from_rushr, help: 'Inscriptions faites pendant une visite passée par la page Rushr.' },
  ];
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <SectionTitle icon={UserPlus} hint="Combien de visiteurs vont jusqu'au bout : visite du site, puis page Rushr, puis inscription à la bêta. Le pourcentage indique combien passent à l'étape suivante.">
          Du visiteur à l'inscrit
        </SectionTitle>
        <CardDescription>Le parcours vers la bêta Rushr, étape par étape.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {steps.map((s, i) => (
          <div key={s.label}>
            {i > 0 && (
              <div className="mb-2 flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                <ArrowRight className="size-3.5 rotate-90" />
                {pct(s.value, steps[i - 1].value, 1)} passent à l'étape suivante
              </div>
            )}
            <div className="relative overflow-hidden rounded-lg border px-4 py-3">
              <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${Math.max(2, visits ? s.value / visits * 100 : 0)}%` }} />
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-sm">{s.label}<Hint>{s.help}</Hint></span>
                <span className="text-xl font-bold tabular-nums">{nf.format(s.value)}</span>
              </div>
            </div>
          </div>
        ))}
        {f.beta_signups > f.beta_signups_from_rushr && (
          <p className="text-xs text-muted-foreground">
            {f.beta_signups} inscription{f.beta_signups > 1 ? 's' : ''} au total sur la période : les autres ont eu lieu sans passer par la page Rushr pendant la même visite (lien direct vers le formulaire, autre onglet…).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Partners({ sources }) {
  const partners = sources.filter((s) => s.channel === 'partner');
  const [name, setName] = useState('');
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={Handshake} hint="Chaque partenaire partage son lien thebackpacklab.com/p/sonnom. Toute visite arrivée par ce lien est comptée pour lui, ainsi que les inscriptions à la bêta faites pendant cette visite.">
          Partenaires
        </SectionTitle>
        <CardDescription>Les visites et inscriptions apportées par les liens de tes partenaires.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          {partners.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Partenaire</TableHead>
                  <TableHead className="text-right">Visites</TableHead>
                  <TableHead className="text-right">Inscrits</TableHead>
                  <TableHead className="text-right">Lien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => {
                  const link = `${SITE}/p/${p.key.split(':')[1]}`;
                  return (
                    <TableRow key={p.key}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(p.visitors)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', p.signups ? 'font-semibold text-primary' : 'text-muted-foreground')}>{p.signups}</TableCell>
                      <TableCell className="text-right"><CopyButton text={'https://' + link} label="Copier" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune visite venant d'un partenaire sur cette période.
            </p>
          )}
        </div>
        <div className="min-w-0 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="size-4 text-primary" />Créer un lien partenaire</div>
          <p className="mt-1 text-xs text-muted-foreground">Tape le nom du partenaire, puis copie le lien à lui envoyer. Rien d'autre à configurer.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Cineloc"
            className="mt-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 basis-56 break-all rounded-md bg-background px-3 py-2 text-[13px] text-primary">
              {SITE}/p/{slug || 'nom'}
            </code>
            <CopyButton text={`https://${SITE}/p/${slug}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Pages({ data }) {
  const [tab, setTab] = useState('top');
  const rows = (tab === 'top' ? data.by_path : data.by_exit) || [];
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <SectionTitle
            icon={Eye}
            hint={tab === 'top'
              ? 'Les pages les plus consultées, toutes visites confondues.'
              : 'La dernière page vue avant de quitter le site. Une page qui fait beaucoup partir les gens mérite peut-être un meilleur appel à l\'action.'}
          >
            Pages
          </SectionTitle>
          <CardDescription>{tab === 'top' ? 'Les pages les plus consultées.' : 'Où les visiteurs quittent le site.'}</CardDescription>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8">
            <TabsTrigger value="top" className="text-xs">Les plus vues</TabsTrigger>
            <TabsTrigger value="exit" className="text-xs">Pages de sortie</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <BarList rows={rows.map((r) => ({ key: r.path, label: pageName(r.path), value: r.count }))} total={total} />
      </CardContent>
    </Card>
  );
}

function Actions({ data }) {
  const clicks = data.clicks || [];
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={MousePointerClick} hint="Les gestes importants faits par les visiteurs. « Personnes » = nombre de visites différentes qui l'ont fait.">
          Ce que font les visiteurs
        </SectionTitle>
        <CardDescription>Clics importants : bêta, Discord, téléchargements, boutique.</CardDescription>
      </CardHeader>
      <CardContent>
        {clicks.length ? (
          <ul className="flex flex-col divide-y">
            {clicks.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm">{eventName(c.event)}</div>
                  {c.label && <div className="truncate text-xs text-muted-foreground">{c.label}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{nf.format(c.visitors)} {c.visitors > 1 ? 'personnes' : 'personne'}</div>
                  {c.count !== c.visitors && <div className="text-xs text-muted-foreground">{c.count} clics</div>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun clic suivi sur cette période.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Audience({ data }) {
  const countries = data.by_country || [];
  const cTotal = countries.reduce((a, c) => a + c.count, 0);
  const devices = data.by_device || [];
  const dTotal = devices.reduce((a, d) => a + d.count, 0);
  const browsers = data.by_browser || [];
  const bTotal = browsers.reduce((a, b) => a + b.count, 0);
  return (
    <>
      <Card>
        <CardHeader>
          <SectionTitle icon={Globe} hint="Pays de connexion, en pages vues.">Pays</SectionTitle>
          <CardDescription>D'où se connectent les visiteurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            color="bg-chart-2"
            rows={countries.slice(0, 8).map((c) => ({ key: c.country, label: <><span>{countryFlag(c.country)}</span>{countryName(c.country)}</>, value: c.count }))}
            total={cTotal}
          />
          {countries.length > 8 && <p className="mt-2 text-xs text-muted-foreground">+ {countries.length - 8} autres pays</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <SectionTitle icon={Monitor} hint="Sur quel appareil et quel navigateur les pages sont vues. Utile pour savoir si la version téléphone mérite plus d'attention.">
            Appareils
          </SectionTitle>
          <CardDescription>Ordinateur ou téléphone, et navigateur utilisé.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {['desktop', 'mobile'].map((k) => {
              const n = devices.find((d) => d.device === k)?.count || 0;
              const Icon = k === 'desktop' ? Monitor : Smartphone;
              return (
                <div key={k} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{deviceName(k)}</div>
                  <div className="mt-1 text-2xl font-bold">{pct(n, dTotal)}</div>
                  <div className="text-xs text-muted-foreground">{nf.format(n)} pages vues</div>
                </div>
              );
            })}
          </div>
          <BarList color="bg-chart-3" rows={browsers.map((b) => ({ key: b.browser, label: b.browser === 'Other' ? 'Autre' : b.browser, value: b.count }))} total={bTotal} />
        </CardContent>
      </Card>
    </>
  );
}

/* ---------- page ---------- */

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [prevViews, setPrevViews] = useState(null);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true); setError(null);
    try {
      const [cur, dbl] = await Promise.all([
        rpc('analytics_admin_summary', { p_days: d }),
        rpc('analytics_admin_summary', { p_days: d * 2 }).catch(() => null),
      ]);
      setData(cur);
      // Période précédente (même durée, juste avant) : pages vues du double de la période moins la période actuelle.
      setPrevViews(dbl ? Math.max(0, (dbl.total_views || 0) - (cur.total_views || 0)) : null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (!viewVisible()) return;
      try { const d = await rpc('analytics_active_now'); if (!stop) setLive(d); } catch { /* rafraîchissement en arrière-plan */ }
    };
    tick();
    const id = setInterval(tick, 15000);
    const onView = (e) => { if (e.detail === 'analytics') { tick(); } };
    document.addEventListener('bpl:view', onView);
    return () => { stop = true; clearInterval(id); document.removeEventListener('bpl:view', onView); };
  }, []);

  const sources = useMemo(() => groupSources(data?.by_campaign), [data]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bpl-ui flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Statistiques du site</h2>
            <p className="text-sm text-muted-foreground">
              Qui vient sur {SITE}, d'où, et ce qu'ils y font.
              {updatedAt && <> Mis à jour à {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <TabsList>
                <TabsTrigger value="7">7 jours</TabsTrigger>
                <TabsTrigger value="30">30 jours</TabsTrigger>
                <TabsTrigger value="90">90 jours</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" aria-label="Rafraîchir" onClick={() => load(days)} disabled={loading}>
              <RefreshCw className={cn(loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <LiveStrip live={live} />

        {error && (
          <Card className="border-destructive/40 p-4 text-sm text-destructive">Impossible de charger les statistiques : {error}</Card>
        )}

        {!data && loading && <Card className="p-10 text-center text-sm text-muted-foreground">Chargement des statistiques…</Card>}

        {data && (
          <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')}>
            <Summary data={data} days={days} sources={sources} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi
                icon={Users}
                label="Visites"
                value={nf.format(data.unique_visitors || 0)}
                hint="Une visite = une personne qui ouvre le site. Si elle revient un autre jour, ça compte comme une nouvelle visite."
                sub="personnes venues sur le site"
              />
              <Kpi
                icon={Eye}
                label="Pages vues"
                value={nf.format(data.total_views || 0)}
                hint="Chaque page ouverte compte une fois. Comparé à la période précédente de même durée."
                delta={<Delta now={data.total_views || 0} before={prevViews} />}
                sub={prevViews !== null ? `vs ${nf.format(prevViews)} avant` : null}
              />
              <Kpi
                icon={UserPlus}
                label="Inscrits à la bêta"
                value={nf.format(data.funnel?.beta_signups || 0)}
                hint="Inscriptions au formulaire bêta de Rushr sur la période."
                sub={`${pct(data.funnel?.beta_signups || 0, data.unique_visitors || 0, 1)} des visites`}
              />
              <Kpi
                icon={Clock}
                label="Temps sur une page"
                value={fmtDuration(data.median_duration_ms)}
                hint="Durée typique (médiane) passée sur une page : la moitié des pages sont lues plus longtemps, l'autre moitié moins. Plus fiable qu'une moyenne, que quelques onglets oubliés ouverts gonflent."
                sub="durée typique"
              />
            </div>

            <DailyChart daily={data.daily} days={days} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Sources sources={sources} />
              <Funnel data={data} />
            </div>

            <Partners sources={sources} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Pages data={data} />
              <Actions data={data} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Audience data={data} />
            </div>

            {data.bots_filtered > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {nf.format(data.bots_filtered)} pages vues par des robots (Google, outils automatiques…) ont été ignorées. Tes propres visites ne sont pas comptées depuis ce navigateur.
              </p>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
