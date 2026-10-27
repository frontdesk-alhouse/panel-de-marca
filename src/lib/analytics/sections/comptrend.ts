import { ws } from "@/lib/workspace/store";
import { competitors, targetQueries } from "@/lib/scorecard/config";
import type { Competitor } from "@/lib/workspace/schema";
import { addDays, todayIso } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { snapshots, snapshotsWithMeta } from "../query";
import { asOf, positioningScore, timelineDates, type Snap } from "../compscore";
import { FACTORS, factorScores, seoStrength, type SiteSignals } from "../seofactors";
import { pointValue, type TrendKind, type TrendPoint, type TrendSeries, type QueryRow } from "./comptrend-shared";
import { rankInsights, type Insight } from "../insights";
import type { SerpTop } from "@/sources/serp";

export const TREND_PERIODS = { semana: 7, mes: 30, trimestre: 90 } as const;
export type TrendPeriod = keyof typeof TREND_PERIODS;

export { pointValue, type TrendKind, type TrendPoint, type TrendSeries, type QueryRow };

const site = (domain: string) => `site:${domain}`;

/** Métrica guardada → campo de SiteSignals. */
const SIGNAL_METRICS: Record<string, { source: string; field: keyof SiteSignals }> = {
  sitemap_urls: { source: "comp", field: "pages" }, blog_urls: { source: "comp", field: "blog" },
  service_urls: { source: "comp", field: "service" }, fresh_days: { source: "comp", field: "freshDays" },
  has_https: { source: "comp", field: "https" }, has_sitemap: { source: "comp", field: "sitemap" },
  indexable: { source: "comp", field: "indexable" }, has_canonical: { source: "comp", field: "canonical" },
  has_meta_description: { source: "comp", field: "metaDescription" }, has_schema: { source: "comp", field: "schema" },
  h1_count: { source: "comp", field: "h1" }, title_keyword: { source: "comp", field: "titleKeyword" },
  trust_pages: { source: "comp", field: "trustPages" }, perf: { source: "comp", field: "perf" },
  ref_domains: { source: "links", field: "refDomains" }, domain_score: { source: "links", field: "domainScore" },
  gbp_found: { source: "maps", field: "gbpFound" }, gbp_rating: { source: "maps", field: "gbpRating" }, gbp_reviews: { source: "maps", field: "gbpReviews" },
};

const metricsOf = (source: string) => Object.entries(SIGNAL_METRICS).filter(([, v]) => v.source === source).map(([k]) => k);

/**
 * Evolución de la fuerza SEO y la visibilidad de cada estudio en el periodo, más
 * la matriz «quién aparece en tus búsquedas objetivo» de la última medición.
 */
export async function loadCompetitorTrend(period: TrendPeriod) {
  const today = todayIso();
  const from = addDays(today, -TREND_PERIODS[period]);
  const sites = competitors().map((c) => site(c.domain));
  const [comp, links, maps, psi, positions, checked] = await Promise.all([
    snapshots("comp", metricsOf("comp"), sites),
    snapshots("links", metricsOf("links"), sites),
    snapshots("maps", metricsOf("maps"), sites),
    snapshots("psi", ["lighthouse_performance"], ["mobile:/"]),
    snapshots("serp", ["position"], targetQueries().flatMap((q) => competitors().map((c) => `q:${q}|${site(c.domain)}`))),
    snapshotsWithMeta("serp", "checked", targetQueries().map((q) => `q:${q}`)),
  ]);
  const raw = [...comp, ...links, ...maps];
  const serpRuns = [...new Set(checked.map((r) => r.date))].sort();

  const listsFor = (c: Competitor) => {
    const lists = new Map<keyof SiteSignals, Snap[]>();
    for (const [metric, { field }] of Object.entries(SIGNAL_METRICS)) {
      lists.set(field, raw.filter((r) => r.dimKey === site(c.domain) && r.metric === metric).map(({ date, value }) => ({ date, value })));
    }
    // El sitio propio toma su velocidad de la medición diaria de PageSpeed.
    if (c.self) lists.set("perf", psi.map(({ date, value }) => ({ date, value })));
    return lists;
  };

  const visibilityAt = (domain: string, date: string): number | null => {
    const run = [...serpRuns].reverse().find((d) => d <= date);
    if (!run) return null;
    const queries = checked.filter((r) => r.date === run).map((r) => r.dimKey.slice(2));
    return positioningScore(queries.map((q) => positions.find((p) => p.date === run && p.dimKey === `q:${q}|${site(domain)}`)?.value));
  };

  const dates = timelineDates([...raw.map((r) => r.date), ...psi.map((r) => r.date), ...serpRuns], from, today);

  const series: TrendSeries[] = competitors().map((c) => {
    const lists = listsFor(c);
    const points = dates.map((date): TrendPoint => {
      const signals: SiteSignals = {};
      for (const [field, list] of lists) {
        const v = asOf(list, date)?.value;
        if (v !== undefined) signals[field] = v;
      }
      const factors = factorScores(signals);
      const { score, coverage } = seoStrength(factors);
      return { date, strength: score, coverage, visibility: visibilityAt(c.domain, date), factors };
    });
    return { name: c.name, domain: c.domain, self: Boolean(c.self), points, start: points[0] ?? null, current: points.at(-1) ?? null };
  });

  const lastRun = serpRuns.at(-1);
  const queries: QueryRow[] = lastRun
    ? checked.filter((r) => r.date === lastRun).map((r) => {
      const q = r.dimKey.slice(2);
      const bySite = Object.fromEntries(competitors().map((c) => [c.domain, positions.find((p) => p.date === lastRun && p.dimKey === `q:${q}|${site(c.domain)}`)?.value ?? null]));
      return { query: q, date: lastRun, top: ((r.meta?.top as SerpTop[] | undefined) ?? []), bySite };
    })
    : [];

  return { dates, series, queries, serpDate: lastRun ?? null, insights: trendInsights(series, queries) };
}

