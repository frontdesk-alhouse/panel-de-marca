import { addDays, todayIso, type DateRange } from "@/lib/dates";
import type { MetricRow, Source } from "./types";

/**
 * Microsoft Clarity Data Export: máximo 10 llamadas por día y solo las últimas
 * 24-72 h, así que cada día se guarda una foto de las últimas 24 h (fecha = ayer).
 * Cuatro llamadas: total, por página, por dispositivo y por canal.
 */
const ENDPOINT = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
const TIMEOUT_MS = 30_000;
const BREAKDOWNS: { param: string | null; prefix: string }[] = [
  { param: null, prefix: "" },
  { param: "URL", prefix: "url" },
  { param: "Device", prefix: "device" },
  { param: "Channel", prefix: "channel" },
];

/** Bloque de la respuesta: metricName + filas (números como texto o número). */
export interface ClarityBlock { metricName: string; information: Record<string, string | number | null>[] }

/** Métricas de fricción: Clarity da el % de sesiones con el problema; se guarda el conteo. */
const FRICTION: Record<string, string> = {
  "Rage Click Count": "rage_sessions", RageClickCount: "rage_sessions",
  "Dead Click Count": "dead_sessions", DeadClickCount: "dead_sessions",
  "Quickback Click": "quickback_sessions", QuickbackClick: "quickback_sessions",
  "Excessive Scroll": "excessive_scroll_sessions", ExcessiveScroll: "excessive_scroll_sessions",
  "Error Click Count": "error_click_sessions", ErrorClickCount: "error_click_sessions",
  "Script Error Count": "script_error_sessions", ScriptErrorCount: "script_error_sessions",
};
const DIMENSION_FIELDS = ["URL", "Url", "Device", "Channel"];

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const pathOf = (url: string) => { try { return new URL(url).pathname || "/"; } catch { return url; } };

export function parseClarity(blocks: ClarityBlock[], prefix: string, date: string): MetricRow[] {
  const rows: MetricRow[] = [];
  const keyOf = (info: Record<string, unknown>) => {
    if (!prefix) return "";
    const field = DIMENSION_FIELDS.find((f) => info[f] !== undefined && info[f] !== null);
    if (!field) return null;
    const raw = String(info[field]);
    return `${prefix}:${prefix === "url" ? pathOf(raw) : raw}`;
  };
  const sessions = new Map<string, number>();
  const push = (dimKey: string, metric: string, value: number | null) => {
    if (value !== null && Number.isFinite(value)) rows.push({ source: "clarity", metric, dimKey, date, value });
  };

  // Traffic primero: sus sesiones convierten porcentajes en conteos.
  const traffic = blocks.find((b) => b.metricName === "Traffic");
  for (const info of traffic?.information ?? []) {
    const dimKey = keyOf(info); if (dimKey === null) continue;
    const s = num(info.totalSessionCount) ?? 0;
    sessions.set(dimKey, (sessions.get(dimKey) ?? 0) + s);
    push(dimKey, "sessions", s);
    push(dimKey, "bot_sessions", num(info.totalBotSessionCount));
    const pps = num(info.PagesPerSessionPercentage ?? info.pagesPerSessionPercentage);
    push(dimKey, "pages_weighted", pps === null ? null : pps * s);
  }

  for (const b of blocks) {
    for (const info of b.information ?? []) {
      const dimKey = keyOf(info); if (dimKey === null) continue;
      const s = sessions.get(dimKey) ?? num(info.sessionsCount) ?? 0;
      if (FRICTION[b.metricName]) {
        const pct = num(info.sessionsWithMetricPercentage);
        const count = pct !== null ? (pct / 100) * s : num(info.subTotal);
        push(dimKey, FRICTION[b.metricName], count);
      } else if (b.metricName === "Scroll Depth" || b.metricName === "ScrollDepth") {
        const depth = num(info.averageScrollDepth);
        if (depth !== null) push(dimKey, "scroll_weighted", (depth / 100) * s);
      } else if (b.metricName === "Engagement Time" || b.metricName === "EngagementTime") {
        push(dimKey, "active_time_s", num(info.activeTime) !== null ? num(info.activeTime)! * s : null);
        push(dimKey, "total_time_s", num(info.totalTime) !== null ? num(info.totalTime)! * s : null);
      }
    }
  }
  return sumByKey(rows);
}

/** Varias URLs (con parámetros, mayúsculas) caen en la misma ruta: se suman en una fila. */
function sumByKey(rows: MetricRow[]): MetricRow[] {
  const map = new Map<string, MetricRow>();
  for (const r of rows) {
    const k = `${r.metric}|${r.dimKey}`;
    const prev = map.get(k);
    map.set(k, prev ? { ...prev, value: prev.value + r.value } : r);
  }
  return [...map.values()];
}

async function fetchInsights(param: string | null): Promise<ClarityBlock[]> {
  const qs = new URLSearchParams({ numOfDays: "1" });
  if (param) qs.set("dimension1", param);
  const res = await fetch(`${ENDPOINT}?${qs}`, {
    headers: { Authorization: `Bearer ${process.env.CLARITY_TOKEN}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 429) throw new Error("Clarity: se agotaron las 10 consultas del día");
  if (!res.ok) throw new Error(`Clarity respondió ${res.status}`);
  return (await res.json()) as ClarityBlock[];
}

export const claritySource: Source = {
  id: "clarity",
  label: "Microsoft Clarity",
  isConfigured: () => Boolean(process.env.CLARITY_TOKEN),
  async fetchDaily(_range: DateRange): Promise<MetricRow[]> {
    void _range;
    const date = addDays(todayIso(), -1);
    const rows: MetricRow[] = [];
    // En fila: si una falla por cuota, las demás no gastan consultas.
    for (const b of BREAKDOWNS) rows.push(...parseClarity(await fetchInsights(b.param), b.prefix, date));
    return rows;
  },
};
