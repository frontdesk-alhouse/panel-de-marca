import { siteOrigin, targetQueries } from "@/lib/scorecard/config";
import { expectedCtr, isBrandQuery } from "@/lib/scorecard/inputs";
import { sitemapUrls } from "@/sources/competitors";
import { formatNumber, formatPct } from "@/lib/format";
import { breakdown, history, series, totals, type BreakdownRow } from "../query";
import { INDUSTRY, ownRef } from "../refs";
import { changeOf, rankInsights, safeDiv, type Insight } from "../insights";
import type { Period } from "../period";

const M = ["clicks", "impressions", "position_weighted"];
const STRIKING = { min: 8, max: 20, minImpr: 5 };

export type QueryFlag = "cerca" | "poco_clic" | "nueva" | "marca";

export interface SearchRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  prevImpressions: number;
  flags: QueryFlag[];
}

export interface PageRow extends SearchRow {
  /** La URL no está en el sitemap actual: probablemente del sitio anterior */
  outdated: boolean;
}

function toRow(r: BreakdownRow): SearchRow {
  const impressions = r.cur.impressions ?? 0;
  return {
    key: r.key,
    clicks: r.cur.clicks ?? 0,
    impressions,
    ctr: safeDiv(r.cur.clicks, impressions),
    position: safeDiv(r.cur.position_weighted, impressions),
    prevImpressions: r.prev.impressions ?? 0,
    flags: [],
  };
}

function flagQuery(row: SearchRow): SearchRow {
  const flags: QueryFlag[] = [];
  if (isBrandQuery(`query:${row.key}`)) flags.push("marca");
  if (row.position !== null && row.position >= STRIKING.min && row.position <= STRIKING.max && row.impressions >= STRIKING.minImpr) flags.push("cerca");
  if (row.position !== null && row.position <= 10 && row.impressions >= 20 && (row.ctr ?? 0) < expectedCtr(row.position) * 0.5) flags.push("poco_clic");
  if (row.prevImpressions === 0 && row.impressions > 0) flags.push("nueva");
  return { ...row, flags };
}

const normalize = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase();

