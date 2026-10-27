import { brandTerms, competitors, keyPaths, targetQueries } from "@/lib/scorecard/config";
import { ws } from "@/lib/workspace/store";
import { daysBetween, eachDay, type DateRange } from "@/lib/dates";
import type { MetricRow, Source } from "./types";
import type { SourceId } from "./contract";

/**
 * Fuente de prueba: genera datos verosímiles bajo los nombres reales de las
 * fuentes, marcados con meta.mock = true para poder borrarlos. Deliberadamente
 * NO genera Google Business Profile, para que la cobertura parcial se vea.
 */

function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h += 0x6d2b79f5;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entero alrededor de `mean` con ±40 % de ruido determinista. */
function around(mean: number, key: string): number {
  return Math.max(0, Math.round(mean * (0.6 + 0.8 * seeded(key))));
}

const MOCK = { mock: true };
/** Día 0 de la serie de prueba; las campañas simuladas arrancan el día 55. */
const MOCK_EPOCH = "2026-07-25";

const CHANNELS: [string, number, number][] = [
  // canal, sesiones/día, tasa de conversión
  ["Organic Search", 14, 0.03], ["Direct", 10, 0.04], ["Paid Search", 10, 0.035],
  ["Paid Social", 4, 0.01], ["Referral", 2, 0.05],
];

/** búsqueda, impresiones/día, CTR, posición: dos de marca y las búsquedas objetivo de la configuración. */
function queries(): [string, number, number, number][] {
  const brand = brandTerms()[0];
  const city = ws().brand.city.toLowerCase();
  const shapes: [number, number, number][] = [[25, 0.025, 8], [40, 0.008, 14], [10, 0.04, 6], [15, 0.03, 9]];
  return [
    [brand, 8, 0.55, 1.2], [`${brand} ${city}`, 3, 0.5, 1.4],
    ...targetQueries().slice(0, shapes.length).map((q, i): [string, number, number, number] => [q, ...shapes[i]]),
  ];
}

