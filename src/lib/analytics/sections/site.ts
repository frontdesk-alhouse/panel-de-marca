import { formatNumber, formatPct } from "@/lib/format";
import { breakdown, history, latestByDim, totals, type BreakdownRow } from "../query";
import { INDUSTRY, ownRef } from "../refs";
import { rankInsights, safeDiv, type Insight } from "../insights";
import type { Period } from "../period";

const TOTAL_M = ["sessions", "engaged_sessions", "engagement_seconds", "page_views", "event_scroll", "event_form_start", "event_generate_lead", "event_contact_whatsapp", "event_contact_call"];
const PAGE_M = ["page_views", "page_engagement_seconds", "event_scroll", "event_form_start", "event_generate_lead"];
const LANDING_M = ["sessions", "engaged_sessions", "engagement_seconds", "key_events"];
const MIN_VIEWS = 15;
const LEAD_PAGES = ["/lets-work", "/en/lets-work"];
/** Visitas mínimas en el periodo anterior para mostrar el % de cambio */
const MIN_COMPARE = 30;

export interface PageStat { key: string; views: number; avgSeconds: number | null; scrollRate: number | null; formStarts: number; leads: number }
export interface LandingStat { key: string; sessions: number; bounceRate: number | null; avgSeconds: number | null; conversions: number }
export interface SpeedStat { key: string; strategy: string; path: string; perf?: number; lcp?: number; cls?: number; seo?: number; a11y?: number; measurement: string; date: string }

function pageStat(r: BreakdownRow): PageStat {
  const views = r.cur.page_views ?? 0;
  return {
    key: r.key, views,
    avgSeconds: safeDiv(r.cur.page_engagement_seconds, views),
    scrollRate: views ? Math.min(1, (r.cur.event_scroll ?? 0) / views) : null,
    formStarts: r.cur.event_form_start ?? 0,
    leads: r.cur.event_generate_lead ?? 0,
  };
}

function landingStat(r: BreakdownRow): LandingStat {
  const s = r.cur.sessions ?? 0;
  return { key: r.key, sessions: s, bounceRate: s ? 1 - (r.cur.engaged_sessions ?? 0) / s : null, avgSeconds: safeDiv(r.cur.engagement_seconds, s), conversions: r.cur.key_events ?? 0 };
}

export async function loadSite(p: Period) {
  const [cur, prev, pagesRaw, landingRaw, psi, hist] = await Promise.all([
    totals("ga4", TOTAL_M, p.current),
    totals("ga4", TOTAL_M, p.previous),
    breakdown("ga4", "page", PAGE_M, p.current, p.previous),
    breakdown("ga4", "landing", LANDING_M, p.current, p.previous),
    latestByDim("psi", "mobile").then(async (m) => ({ mobile: m, desktop: await latestByDim("psi", "desktop") })),
    history("ga4", TOTAL_M, p.current),
  ]);

  const pages = pagesRaw.map(pageStat).filter((x) => x.views > 0).sort((a, b) => b.views - a.views);
  const landings = landingRaw.map(landingStat).filter((x) => x.sessions > 0).sort((a, b) => b.sessions - a.sessions);
  const speed: SpeedStat[] = [
    ...[...psi.mobile].map(([path, e]) => ({ path, strategy: "Móvil", e })),
    ...[...psi.desktop].map(([path, e]) => ({ path, strategy: "Escritorio", e })),
  ].map(({ path, strategy, e }) => ({
    key: `${strategy}:${path}`, strategy, path, date: e.date,
    perf: e.values.lighthouse_performance, lcp: e.values.lcp_ms, cls: e.values.cls, seo: e.values.lighthouse_seo, a11y: e.values.lighthouse_a11y,
    measurement: String((e.meta.lcp_ms as { measurement?: string } | null)?.measurement ?? "lab"),
  }));

  const leadPageViews = pages.filter((x) => LEAD_PAGES.includes(x.key)).reduce((a, x) => a + x.views, 0);
  const funnel = [
    { step: "Visitas al sitio", value: cur.sessions ?? 0 },
    { step: "Vistas a la página de contacto", value: leadPageViews },
    { step: "Empezaron el formulario", value: cur.event_form_start ?? 0 },
    { step: "Enviaron el formulario", value: cur.event_generate_lead ?? 0 },
  ];

  const kpis = {
    engagementRate: [safeDiv(cur.engaged_sessions, cur.sessions), safeDiv(prev.engaged_sessions, prev.sessions)] as [number | null, number | null],
    avgSeconds: [safeDiv(cur.engagement_seconds, cur.sessions), safeDiv(prev.engagement_seconds, prev.sessions)] as [number | null, number | null],
    pagesPerSession: [safeDiv(cur.page_views, cur.sessions), safeDiv(prev.page_views, prev.sessions)] as [number | null, number | null],
    scrollRate: [safeDiv(cur.event_scroll, cur.page_views), safeDiv(prev.event_scroll, prev.page_views)] as [number | null, number | null],
    contacts: [(cur.event_generate_lead ?? 0) + (cur.event_contact_whatsapp ?? 0) + (cur.event_contact_call ?? 0),
      (prev.event_generate_lead ?? 0) + (prev.event_contact_whatsapp ?? 0) + (prev.event_contact_call ?? 0)] as [number, number],
  };

  const comparable = (prev.sessions ?? 0) >= MIN_COMPARE;
  const base = { hist, periodDays: p.days, comparable };
  const bounce = kpis.engagementRate[0] === null ? null : 1 - kpis.engagementRate[0];
  const contactMetrics = ["event_generate_lead", "event_contact_whatsapp", "event_contact_call"];
  const refs = {
    bounce: { industry: INDUSTRY.bounce(bounce), own: ownRef({ ...base, kind: "pct", current: bounce, previous: kpis.engagementRate[1] === null ? null : 1 - kpis.engagementRate[1], ratio: ["engaged_sessions", "sessions"], invert: true, higherIsBetter: false }) },
    avgTime: { industry: INDUSTRY.avgTime(), own: ownRef({ ...base, kind: "seconds", current: kpis.avgSeconds[0], previous: kpis.avgSeconds[1], ratio: ["engagement_seconds", "sessions"] }) },
    scroll: { industry: INDUSTRY.scroll(), own: ownRef({ ...base, kind: "pct", current: kpis.scrollRate[0], previous: kpis.scrollRate[1], ratio: ["event_scroll", "page_views"] }) },
    contacts: { industry: INDUSTRY.contactRate(safeDiv(kpis.contacts[0], cur.sessions)), own: ownRef({ ...base, kind: "count", current: kpis.contacts[0], previous: kpis.contacts[1], metrics: contactMetrics }) },
  };
  const insights = siteInsights({ kpis, pages, landings, speed, funnel, cur });
  return { kpis, pages, landings, speed, funnel, insights, comparable, refs, contactsDetail: { whatsapp: cur.event_contact_whatsapp ?? 0, call: cur.event_contact_call ?? 0, form: cur.event_generate_lead ?? 0 } };
}