export async function loadSeo(p: Period) {
  const [cur, prev, trend, queriesRaw, pagesRaw, devices, sitemap, hist] = await Promise.all([
    totals("gsc", M, p.current),
    totals("gsc", M, p.previous),
    series("gsc", ["clicks", "impressions"], p.current),
    breakdown("gsc", "query", M, p.current, p.previous),
    breakdown("gsc", "page", M, p.current, p.previous),
    breakdown("gsc", "device", M, p.current, p.previous),
    sitemapUrls(siteOrigin().replace(/^https?:\/\//, "")).catch(() => null),
    history("gsc", M, p.current),
  ]);

  const queries = queriesRaw.map(toRow).map(flagQuery).filter((q) => q.impressions > 0).sort((a, b) => b.impressions - a.impressions);
  const live = sitemap ? new Set(sitemap.map(normalize)) : null;
  const pages: PageRow[] = pagesRaw.map(toRow).filter((r) => r.impressions > 0)
    .map((r) => ({ ...r, outdated: live ? !live.has(normalize(r.key)) : false }))
    .sort((a, b) => b.impressions - a.impressions);

  const brand = queries.filter((q) => q.flags.includes("marca"));
  const nonBrand = queries.filter((q) => !q.flags.includes("marca"));
  const sum = (rows: SearchRow[], k: "clicks" | "impressions") => rows.reduce((a, r) => a + r[k], 0);
  const split = {
    brand: { clicks: sum(brand, "clicks"), impressions: sum(brand, "impressions") },
    nonBrand: { clicks: sum(nonBrand, "clicks"), impressions: sum(nonBrand, "impressions") },
  };

  const byQuery = new Map(queries.map((q) => [q.key.toLowerCase(), q]));
  const targets = targetQueries().map((t) => ({ query: t, row: byQuery.get(t) ?? null }));

  const kpis = {
    clicks: [cur.clicks, prev.clicks] as [number?, number?],
    impressions: [cur.impressions, prev.impressions] as [number?, number?],
    ctr: [safeDiv(cur.clicks, cur.impressions), safeDiv(prev.clicks, prev.impressions)] as [number | null, number | null],
    position: [safeDiv(cur.position_weighted, cur.impressions), safeDiv(prev.position_weighted, prev.impressions)] as [number | null, number | null],
  };

  const comparable = (prev.impressions ?? 0) >= 30;
  const base = { hist, periodDays: p.days, comparable };
  const refs = {
    clicks: { industry: null, own: ownRef({ ...base, kind: "count", current: cur.clicks ?? null, previous: prev.clicks, metric: "clicks" }) },
    impressions: { industry: null, own: ownRef({ ...base, kind: "count", current: cur.impressions ?? null, previous: prev.impressions, metric: "impressions" }) },
    ctr: { industry: INDUSTRY.ctr(kpis.ctr[0]), own: ownRef({ ...base, kind: "pct", current: kpis.ctr[0], previous: kpis.ctr[1], ratio: ["clicks", "impressions"] }) },
    position: { industry: INDUSTRY.position(kpis.position[0]), own: ownRef({ ...base, kind: "position", current: kpis.position[0], previous: kpis.position[1], ratio: ["position_weighted", "impressions"], higherIsBetter: false }) },
  };
  const insights = seoInsights({ split, queries, pages, targets, cur, prev });
  return { kpis, trend, queries, pages, devices, split, targets, insights, hasSitemap: Boolean(live), comparable, refs };
}

function seoInsights(d: {
  split: { brand: { clicks: number; impressions: number }; nonBrand: { clicks: number; impressions: number } };
  queries: SearchRow[]; pages: PageRow[]; targets: { query: string; row: SearchRow | null }[];
  cur: Record<string, number>; prev: Record<string, number>;
}): Insight[] {
  const out: Insight[] = [];
  const totalImpr = d.split.brand.impressions + d.split.nonBrand.impressions;
  if (totalImpr === 0) return [{ tone: "bad", weight: 3, anchor: "tendencia", title: "Google casi no muestra el sitio todavía.", detail: "Es normal en las primeras semanas de un sitio nuevo. Revisa que el sitemap esté enviado en Search Console." }];

  const nbShare = d.split.nonBrand.impressions / totalImpr;
  if (nbShare < 0.4) {
    out.push({ tone: "bad", weight: 3, anchor: "marca", title: `El ${formatPct(1 - nbShare, 0)} de las apariciones en Google son búsquedas de tu nombre.`,
      detail: "Te encuentra quien ya te conoce. Para que te encuentre quien busca el servicio, hacen falta páginas por servicio y nicho y contenido que responda esas búsquedas." });
  } else {
    out.push({ tone: "good", anchor: "marca", title: `El ${formatPct(nbShare, 0)} de las apariciones vienen de búsquedas que no son tu nombre.` });
  }

  const missing = d.targets.filter((t) => !t.row);
  if (missing.length) {
    out.push({ tone: "bad", weight: 3, anchor: "objetivo", title: `No apareces en ${missing.length} de ${d.targets.length} búsquedas objetivo.`,
      detail: `Por ejemplo: «${missing.slice(0, 3).map((t) => t.query).join("», «")}». Cada una necesita una página que la responda.` });
  }

  const near = d.queries.filter((q) => q.flags.includes("cerca"));
  if (near.length) {
    out.push({ tone: "watch", weight: 2, anchor: "busquedas", title: `${near.length} búsquedas están cerca de la primera página (posición 8 a 20).`,
      detail: `Son las más baratas de subir: mejorar el texto de la página, el título y los enlaces internos. Empieza por «${near[0].key}».` });
  }

  const lowCtr = d.queries.filter((q) => q.flags.includes("poco_clic"));
  if (lowCtr.length) {
    out.push({ tone: "watch", weight: 2, anchor: "busquedas", title: `${lowCtr.length} búsquedas te muestran arriba pero casi nadie da clic.`,
      detail: "El título y la descripción que ve Google no convencen. Reescríbelos con el beneficio y la ciudad." });
  }

  const outdated = d.pages.filter((p) => p.outdated);
  if (outdated.length) {
    out.push({ tone: "bad", weight: 2, anchor: "paginas", title: `${outdated.length} URLs del sitio anterior siguen apareciendo en Google.`,
      detail: `Ejemplo: ${outdated[0].key.replace(/^https?:\/\//, "")}. Si ya no existen, redirígelas a la página nueva equivalente para no perder ese tráfico.` });
  }

  const ch = changeOf(d.cur.impressions, d.prev.impressions, 50);
  if (ch !== null) out.push({ tone: ch >= 0.1 ? "good" : ch <= -0.1 ? "bad" : "watch", anchor: "tendencia", title: `Las apariciones en Google ${ch >= 0 ? "subieron" : "bajaron"} ${formatPct(Math.abs(ch), 0)}.` });

  const fresh = d.queries.filter((q) => q.flags.includes("nueva") && !q.flags.includes("marca"));
  if (fresh.length) out.push({ tone: "good", anchor: "busquedas", title: `${fresh.length} búsquedas nuevas empezaron a mostrarte.`, detail: `Por ejemplo «${fresh[0].key}» (${formatNumber(fresh[0].impressions)} apariciones).` });
  return rankInsights(out);
}