function dayRows(date: string, dayIndex: number): MetricRow[] {
  const rows: MetricRow[] = [];
  const add = (source: SourceId, metric: string, dimKey: string, value: number) =>
    rows.push({ source, metric, dimKey, date, value, meta: MOCK });

  // GA4
  let sessions = 0, engaged = 0, events = 0;
  for (const [channel, mean, cr] of CHANNELS) {
    const s = around(mean, `${date}ga4${channel}`);
    const e = Math.max(0, Math.round(s * cr + seeded(`${date}ev${channel}`) - 0.5));
    const g = Math.round(s * 0.52);
    add("ga4", "sessions", `channel:${channel}`, s);
    add("ga4", "key_events", `channel:${channel}`, e);
    add("ga4", "engaged_sessions", `channel:${channel}`, g);
    sessions += s; engaged += g; events += e;
  }
  add("ga4", "sessions", "", sessions);
  add("ga4", "engaged_sessions", "", engaged);
  add("ga4", "key_events", "", events);

  // Search Console
  let clicks = 0, impressions = 0;
  for (const [q, imprMean, ctr, pos] of queries()) {
    const impr = around(imprMean * (1 + dayIndex / 300), `${date}gsc${q}`);
    const c = Math.max(0, Math.round(impr * ctr + seeded(`${date}gscc${q}`) - 0.5));
    add("gsc", "impressions", `query:${q}`, impr);
    add("gsc", "clicks", `query:${q}`, c);
    add("gsc", "position_weighted", `query:${q}`, impr * pos);
    clicks += c; impressions += impr;
  }
  add("gsc", "impressions", "", impressions);
  add("gsc", "clicks", "", clicks);

  // Google Ads y Meta (las campañas solo existen los últimos 35 días)
  if (dayIndex >= 55) {
    const impr = around(120, `${date}gads`);
    const c = around(6, `${date}gadsc`);
    add("gads", "impressions", "", impr);
    add("gads", "clicks", "", c);
    add("gads", "cost_mxn", "", c * 27);
    add("gads", "conversions", "", seeded(`${date}gadsv`) < 0.22 ? 1 : 0);
    const conv = seeded(`${date}gadsv`) < 0.22 ? 1 : 0;
    add("gads", "clicks", "campaign:Branding GDL", Math.round(c * 0.6)); add("gads", "cost_mxn", "campaign:Branding GDL", Math.round(c * 0.6) * 27);
    add("gads", "conversions", "campaign:Branding GDL", conv); add("gads", "impressions", "campaign:Branding GDL", Math.round(impr * 0.6));
    add("gads", "clicks", "campaign:Web GDL", c - Math.round(c * 0.6)); add("gads", "cost_mxn", "campaign:Web GDL", (c - Math.round(c * 0.6)) * 27);
    add("gads", "conversions", "campaign:Web GDL", 0); add("gads", "impressions", "campaign:Web GDL", impr - Math.round(impr * 0.6));
    add("gads", "impression_share", "campaign:Branding GDL", 0.32); add("gads", "impression_share", "campaign:Web GDL", 0.55);
    for (const [term, k] of [["branding guadalajara", 2], ["logo gratis", 1], ["diseño web barato", 1], ["agencia de branding", 1]] as const) {
      add("gads", "clicks", `term:${term}`, k); add("gads", "cost_mxn", `term:${term}`, k * 27);
      add("gads", "conversions", `term:${term}`, term === "branding guadalajara" ? conv : 0);
    }
    add("gads", "qs_weighted", "", impr * 6);
    add("gads", "qs_impressions", "", impr);
    add("gads", "brand_impression_share", "", 0.7);
    const mi = around(900, `${date}meta`);
    add("meta", "impressions", "", mi);
    add("meta", "clicks", "", around(12, `${date}metac`));
    add("meta", "spend_mxn", "", 120);
    add("meta", "leads", "", seeded(`${date}metal`) < 0.25 ? 1 : 0);
    add("meta", "frequency_28d", "", 2.6);
  }

  // Instagram
  add("instagram", "followers", "", 1850 + dayIndex);
  if (dayIndex % 3 === 0) {
    add("instagram", "posts", "", 1);
    add("instagram", "post_interactions", "", around(55, `${date}igi`));
    add("instagram", "post_reach", "", around(600, `${date}igr`));
  }

  // Clarity
  const cs = around(35, `${date}clarity`);
  add("clarity", "sessions", "", cs);
  add("clarity", "rage_sessions", "", around(1, `${date}rage`));
  add("clarity", "dead_sessions", "", around(4, `${date}dead`));
  add("clarity", "quickback_sessions", "", around(3, `${date}qb`));
  add("clarity", "scroll_weighted", "", cs * 0.45);

  // PageSpeed (instantánea diaria)
  for (const path of keyPaths()) {
    add("psi", "lcp_ms", `mobile:${path}`, 2800);
    add("psi", "inp_ms", `mobile:${path}`, 180);
    add("psi", "cls", `mobile:${path}`, 0.04);
    add("psi", "lighthouse_seo", `mobile:${path}`, 92);
    add("psi", "lighthouse_a11y", `mobile:${path}`, 86);
  }
  add("psi", "lighthouse_performance", "mobile:/", Math.min(90, 30 + dayIndex * 0.4));
  if (dayIndex >= 55) {
    rows.push({ source: "gads", metric: "campaign_info", dimKey: "campaign:Branding GDL", date, value: 200, meta: { mock: true, status: "ENABLED", reasons: [], bidding: "MAXIMIZE_CONVERSIONS", startDate: "2026-09-18" } });
    rows.push({ source: "gads", metric: "campaign_info", dimKey: "campaign:Web GDL", date, value: 200, meta: { mock: true, status: "ENABLED", reasons: [], bidding: "MAXIMIZE_CLICKS", startDate: "2026-09-18" } });
  }

  // Competencia: velocidad cada 4 días y posiciones en Google cada 3 (el sitio propio sube con el tiempo).
  if (dayIndex % 4 === 0) {
    for (const c of competitors()) {
      const dim = `site:${c.domain}`;
      const grow = c.self ? dayIndex : 0;
      if (!c.self) add("comp", "perf", dim, around(60, `${date}${c.domain}perf`));
      add("comp", "sitemap_urls", dim, c.self ? 12 + grow : around(80, c.domain));
      add("comp", "blog_urls", dim, c.self ? Math.floor(grow / 7) : around(30, `${c.domain}b`));
      add("comp", "service_urls", dim, c.self ? Math.min(12, Math.floor(grow / 8)) : around(5, `${c.domain}s`));
      add("comp", "fresh_days", dim, around(40, `${date}${c.domain}f`));
      for (const m of ["has_https", "has_sitemap", "indexable", "has_meta_description"]) add("comp", m, dim, 1);
      add("comp", "has_canonical", dim, seeded(`${c.domain}can`) > 0.4 ? 1 : 0);
      add("comp", "has_schema", dim, c.self || seeded(`${c.domain}sch`) > 0.5 ? 1 : 0);
      add("comp", "title_keyword", dim, seeded(`${c.domain}tk`) > 0.3 ? 1 : 0);
      add("comp", "h1_count", dim, 1);
      add("comp", "trust_pages", dim, Math.round(seeded(`${c.domain}tr`) * 3));
    }
  }
  if (dayIndex % 28 === 0) {
    for (const c of competitors()) {
      const dim = `site:${c.domain}`;
      add("links", "ref_domains", dim, c.self ? 1 + dayIndex : around(60, `${c.domain}rd`));
      add("links", "domain_score", dim, c.self ? 2 + dayIndex / 10 : around(20, `${c.domain}ds`));
      const found = c.self ? (dayIndex >= 56 ? 1 : 0) : seeded(`${c.domain}gbp`) > 0.3 ? 1 : 0;
      add("maps", "gbp_found", dim, found);
      if (found) { add("maps", "gbp_rating", dim, 4.5 + seeded(c.domain) * 0.5); add("maps", "gbp_reviews", dim, c.self ? 6 : around(25, `${c.domain}rv`)); }
    }
  }
  if (dayIndex % 3 === 0) {
    for (const q of targetQueries()) {
      add("serp", "checked", `q:${q}`, 1);
      for (const c of competitors()) {
        const base = c.self ? Math.max(2, 40 - dayIndex * 0.35) : 4 + seeded(`${q}${c.domain}`) * 40;
        const pos = Math.round(base + (seeded(`${date}${q}${c.domain}`) - 0.5) * 6);
        if (pos >= 1 && pos <= 30) add("serp", "position", `q:${q}|site:${c.domain}`, pos);
      }
    }
  }
  return rows;
}

