import { addDays } from "@/lib/dates";

/** Un día de la gráfica con lo necesario para explicar por qué cambió. */
export interface ExplainPoint {
  date: string;
  overall: number | null;
  dimensions: Record<string, number | null>;
  /** Nota de cada métrica ese día (100 verde · 50 amarillo · 0 rojo); null si no se calificó */
  metrics: Record<string, number | null>;
}

export interface ExplainMeta {
  dimensions: { id: string; label: string; weight: number }[];
  metrics: { id: string; label: string; dimension: string }[];
}

export interface Driver {
  label: string;
  /** Texto corto del antes y el después, p. ej. «rojo → verde» o «sin datos → 62» */
  change: string;
  direction: "up" | "down" | "neutral";
  /** Magnitud para ordenar: puntos de la general que mueve */
  weight: number;
}

export interface Explanation {
  value: number | null;
  previousValue: number | null;
  previousDate: string | null;
  delta: number | null;
  drivers: Driver[];
}

/** Con cuánto tiempo de diferencia se compara: una semana es lo bastante lejos para ver movimiento real. */
export const COMPARE_DAYS = 7;

const bandWord = (s: number | null) => (s === null ? "sin datos" : s >= 100 ? "verde" : s > 0 ? "amarillo" : "rojo");

/** El día guardado más cercano a `COMPARE_DAYS` antes, sin pasarse; si no hay, el primero anterior. */
export function referencePoint(points: readonly ExplainPoint[], date: string): ExplainPoint | null {
  const before = points.filter((p) => p.date < date);
  if (!before.length) return null;
  const target = addDays(date, -COMPARE_DAYS);
  return [...before].reverse().find((p) => p.date <= target) ?? before[0];
}

const dir = (a: number | null, b: number | null): Driver["direction"] =>
  a === null || b === null ? "neutral" : b > a ? "up" : b < a ? "down" : "neutral";

/**
 * Qué movió la nota entre un día y la referencia. En «General»: qué áreas subieron o bajaron (y cuáles
 * entraron o salieron de la calificación). En un área: qué métricas cambiaron de color o empezaron a medirse.
 */
export function explainChange(
  points: readonly ExplainPoint[], date: string, series: string, meta: ExplainMeta,
  /** Con periodos (semana, mes…) se compara con el periodo anterior; con días, con una semana antes. */
  opts: { previousPoint?: boolean } = {},
): Explanation | null {
  const cur = points.find((p) => p.date === date);
  if (!cur) return null;
  const prev = opts.previousPoint ? [...points].reverse().find((p) => p.date < date) ?? null : referencePoint(points, date);
  const value = series === "overall" ? cur.overall : cur.dimensions[series] ?? null;
  if (!prev) return { value, previousValue: null, previousDate: null, delta: null, drivers: [] };
  const previousValue = series === "overall" ? prev.overall : prev.dimensions[series] ?? null;
  const delta = value !== null && previousValue !== null ? value - previousValue : null;

  const drivers: Driver[] = [];
  if (series === "overall") {
    for (const d of meta.dimensions) {
      const a = prev.dimensions[d.id] ?? null;
      const b = cur.dimensions[d.id] ?? null;
      if (a === b) continue;
      const change = a === null ? `ahora se califica: ${Math.round(b as number)}` : b === null ? "dejó de calificarse (faltan datos)" : `${Math.round(a)} → ${Math.round(b)}`;
      drivers.push({ label: d.label, change, direction: dir(a, b), weight: Math.abs(((b ?? a ?? 0) - (a ?? b ?? 0)) * d.weight) || d.weight });
    }
  } else {
    for (const m of meta.metrics.filter((x) => x.dimension === series)) {
      const a = prev.metrics[m.id] ?? null;
      const b = cur.metrics[m.id] ?? null;
      if (a === b) continue;
      drivers.push({ label: m.label, change: `${bandWord(a)} → ${bandWord(b)}`, direction: dir(a, b), weight: Math.abs((b ?? 0) - (a ?? 0)) || 1 });
    }
  }
  drivers.sort((x, y) => y.weight - x.weight || x.label.localeCompare(y.label));
  return { value, previousValue, previousDate: prev.date, delta, drivers: drivers.slice(0, 4) };
}
