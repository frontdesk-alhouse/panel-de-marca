import { google, type analyticsdata_v1beta } from "googleapis";
import type { DateRange } from "@/lib/dates";
import { googleAuth, isGoogleConfigured } from "./google-auth";
import type { MetricRow, Source } from "./types";

type Report = analyticsdata_v1beta.Schema$RunReportRequest;
type Response = analyticsdata_v1beta.Schema$RunReportResponse;

/** Eventos que se cuentan por página: scroll al 90 %, formulario y atajos de contacto. */
export const TRACKED_EVENTS = ["scroll", "form_start", "generate_lead", "contact_whatsapp", "contact_call", "click"];

interface Spec {
  /** Dimensión de GA4 además de la fecha; null = solo totales por día */
  dimension: string | null;
  /** Prefijo del dim_key en metric_daily */
  prefix: string;
  /** [métrica de GA4, nombre en metric_daily] */
  metrics: [string, string][];
  /** También guardar el total del día (dim_key vacío) */
  totals?: boolean;
  filterEvents?: boolean;
}

const CORE: [string, string][] = [
  ["sessions", "sessions"],
  ["engagedSessions", "engaged_sessions"],
  ["keyEvents", "key_events"],
  ["userEngagementDuration", "engagement_seconds"],
  ["newUsers", "new_users"],
];

/** Cada reporte = una vista del tablero. Los totales del día salen del de canal. */
export const SPECS: Spec[] = [
  { dimension: "sessionDefaultChannelGroup", prefix: "channel", metrics: CORE, totals: true },
  { dimension: "landingPage", prefix: "landing", metrics: CORE.slice(0, 4) },
  { dimension: "pagePath", prefix: "page", metrics: [["screenPageViews", "page_views"], ["userEngagementDuration", "page_engagement_seconds"]], totals: true },
  { dimension: "deviceCategory", prefix: "device", metrics: CORE.slice(0, 4) },
  { dimension: "newVsReturning", prefix: "visitor", metrics: CORE.slice(0, 4) },
  { dimension: "sessionSourceMedium", prefix: "source", metrics: CORE.slice(0, 4) },
  { dimension: "country", prefix: "country", metrics: CORE.slice(0, 2) },
  { dimension: "city", prefix: "city", metrics: CORE.slice(0, 2) },
  { dimension: "userAgeBracket", prefix: "age", metrics: [["sessions", "sessions"]] },
  { dimension: "userGender", prefix: "gender", metrics: [["sessions", "sessions"]] },
];

const EVENTS_SPEC = { prefix: "page" };
const BATCH_LIMIT = 5;
const ROW_LIMIT = "100000";

const toIso = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

function request(spec: Spec, range: DateRange): Report {
  return {
    dateRanges: [{ startDate: range.from, endDate: range.to }],
    dimensions: [{ name: "date" }, ...(spec.dimension ? [{ name: spec.dimension }] : [])],
    metrics: spec.metrics.map(([name]) => ({ name })),
    limit: ROW_LIMIT,
  };
}

function eventsRequest(range: DateRange): Report {
  return {
    dateRanges: [{ startDate: range.from, endDate: range.to }],
    dimensions: [{ name: "date" }, { name: "eventName" }, { name: "pagePath" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: TRACKED_EVENTS } } },
    limit: ROW_LIMIT,
  };
}

/** Convierte una respuesta de GA4 en filas; suma totales por día si la vista lo pide. */
export function rowsFromReport(spec: Spec, res: Response): MetricRow[] {
  const rows: MetricRow[] = [];
  const totals = new Map<string, number>();
  for (const r of res.rows ?? []) {
    const date = toIso(r.dimensionValues?.[0]?.value ?? "");
    const dimValue = r.dimensionValues?.[1]?.value || "(not set)";
    spec.metrics.forEach(([, metric], i) => {
      const value = Number(r.metricValues?.[i]?.value ?? 0);
      rows.push({ source: "ga4", metric, dimKey: `${spec.prefix}:${dimValue}`, date, value });
      if (spec.totals) totals.set(`${date}|${metric}`, (totals.get(`${date}|${metric}`) ?? 0) + value);
    });
  }
  for (const [key, value] of totals) {
    const [date, metric] = key.split("|");
    rows.push({ source: "ga4", metric, dimKey: "", date, value });
  }
  return rows;
}

/** Eventos por página → métrica `event_<nombre>` por página y total del día. */
export function rowsFromEvents(res: Response): MetricRow[] {
  const rows: MetricRow[] = [];
  const totals = new Map<string, number>();
  for (const r of res.rows ?? []) {
    const date = toIso(r.dimensionValues?.[0]?.value ?? "");
    const metric = `event_${r.dimensionValues?.[1]?.value}`;
    const page = r.dimensionValues?.[2]?.value || "(not set)";
    const value = Number(r.metricValues?.[0]?.value ?? 0);
    rows.push({ source: "ga4", metric, dimKey: `${EVENTS_SPEC.prefix}:${page}`, date, value });
    totals.set(`${date}|${metric}`, (totals.get(`${date}|${metric}`) ?? 0) + value);
  }
  for (const [key, value] of totals) {
    const [date, metric] = key.split("|");
    rows.push({ source: "ga4", metric, dimKey: "", date, value });
  }
  return rows;
}

export const ga4Source: Source = {
  id: "ga4",
  label: "Google Analytics",
  isConfigured: () => isGoogleConfigured() && Boolean(process.env.GA4_PROPERTY_ID),
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const api = google.analyticsdata({ version: "v1beta", auth: googleAuth() });
    const property = `properties/${process.env.GA4_PROPERTY_ID}`;
    const requests: { build: Report; parse: (r: Response) => MetricRow[] }[] = [
      ...SPECS.map((spec) => ({ build: request(spec, range), parse: (r: Response) => rowsFromReport(spec, r) })),
      { build: eventsRequest(range), parse: rowsFromEvents },
    ];

    const rows: MetricRow[] = [];
    for (let i = 0; i < requests.length; i += BATCH_LIMIT) {
      const chunk = requests.slice(i, i + BATCH_LIMIT);
      const res = await api.properties.batchRunReports({
        property,
        requestBody: { requests: chunk.map((c) => c.build) },
      });
      (res.data.reports ?? []).forEach((report, j) => rows.push(...chunk[j].parse(report)));
    }
    return rows;
  },
};