export const mockSource: Source = {
  id: "mock",
  label: "Datos de prueba",
  isConfigured: () => process.env.ENABLE_MOCK_SOURCE === "1",
  async fetchDaily(range: DateRange) {
    // Índice fijo por fecha: resincronizar un rango corto da los mismos valores.
    return eachDay(range).flatMap((date) => dayRows(date, daysBetween(MOCK_EPOCH, date)));
  },
};

export interface MockLead {
  externalId: string;
  daysAgo: number;
  channel: "organico" | "ads" | "meta" | "directo" | "referido";
  stage: "nuevo" | "calificado" | "propuesta" | "cerrado" | "perdido";
  qualified: boolean | null;
  responseMinutes: number | null;
  package: "basico" | "completo" | "premium" | null;
}

export const MOCK_LEADS: MockLead[] = [
  { externalId: "mock-1", daysAgo: 80, channel: "referido", stage: "cerrado", qualified: true, responseMinutes: 15, package: "completo" },
  { externalId: "mock-2", daysAgo: 66, channel: "organico", stage: "perdido", qualified: true, responseMinutes: 90, package: null },
  { externalId: "mock-3", daysAgo: 51, channel: "directo", stage: "propuesta", qualified: true, responseMinutes: 40, package: null },
  { externalId: "mock-4", daysAgo: 33, channel: "ads", stage: "perdido", qualified: false, responseMinutes: 180, package: null },
  { externalId: "mock-5", daysAgo: 27, channel: "ads", stage: "cerrado", qualified: true, responseMinutes: 8, package: "basico" },
  { externalId: "mock-6", daysAgo: 20, channel: "meta", stage: "perdido", qualified: false, responseMinutes: 300, package: null },
  { externalId: "mock-7", daysAgo: 14, channel: "organico", stage: "calificado", qualified: true, responseMinutes: 25, package: null },
  { externalId: "mock-8", daysAgo: 9, channel: "ads", stage: "nuevo", qualified: null, responseMinutes: 55, package: null },
  { externalId: "mock-9", daysAgo: 4, channel: "meta", stage: "nuevo", qualified: false, responseMinutes: null, package: null },
  { externalId: "mock-10", daysAgo: 2, channel: "organico", stage: "nuevo", qualified: null, responseMinutes: null, package: null },
];
