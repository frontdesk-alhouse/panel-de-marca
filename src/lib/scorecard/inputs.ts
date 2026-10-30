import { brandTerms, ownTargets } from "./config";
import { PAID_CHANNELS } from "@/sources/contract";
import { delta, pick, ratio, sum, type AggRow, type LeadLite, type RawWindows } from "./raw";
import type { MetricInput } from "./types";

type Inputs = Record<string, MetricInput>;

const isQuery = (k: string) => k.startsWith("query:");
export const isBrandQuery = (k: string) =>
  isQuery(k) && brandTerms().some((t) => k.slice(6).toLowerCase().includes(t));
const isNonBrandQuery = (k: string) => isQuery(k) && !isBrandQuery(k);

/** CTR orgánico esperado por posición (punto medio conservador de los estudios 2026). */
export function expectedCtr(position: number): number {
  if (position <= 1.5) return 0.28;
  if (position <= 2.5) return 0.15;
  if (position <= 3.5) return 0.085;
  if (position <= 10.5) return 0.04;
  return 0.01;
}

function input(value: number | null, sample?: number): MetricInput {
  return { value, sample };
}

function queryStats(rows: AggRow[], match: (k: string) => boolean) {
  const byQuery = new Map<string, { clicks: number; impressions: number; pw: number }>();
  for (const r of rows) {
    if (r.source !== "gsc" || !match(r.dimKey)) continue;
    const q = byQuery.get(r.dimKey) ?? { clicks: 0, impressions: 0, pw: 0 };
    if (r.metric === "clicks") q.clicks += r.value;
    else if (r.metric === "impressions") q.impressions += r.value;
    else if (r.metric === "position_weighted") q.pw += r.value;
    byQuery.set(r.dimKey, q);
  }
  return [...byQuery.values()].filter((q) => q.impressions > 0).map((q) => ({ ...q, position: q.pw / q.impressions }));
}

function visibility(w: RawWindows, out: Inputs) {
  const brand = queryStats(w.current, isBrandQuery);
  const brandImpr = brand.reduce((a, q) => a + q.impressions, 0);
  const brandClicks = brand.reduce((a, q) => a + q.clicks, 0);
  const brandPw = brand.reduce((a, q) => a + q.pw, 0);
  out.brand_ctr = input(brand.length ? brandClicks / brandImpr : null, brandImpr);
  out.brand_position = input(brand.length ? brandPw / brandImpr : null, brandImpr);

  const nonBrand = queryStats(w.current, isNonBrandQuery);
  const top10 = nonBrand.filter((q) => q.position <= 10.5);
  const expected = top10.reduce((a, q) => a + q.impressions * expectedCtr(q.position), 0);
  const actual = top10.reduce((a, q) => a + q.clicks, 0);
  out.nonbrand_ctr_vs_expected = input(expected > 0 ? actual / expected : null, top10.reduce((a, q) => a + q.impressions, 0));
  out.nonbrand_top10_queries = input(nonBrand.length || pick(w.current, "gsc", "impressions").length ? top10.length : null);
  // En los deltas la muestra es el periodo previo: un % sobre una base diminuta no dice nada.
  const prevNonBrand = sum(w.previous, "gsc", "impressions", isNonBrandQuery);
  out.nonbrand_impressions_delta = input(delta(sum(w.current, "gsc", "impressions", isNonBrandQuery), prevNonBrand), prevNonBrand ?? 0);
  const prevBrand = sum(w.previous, "gsc", "impressions", isBrandQuery);
  out.brand_impressions_delta = input(delta(sum(w.current, "gsc", "impressions", isBrandQuery), prevBrand), prevBrand ?? 0);

  const views = sum(w.current, "gbp", "views");
  const actions = ["calls", "website_clicks", "directions"]
    .map((m) => sum(w.current, "gbp", m))
    .reduce<number | null>((a, v) => (v === null ? a : (a ?? 0) + v), null);
  out.gbp_action_rate = input(ratio(actions, views), views ?? 0);
}

/**
 * Con visitas pero cero eventos clave en todo el periodo, lo más probable es que
 * el envío del formulario no se esté midiendo: no se califica como 0 %.
 */
export function isLeadTrackingMissing(w: RawWindows): boolean {
  const sessions = sum(w.current, "ga4", "sessions") ?? 0;
  return sessions >= 100 && (sum(w.current, "ga4", "key_events") ?? 0) === 0;
}