function siteInsights(d: {
  kpis: Awaited<ReturnType<typeof loadSite>>["kpis"]; pages: PageStat[]; landings: LandingStat[]; speed: SpeedStat[];
  funnel: { step: string; value: number }[]; cur: Record<string, number>;
}): Insight[] {
  const out: Insight[] = [];
  const eng = d.kpis.engagementRate[0];
  if (eng !== null) {
    out.push(eng >= 0.55
      ? { tone: "good", anchor: "entradas", title: `El ${formatPct(eng, 0)} de las visitas interactúa con el sitio (bounce rate ${formatPct(1 - eng, 0)}).`, detail: "Arriba del promedio de la industria (52 %)." }
      : { tone: "bad", weight: 2, anchor: "entradas", title: `Bounce rate de ${formatPct(1 - eng, 0)}: esa parte de las visitas se va sin interactuar.`, detail: "Arriba del 45 % conviene revisar qué ven primero: mensaje, velocidad y si el anuncio promete lo mismo que la página." });
  }

  const sr = d.kpis.scrollRate[0];
  if (sr !== null) {
    out.push(sr >= 0.5
      ? { tone: "good", anchor: "paginas", title: `En el ${formatPct(sr, 0)} de las páginas vistas la gente llega casi hasta abajo.` }
      : { tone: "watch", weight: 2, anchor: "paginas", title: `Solo en el ${formatPct(sr, 0)} de las páginas vistas la gente llega hasta abajo.`, detail: "Lo que pongas al final (CTA, casos, contacto) casi nadie lo ve. Sube lo importante." });
  }

  const shallow = d.pages.filter((x) => x.views >= MIN_VIEWS && (x.scrollRate ?? 1) < 0.25);
  if (shallow.length) out.push({ tone: "watch", anchor: "paginas", title: `${shallow.length} páginas casi no se recorren: ${shallow.slice(0, 3).map((x) => x.key).join(", ")}.`, detail: "Revisa si el inicio de esas páginas engancha o si conviene acortarlas." });

  const bouncy = d.landings.filter((x) => x.sessions >= MIN_VIEWS && (x.bounceRate ?? 0) > 0.6);
  if (bouncy.length) out.push({ tone: "bad", weight: 2, anchor: "entradas", title: `La landing ${bouncy[0].key} tiene bounce rate de ${formatPct(bouncy[0].bounceRate ?? 0, 0)}.`, detail: "Es una puerta de entrada importante; vale la pena mejorar lo primero que se ve." });

  const [visits, contactPage, starts, leads] = d.funnel.map((f) => f.value);
  if (visits >= 50 && contactPage / visits < 0.05) out.push({ tone: "bad", weight: 3, anchor: "embudo", title: `Solo el ${formatPct(contactPage / visits, 1)} de las visitas llega a la página de contacto.`, detail: "El camino hacia «Let's work» no es claro. Agrega llamados a la acción en Home, servicios y casos." });
  if (starts > 0 && leads === 0) out.push({ tone: "watch", weight: 3, anchor: "embudo", title: `${formatNumber(starts)} personas empezaron el formulario y no se registró ningún envío.`, detail: "El evento de envío se acaba de agregar; si sigue en cero después de publicar, el formulario está perdiendo gente." });
  else if (starts > 0) out.push({ tone: leads / starts >= 0.3 ? "good" : "watch", anchor: "embudo", title: `${formatPct(leads / starts, 0)} de quienes empiezan el formulario lo terminan.` });

  const homeMobile = d.speed.find((s) => s.strategy === "Móvil" && s.path === "/");
  if (homeMobile?.lcp !== undefined) {
    out.push(homeMobile.lcp <= 2500
      ? { tone: "good", anchor: "velocidad", title: `La Home carga rápido en celular (${formatNumber(homeMobile.lcp / 1000, 1)} s).` }
      : { tone: "bad", weight: 3, anchor: "velocidad", title: `La Home tarda ${formatNumber(homeMobile.lcp / 1000, 1)} s en mostrar lo principal en celular.`, detail: "Google recomienda menos de 2.5 s. Con la mayoría de visitas en celular, es lo que más pesa: optimiza la imagen del hero y los scripts de terceros." });
  }
  return rankInsights(out);
}
