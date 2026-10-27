import { addDays, type DateRange } from "@/lib/dates";
import { series, totals, valueAsOf, type SeriesPoint } from "../query";
import { safeDiv } from "../insights";

export type MetricFormat = "number" | "mxn" | "pct";
export interface WeeklyMetric {
  key: string; label: string; format: MetricFormat;
  current: number | null; previous: number | null;
  /** Para gasto y costo por lead, subir es malo. */
  higherIsBetter: boolean;
}
export interface WeeklyMetrics { range: DateRange; previous: DateRange; metrics: WeeklyMetric[]; daily: SeriesPoint[] }

const DAY_MS = 86_400_000;
const daysIn = (r: DateRange) => Math.round((Date.parse(r.to) - Date.parse(r.from)) / DAY_MS) + 1;

/**
 * Números del periodo del análisis contra el periodo anterior de la misma duración.
 * Salen de los datos, no de Claude: las gráficas del pop-up no dependen del texto generado.
 */
export async function loadWeeklyMetrics(range: DateRange): Promise<WeeklyMetrics> {
  const n = daysIn(range);
  const previous = { from: addDays(range.from, -n), to: addDays(range.from, -1) };
  const [ga, gaPrev, gads, gadsPrev, meta, metaPrev, ig, igPrev, fNow, fPrev, daily] = await Promise.all([
    totals("ga4", ["sessions", "key_events"], range), totals("ga4", ["sessions", "key_events"], previous),
    totals("gads", ["cost_mxn", "conversions", "clicks"], range), totals("gads", ["cost_mxn", "conversions", "clicks"], previous),
    totals("meta", ["spend_mxn", "leads", "conversations"], range), totals("meta", ["spend_mxn", "leads", "conversations"], previous),
    totals("instagram", ["reach"], range), totals("instagram", ["reach"], previous),
    valueAsOf("instagram", "followers", range.to), valueAsOf("instagram", "followers", previous.to),
    series("ga4", ["sessions", "key_events"], { from: previous.from, to: range.to }),
  ]);
  const v = (o: Record<string, number>, k: string) => (k in o ? o[k] : null);
  const spend = (g: Record<string, number>, m: Record<string, number>) => (g.cost_mxn ?? 0) + (m.spend_mxn ?? 0);
  const leads = (g: Record<string, number>, m: Record<string, number>) => (g.conversions ?? 0) + (m.leads ?? 0) + (m.conversations ?? 0);
  const hasAds = "cost_mxn" in gads || "spend_mxn" in meta;
  const metrics: WeeklyMetric[] = [
    { key: "sessions", label: "Visitas al sitio", format: "number", current: v(ga, "sessions"), previous: v(gaPrev, "sessions"), higherIsBetter: true },
    { key: "key_events", label: "Formularios enviados", format: "number", current: v(ga, "key_events"), previous: v(gaPrev, "key_events"), higherIsBetter: true },
    { key: "spend", label: "Inversión en anuncios", format: "mxn", current: hasAds ? spend(gads, meta) : null, previous: hasAds ? spend(gadsPrev, metaPrev) : null, higherIsBetter: false },
    { key: "cpl", label: "Costo por lead", format: "mxn", current: hasAds ? safeDiv(spend(gads, meta), leads(gads, meta)) : null, previous: hasAds ? safeDiv(spend(gadsPrev, metaPrev), leads(gadsPrev, metaPrev)) : null, higherIsBetter: false },
    { key: "reach", label: "Alcance en Instagram", format: "number", current: v(ig, "reach"), previous: v(igPrev, "reach"), higherIsBetter: true },
    { key: "followers", label: "Seguidores en Instagram", format: "number", current: fNow, previous: fPrev, higherIsBetter: true },
  ];
  return { range, previous, metrics, daily: daily as SeriesPoint[] };
}