function conversion(w: RawWindows, out: Inputs) {
  const sessions = sum(w.current, "ga4", "sessions");
  const ch = (c: string) => `channel:${c}`;
  const organic = sum(w.current, "ga4", "sessions", ch("Organic Search"));
  const paid = sum(w.current, "ga4", "sessions", ch("Paid Search"));
  if (isLeadTrackingMissing(w)) {
    for (const [id, n] of [["site_conversion", sessions], ["organic_conversion", organic], ["paid_conversion", paid]] as const) {
      out[id] = { value: null, sample: n ?? 0, status: "not_tracked" };
    }
    return;
  }
  out.site_conversion = input(ratio(sum(w.current, "ga4", "key_events"), sessions), sessions ?? 0);
  out.organic_conversion = input(ratio(sum(w.current, "ga4", "key_events", ch("Organic Search")), organic), organic ?? 0);
  out.paid_conversion = input(ratio(sum(w.current, "ga4", "key_events", ch("Paid Search")), paid), paid ?? 0);
}

function closedLeads(leads: LeadLite[]) {
  return leads.filter((l) => l.stage === "cerrado");
}

function investment(w: RawWindows, leads: LeadLite[], out: Inputs) {
  const impr = sum(w.current, "gads", "impressions");
  const clicks = sum(w.current, "gads", "clicks");
  const conv = sum(w.current, "gads", "conversions");
  out.ads_ctr = input(ratio(clicks, impr), impr ?? 0);
  out.ads_cvr = input(ratio(conv, clicks), clicks ?? 0);
  const qsImpr = sum(w.current, "gads", "qs_impressions");
  out.ads_quality_score = input(ratio(sum(w.current, "gads", "qs_weighted"), qsImpr), qsImpr ?? 0);
  out.ads_brand_impression_share = input(sum(w.latest, "gads", "brand_impression_share"));

  const spend = (rows: AggRow[]) => {
    const a = sum(rows, "gads", "cost_mxn");
    const b = sum(rows, "meta", "spend_mxn");
    return a === null && b === null ? null : (a ?? 0) + (b ?? 0);
  };
  const paidLeads = (conv ?? 0) + (sum(w.current, "meta", "leads") ?? 0);
  const cpl = ratio(spend(w.current), paidLeads || null);
  const cplTarget = ownTargets().cplTargetMxn;
  out.cpl_vs_target = cplTarget
    ? input(cpl === null ? null : cpl / cplTarget, paidLeads)
    : { value: null, sample: paidLeads, status: "no_reference" };

  const metaImpr = sum(w.current, "meta", "impressions");
  out.meta_ctr = input(ratio(sum(w.current, "meta", "clicks"), metaImpr), metaImpr ?? 0);
  out.meta_frequency = input(sum(w.latest, "meta", "frequency_28d"));

  const closes = closedLeads(leads);
  const pipelineSpend = spend(w.pipeline);
  if (!closes.length || pipelineSpend === null) {
    out.cac_vs_ticket = input(null, closes.length);
  } else {
    const tickets = closes.map((l) => l.value ?? (l.package ? ownTargets().ticketByPackageMxn[l.package] : null));
    const known = tickets.filter((t): t is number => typeof t === "number" && t > 0);
    out.cac_vs_ticket = known.length
      ? input(pipelineSpend / closes.length / (known.reduce((a, t) => a + t, 0) / known.length), closes.length)
      : { value: null, sample: closes.length, status: "no_reference" };
  }
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function pipeline(leads: LeadLite[], out: Inputs) {
  const responses = leads
    .filter((l) => l.firstContactAt)
    .map((l) => ((l.firstContactAt as Date).getTime() - l.createdAt.getTime()) / 60_000)
    .filter((m) => m >= 0);
  out.speed_to_lead = input(median(responses), responses.length);

  const decided = leads.filter((l) => l.qualified !== null);
  out.lead_qualified_rate = input(
    decided.length ? decided.filter((l) => l.qualified).length / decided.length : null, decided.length,
  );

  const resolved = leads.filter((l) => l.proposalAt && (l.stage === "cerrado" || l.stage === "perdido"));
  out.proposal_close_rate = input(
    resolved.length ? resolved.filter((l) => l.stage === "cerrado").length / resolved.length : null, resolved.length,
  );
}

function acquisition(w: RawWindows, out: Inputs) {
  const sessions = sum(w.current, "ga4", "sessions");
  const prevSessions = sum(w.previous, "ga4", "sessions");
  out.sessions_delta = input(delta(sessions, prevSessions), prevSessions ?? 0);
  out.engagement_rate = input(ratio(sum(w.current, "ga4", "engaged_sessions"), sessions), sessions ?? 0);
  const paid = sum(w.current, "ga4", "sessions", (k) => k.startsWith("channel:") && PAID_CHANNELS.has(k.slice(8)));
  out.non_paid_share = input(sessions ? 1 - (paid ?? 0) / sessions : null, sessions ?? 0);
}

function brand(w: RawWindows, out: Inputs) {
  const followers = sum(w.latest, "instagram", "followers");
  const posts = sum(w.current, "instagram", "posts");
  const perPost = (m: string) => ratio(ratio(sum(w.current, "instagram", m), posts), followers);
  out.ig_engagement_rate = input(perPost("post_interactions"), posts ?? 0);
  out.ig_reach_rate = input(perPost("post_reach"), posts ?? 0);
  const prevFollowers = sum(w.latestAtPreviousEnd, "instagram", "followers");
  out.ig_follower_growth = input(delta(followers, prevFollowers), prevFollowers ?? 0);
}

const CWV_LIMITS: Record<string, [number, number]> = { lcp_ms: [2500, 4000], inp_ms: [200, 500], cls: [0.1, 0.25] };

function experience(w: RawWindows, out: Inputs) {
  let worst: number | null = null;
  for (const [metric, [good, poor]] of Object.entries(CWV_LIMITS)) {
    for (const r of pick(w.latest, "psi", metric, (k) => k.startsWith("mobile:"))) {
      const status = r.value <= good ? 0 : r.value <= poor ? 1 : 2;
      worst = Math.max(worst ?? 0, status);
    }
  }
  out.cwv_status = input(worst);
  const avgLatest = (metric: string) => {
    const rows = pick(w.latest, "psi", metric, (k) => k.startsWith("mobile:"));
    return rows.length ? rows.reduce((a, r) => a + r.value, 0) / rows.length : null;
  };
  out.lighthouse_seo = input(avgLatest("lighthouse_seo"));
  out.lighthouse_a11y = input(avgLatest("lighthouse_a11y"));

  const sessions = sum(w.current, "clarity", "sessions");
  const vsBench = (metric: string, bench: number | null): MetricInput => {
    const rate = ratio(sum(w.current, "clarity", metric), sessions);
    if (rate === null) return input(null, sessions ?? 0);
    return bench ? input(rate / bench, sessions ?? 0) : { value: null, sample: sessions ?? 0, status: "no_reference" };
  };
  const b = ownTargets().clarityBenchmark;
  out.clarity_rage_vs_benchmark = vsBench("rage_sessions", b.rageClicks);
  out.clarity_dead_vs_benchmark = vsBench("dead_sessions", b.deadClicks);
  out.clarity_quickback_vs_benchmark = vsBench("quickback_sessions", b.quickBacks);
  out.scroll_depth = input(ratio(sum(w.current, "clarity", "scroll_weighted"), sessions), sessions ?? 0);
}

/** Convierte agregados crudos + leads en el valor de cada métrica del marco. */
/** Lo que no sale de metric_daily: la bitácora de citación y el último chequeo GEO. */
export interface ExtraInputs {
  geo?: { ok: number; total: number } | null;
  citations?: { k: number; n: number } | null;
}

export function buildInputs(windows: RawWindows, pipelineLeads: LeadLite[], extras: ExtraInputs = {}): Inputs {
  const out: Inputs = {};
  out.geo_tecnico = input(extras.geo && extras.geo.total > 0 ? extras.geo.ok / extras.geo.total : null);
  out.citacion_ia = input(extras.citations && extras.citations.n > 0 ? extras.citations.k / extras.citations.n : null, extras.citations?.n ?? 0);
  visibility(windows, out);
  conversion(windows, out);
  investment(windows, pipelineLeads, out);
  pipeline(pipelineLeads, out);
  acquisition(windows, out);
  brand(windows, out);
  experience(windows, out);
  return out;
}
