import { localCities, ws } from "@/lib/workspace/store";
import { PAID_CHANNELS } from "@/sources/contract";
import { label } from "../labels";
import { formatNumber, formatPct, formatSignedPct } from "@/lib/format";
import { breakdown, history, seriesByDim, totals, type BreakdownRow } from "../query";
import { INDUSTRY, ownRef, type KpiRefs } from "../refs";
import { changeOf, rankInsights, safeDiv, sumValues, type Insight } from "../insights";
import type { Period } from "../period";

const CORE = ["sessions", "engaged_sessions", "key_events", "engagement_seconds", "new_users"];
const MIN_SESSIONS = 20;

export interface TrafficData {
  kpis: { sessions: [number?, number?]; newShare: [number | null, number | null]; engagementRate: [number | null, number | null]; avgSeconds: [number | null, number | null] };
  channelSeries: Awaited<ReturnType<typeof seriesByDim>>;
  channels: BreakdownRow[];
  devices: BreakdownRow[];
  cities: BreakdownRow[];
  sources: BreakdownRow[];
  visitors: BreakdownRow[];
  ages: BreakdownRow[];
  genders: BreakdownRow[];
  insights: Insight[];
  comparable: boolean;
  refs: Record<"sessions" | "newShare" | "engagement" | "avgTime", KpiRefs>;
}

const bySessions = (rows: BreakdownRow[]) => [...rows].sort((a, b) => (b.cur.sessions ?? 0) - (a.cur.sessions ?? 0));
const realRows = (rows: BreakdownRow[]) => rows.filter((r) => r.key !== "(not set)" && r.key !== "unknown" && (r.cur.sessions ?? 0) > 0);

export async function loadTraffic(p: Period): Promise<TrafficData> {
  const [cur, prev, channelSeries, channels, devices, cities, sources, visitors, ages, genders, hist] = await Promise.all([
    totals("ga4", CORE, p.current),
    totals("ga4", CORE, p.previous),
    seriesByDim("ga4", "sessions", "channel", p.current, 6),
    breakdown("ga4", "channel", CORE, p.current, p.previous),
    breakdown("ga4", "device", ["sessions", "engaged_sessions", "key_events"], p.current, p.previous),
    breakdown("ga4", "city", ["sessions", "engaged_sessions"], p.current, p.previous),
    breakdown("ga4", "source", ["sessions", "engaged_sessions", "key_events"], p.current, p.previous),
    breakdown("ga4", "visitor", ["sessions", "engaged_sessions"], p.current, p.previous),
    breakdown("ga4", "age", ["sessions"], p.current, p.previous),
    breakdown("ga4", "gender", ["sessions"], p.current, p.previous),
    history("ga4", CORE, p.current),
  ]);
  const comparable = (prev.sessions ?? 0) >= 30;
  const engagement = safeDiv(cur.engaged_sessions, cur.sessions);
  const avgTime = safeDiv(cur.engagement_seconds, cur.sessions);
  const base = { hist, periodDays: p.days, comparable };
  const refs = {
    sessions: { industry: INDUSTRY.sessions(cur.sessions ?? 0, p.days), own: ownRef({ ...base, kind: "count", current: cur.sessions ?? null, previous: prev.sessions, metric: "sessions" }) },
    newShare: { industry: null, own: ownRef({ ...base, kind: "pct", current: safeDiv(cur.new_users, cur.sessions), previous: safeDiv(prev.new_users, prev.sessions), ratio: ["new_users", "sessions"] }) },
    engagement: { industry: INDUSTRY.engagement(engagement), own: ownRef({ ...base, kind: "pct", current: engagement, previous: safeDiv(prev.engaged_sessions, prev.sessions), ratio: ["engaged_sessions", "sessions"] }) },
    avgTime: { industry: INDUSTRY.avgTime(), own: ownRef({ ...base, kind: "seconds", current: avgTime, previous: safeDiv(prev.engagement_seconds, prev.sessions), ratio: ["engagement_seconds", "sessions"] }) },
  } satisfies TrafficData["refs"];

  const data: TrafficData = {
    kpis: {
      sessions: [cur.sessions, prev.sessions],
      newShare: [safeDiv(cur.new_users, cur.sessions), safeDiv(prev.new_users, prev.sessions)],
      engagementRate: [safeDiv(cur.engaged_sessions, cur.sessions), safeDiv(prev.engaged_sessions, prev.sessions)],
      avgSeconds: [safeDiv(cur.engagement_seconds, cur.sessions), safeDiv(prev.engagement_seconds, prev.sessions)],
    },
    channelSeries,
    channels: bySessions(channels),
    devices: bySessions(devices),
    cities: bySessions(realRows(cities)),
    sources: bySessions(sources),
    visitors: bySessions(visitors),
    ages: bySessions(realRows(ages)),
    genders: bySessions(realRows(genders)),
    insights: [],
    comparable,
    refs,
  };
  data.insights = trafficInsights(data, cur.sessions ?? 0, prev.sessions);
  return data;
}