function rankBy(series: TrendSeries[], kind: TrendKind) {
  return series.filter((s) => pointValue(s.current, kind) !== null).sort((a, b) => (pointValue(b.current, kind) ?? 0) - (pointValue(a.current, kind) ?? 0));
}

function trendInsights(series: TrendSeries[], queries: QueryRow[]): Insight[] {
  const out: Insight[] = [];
  const self = series.find((s) => s.self);
  if (!self?.current) return out;

  const ranked = rankBy(series, "strength");
  const place = ranked.findIndex((s) => s.self);
  if (place >= 0 && ranked.length > 2) {
    const leader = ranked[0];
    out.push(place === 0
      ? { tone: "good", anchor: "evolucion", title: `Tienes la mayor fuerza SEO de las ${ranked.length} marcas medidas (${formatNumber(self.current.strength ?? 0)}).` }
      : { tone: place > ranked.length / 2 ? "bad" : "watch", weight: 3, anchor: "evolucion",
        title: `En fuerza SEO quedas ${place + 1} de ${ranked.length}: ${formatNumber(self.current.strength ?? 0)} contra ${formatNumber(leader.current!.strength ?? 0)} de ${leader.name}.` });

    // La brecha que más pesa: diferencia con el líder × peso del factor.
    if (place > 0) {
      const gaps = FACTORS.map((f) => {
        const mine = self.current!.factors[f.key], theirs = leader.current!.factors[f.key];
        return { f, gap: mine !== null && theirs !== null ? (theirs - mine) * f.weight : 0, mine, theirs };
      }).sort((a, b) => b.gap - a.gap);
      const top = gaps[0];
      if (top && top.gap > 0) out.push({ tone: "bad", weight: 3, anchor: "factores",
        title: `Tu mayor brecha contra ${leader.name} está en ${top.f.label.toLowerCase()}: ${formatNumber(top.mine ?? 0)} contra ${formatNumber(top.theirs ?? 0)}.`,
        detail: `Es el factor que más mueve tu calificación (pesa ${top.f.weight} de 100).` });
    }
  }

  const s = self.start?.strength, c = self.current.strength;
  if (s !== null && s !== undefined && c !== null && c !== undefined && self.start?.date !== self.current.date) {
    const diff = c - s;
    if (Math.abs(diff) >= 2) out.push({ tone: diff > 0 ? "good" : "bad", anchor: "evolucion", title: `Tu fuerza SEO ${diff > 0 ? "subió" : "bajó"} ${formatNumber(Math.abs(diff))} puntos en el periodo.` });
  }

  if (self.current.factors.local === 0) out.push({ tone: "bad", weight: 3, anchor: "factores", title: `Google Maps no muestra un perfil de ${ws().brand.name} con tu sitio web.`,
    detail: "En búsquedas con ciudad, Google arma el mapa con perfiles de negocio. Sin perfil verificado no entras al mapa." });

  if (queries.length) {
    const own = competitors().find((x) => x.self)!.domain;
    const found = queries.filter((q) => q.bySite[own] !== null).length;
    out.push(found === 0
      ? { tone: "bad", weight: 3, anchor: "busquedas", title: `No apareces en el top 30 de Google en ninguna de tus ${queries.length} búsquedas objetivo.`,
        detail: `Quien busca ${queries.slice(0, 2).map((q) => `«${q.query}»`).join(" o ")} encuentra a otros. Páginas por servicio y ciudad, más artículos, son la forma de entrar.` }
      : { tone: found >= queries.length / 2 ? "good" : "watch", anchor: "busquedas", title: `Apareces en el top 30 en ${found} de ${queries.length} búsquedas objetivo.` });
    const rivals = competitors().filter((x) => !x.self).map((x) => ({ name: x.name, n: queries.filter((q) => (q.bySite[x.domain] ?? 99) <= 10).length })).sort((a, b) => b.n - a.n);
    if (rivals[0]?.n) out.push({ tone: "watch", anchor: "busquedas", title: `${rivals[0].name} sale en la primera página en ${rivals[0].n} de tus búsquedas objetivo.` });
  }
  return rankInsights(out);
}
