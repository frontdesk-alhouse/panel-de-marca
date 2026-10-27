import { PAID_CHANNELS } from "@/sources/contract";
import { formatPct } from "@/lib/format";
import { breakdown, historyRange, totals, type BreakdownRow, type History } from "../query";
import { INDUSTRY, ownRef } from "../refs";
import { daysBetween } from "@/lib/dates";
import { rankInsights, safeDiv, sumValues, type Insight } from "../insights";
import type { Period } from "../period";

const M = ["sessions", "engaged_sessions", "engagement_seconds", "key_events"];

/** Mientras no estén conectados Google Ads (F5) y Meta (F2): lo que GA4 ve del tráfico pagado. */
export async function loadAds(p: Period) {
  const [channels, sources, all, histRange] = await Promise.all([
    breakdown("ga4", "channel", M, p.current, p.previous),
    breakdown("ga4", "source", M, p.current, p.previous),
    totals("ga4", M, p.current),
    historyRange("ga4", p.current),
  ]);
  const histRows = histRange ? await breakdown("ga4", "channel", M, histRange, histRange) : [];
  const paid = channels.filter((r) => PAID_CHANNELS.has(r.key)).sort((a, b) => (b.cur.sessions ?? 0) - (a.cur.sessions ?? 0));
  const organic = channels.filter((r) => !PAID_CHANNELS.has(r.key));
  const paidSources = sources.filter((r) => /cpc|paid|ads|cpm/i.test(r.key)).sort((a, b) => (b.cur.sessions ?? 0) - (a.cur.sessions ?? 0));

  const paidSessions = sumValues(paid, "sessions");
  const rate = (rows: typeof paid) => safeDiv(sumValues(rows, "engaged_sessions"), sumValues(rows, "sessions"));
  const time = (rows: typeof paid) => safeDiv(sumValues(rows, "engagement_seconds"), sumValues(rows, "sessions"));
  const compare = {
    paid: { sessions: paidSessions, engagementRate: rate(paid), avgSeconds: time(paid), conversions: sumValues(paid, "key_events") },
    organic: { sessions: sumValues(organic, "sessions"), engagementRate: rate(organic), avgSeconds: time(organic), conversions: sumValues(organic, "key_events") },
  };

  // Tu referencia: lo mismo medido en toda tu historia anterior al periodo.
  const paidHist = histRows.filter((r) => PAID_CHANNELS.has(r.key));
  const sumRows = (rows: BreakdownRow[]) => Object.fromEntries(M.map((m) => [m, sumValues(rows, m)]));
  const hist: History | null = histRange ? { values: { ...sumRows(paidHist), total_sessions: sumValues(histRows, "sessions") }, days: daysBetween(histRange.from, histRange.to) + 1 } : null;
  const prevPaid = channels.filter((r) => PAID_CHANNELS.has(r.key)).reduce((a, r) => a + (r.prev.sessions ?? 0), 0);
  const base = { hist, periodDays: p.days, comparable: prevPaid >= 30 };
  const paidRate = safeDiv(compare.paid.conversions, compare.paid.sessions);
  const refs = {
    sessions: { industry: null, own: ownRef({ ...base, kind: "count", current: compare.paid.sessions, previous: prevPaid, metric: "sessions" }) },
    engagement: { industry: INDUSTRY.engagement(compare.paid.engagementRate), own: ownRef({ ...base, kind: "pct", current: compare.paid.engagementRate, ratio: ["engaged_sessions", "sessions"] }) },
    avgTime: { industry: INDUSTRY.avgTime(), own: ownRef({ ...base, kind: "seconds", current: compare.paid.avgSeconds, ratio: ["engagement_seconds", "sessions"] }) },
    leads: { industry: INDUSTRY.adsConversion(compare.paid.sessions ? paidRate : null), own: ownRef({ ...base, kind: "count", current: compare.paid.conversions, metric: "key_events" }) },
    share: { industry: INDUSTRY.paidShare(safeDiv(paidSessions, all.sessions)), own: ownRef({ ...base, kind: "pct", current: safeDiv(paidSessions, all.sessions), ratio: ["sessions", "total_sessions"], higherIsBetter: false }) },
  };

  const out: Insight[] = [];
  const share = safeDiv(paidSessions, all.sessions);
  if (share !== null) out.push({ tone: share > 0.5 ? "watch" : "good", weight: 2, anchor: "comparacion", title: `Los anuncios traen el ${formatPct(share, 0)} de las visitas.` });
  if (compare.paid.engagementRate !== null && compare.organic.engagementRate !== null && compare.paid.sessions >= 20) {
    const diff = compare.paid.engagementRate - compare.organic.engagementRate;
    out.push(diff < -0.1
      ? { tone: "bad", weight: 3, anchor: "comparacion", title: `Quien llega por anuncio interactúa menos (${formatPct(compare.paid.engagementRate, 0)} vs ${formatPct(compare.organic.engagementRate, 0)} del resto).`, detail: "Señal de que el anuncio atrae a gente que no busca lo que ofreces, o de que la página de llegada no responde al anuncio. Revisa los términos de búsqueda en Google Ads." }
      : { tone: "good", anchor: "comparacion", title: `El tráfico de anuncios interactúa igual o mejor que el resto (${formatPct(compare.paid.engagementRate, 0)}).` });
  }
  if (compare.paid.sessions > 0 && compare.paid.conversions === 0) out.push({ tone: "watch", weight: 3, anchor: "comparacion", title: "Todavía no hay leads atribuidos a los anuncios.", detail: "Se podrán medir en cuanto el sitio publique el evento de envío del formulario. Sin eso no se sabe si la inversión regresa." });
  out.push({ tone: "watch", weight: 1, anchor: "origen", title: "Gasto, costo por clic y términos de búsqueda llegan al conectar Google Ads y Meta Ads.", detail: "Mientras tanto esta vista usa lo que Google Analytics ve de las visitas pagadas." });

  return { paid, paidSources, compare, refs, insights: rankInsights(out) };
}
