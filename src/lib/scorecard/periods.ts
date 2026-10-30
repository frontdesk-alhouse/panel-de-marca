import { addDays } from "@/lib/dates";
import type { ExplainPoint } from "./explain-change";

export const PERIODS = ["day", "week", "month", "quarter", "semester", "year"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  day: "Día", week: "Semana", month: "Mes", quarter: "Trimestre", semester: "Semestre", year: "Año",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const parts = (iso: string) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)), d: Number(iso.slice(8, 10)) });
const pad = (n: number) => String(n).padStart(2, "0");
const dayOfWeek = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo

/** Primer día del periodo que contiene `iso` (la semana empieza en lunes). */
export function bucketStart(iso: string, period: Period): string {
  const { y, m } = parts(iso);
  switch (period) {
    case "day": return iso;
    case "week": return addDays(iso, -((dayOfWeek(iso) + 6) % 7));
    case "month": return `${y}-${pad(m)}-01`;
    case "quarter": return `${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`;
    case "semester": return `${y}-${m <= 6 ? "01" : "07"}-01`;
    case "year": return `${y}-01-01`;
  }
}

/** Último día del periodo que empieza en `start`. */
export function bucketEnd(start: string, period: Period): string {
  const { y, m } = parts(start);
  const monthsLong = { day: 0, week: 0, month: 1, quarter: 3, semester: 6, year: 12 }[period];
  if (period === "day") return start;
  if (period === "week") return addDays(start, 6);
  const next = new Date(Date.UTC(y, m - 1 + monthsLong, 1));
  return addDays(next.toISOString().slice(0, 10), -1);
}

/** Etiqueta corta para el eje y el tooltip. */
export function bucketLabel(start: string, period: Period): string {
  const { y, m, d } = parts(start);
  switch (period) {
    case "day": return `${d} ${MONTHS[m - 1]}`;
    case "week": return `Sem. ${d} ${MONTHS[m - 1]}`;
    case "month": return `${MONTHS[m - 1]} ${y}`;
    case "quarter": return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
    case "semester": return `S${m <= 6 ? 1 : 2} ${y}`;
    case "year": return String(y);
  }
}

export interface PeriodPoint extends ExplainPoint {
  /** Días con calificación guardada dentro del periodo */
  days: number;
  /** El periodo aún no termina (o faltan días): el promedio es provisional */
  inProgress: boolean;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function averageMaps(maps: readonly Record<string, number | null>[]): Record<string, number | null> {
  const keys = new Set(maps.flatMap((m) => Object.keys(m)));
  return Object.fromEntries([...keys].map((k) => [k, mean(maps.map((m) => m[k]).filter((v): v is number => typeof v === "number"))]));
}

/**
 * Promedia los días guardados en periodos (semana, mes, Q, semestre, año). Cada día ya trae su nota
 * (un área sin datos vale 0), así que el promedio no tiene huecos. Con `day` regresa los días tal cual.
 */
export function aggregate(points: readonly ExplainPoint[], period: Period, lastDay: string): PeriodPoint[] {
  const groups = new Map<string, ExplainPoint[]>();
  for (const p of points) {
    const key = bucketStart(p.date, period);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({
    date,
    overall: mean(rows.map((r) => r.overall).filter((v): v is number => v !== null)),
    dimensions: averageMaps(rows.map((r) => r.dimensions)),
    metrics: averageMaps(rows.map((r) => r.metrics)),
    days: rows.length,
    inProgress: bucketEnd(date, period) > lastDay,
  }));
}