function trafficInsights(d: TrafficData, sessions: number, prevSessions: number | undefined): Insight[] {
  const out: Insight[] = [];
  if (sessions === 0) return [{ tone: "watch", title: "Sin visitas registradas en el periodo." }];

  const paid = sumValues(d.channels.filter((r) => PAID_CHANNELS.has(r.key)), "sessions");
  const paidShare = paid / sessions;
  if (paidShare > 0.5) {
    out.push({ tone: "bad", weight: 3, anchor: "canales", title: `El ${formatPct(paidShare, 0)} de las visitas viene de anuncios.`,
      detail: "Si se apagan los anuncios, el sitio casi no recibe tráfico. Hace falta construir visitas orgánicas (SEO, contenido, Instagram)." });
  } else if (paidShare < 0.35) {
    out.push({ tone: "good", anchor: "canales", title: `Solo el ${formatPct(paidShare, 0)} de las visitas depende de anuncios.` });
  }

  const change = changeOf(sessions, prevSessions, 100);
  if (change !== null) {
    out.push({ tone: change >= 0.1 ? "good" : change <= -0.1 ? "bad" : "watch", weight: 2, anchor: "visitas",
      title: `Las visitas ${change >= 0 ? "subieron" : "bajaron"} ${formatSignedPct(change)} contra el periodo anterior.` });
  }

  const mobile = d.devices.find((r) => r.key === "mobile")?.cur.sessions ?? 0;
  if (mobile / sessions > 0.65) {
    out.push({ tone: "watch", weight: 2, anchor: "dispositivos", title: `El ${formatPct(mobile / sessions, 0)} entra desde el celular.`,
      detail: "La experiencia móvil decide: velocidad, tamaño de botones y el formulario en celular pesan más que el escritorio." });
  }

  const targetCities = localCities();
  const city = ws().brand.city;
  const totalCities = sumValues(d.cities, "sessions");
  const local = sumValues(d.cities.filter((r) => targetCities.includes(r.key)), "sessions");
  const top = d.cities[0];
  if (top && totalCities >= MIN_SESSIONS && !targetCities.includes(top.key)) {
    out.push({ tone: "watch", weight: 3, anchor: "ciudades", title: `La ciudad que más visita es ${top.key} (${formatNumber(top.cur.sessions ?? 0)}), no ${city}.`,
      detail: `El área de ${city} suma ${formatPct(local / totalCities, 0)}. Si la campaña de Google Ads apunta a ${city}, revisa la segmentación por ubicación («presencia» vs «interés»).` });
  }

  const ranked = d.channels.filter((r) => (r.cur.sessions ?? 0) >= MIN_SESSIONS)
    .map((r) => ({ key: r.key, rate: (r.cur.engaged_sessions ?? 0) / (r.cur.sessions ?? 1) }))
    .sort((a, b) => b.rate - a.rate);
  if (ranked.length >= 2) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    out.push({ tone: "watch", anchor: "detalle-canales", title: `${label(best.key)} es el canal con más interés (${formatPct(best.rate, 0)} de visitas con interacción); ${label(worst.key)} el que menos (${formatPct(worst.rate, 0)}).` });
  }

  const returning = d.visitors.find((r) => r.key === "returning")?.cur.sessions ?? 0;
  if (returning / sessions < 0.15) {
    out.push({ tone: "watch", anchor: "visitantes", title: `Solo el ${formatPct(returning / sessions, 0)} de las visitas son de gente que regresa.`,
      detail: "Normal en un sitio recién lanzado. Contenido, casos nuevos e Instagram ayudan a que vuelvan." });
  }

  if (!d.ages.length && !d.genders.length) {
    out.push({ tone: "watch", weight: 1, anchor: "edad", title: "No hay datos de edad ni género.",
      detail: "Se activan encendiendo Google Signals en GA4 (Admin, Recopilación de datos). Google los muestra solo con suficiente volumen." });
  }
  return rankInsights(out);
}
