import { localeSettings } from "@/lib/workspace/store";

const DAY_MS = 86_400_000;

/** Fecha ISO (YYYY-MM-DD) de un instante, en la zona horaria de la marca (CDMX si aún no hay configuración). */
export function todayIso(at: Date = new Date(), timeZone = localeSettings().timeZone): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(at);
}

export function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

export interface DateRange { from: string; to: string }

/** Ventana actual de `days` días que termina en `end` (incluido) y la ventana inmediata anterior. */
export function comparisonWindows(end: string, days = 28): { current: DateRange; previous: DateRange } {
  const currentFrom = addDays(end, -(days - 1));
  const previousTo = addDays(currentFrom, -1);
  return {
    current: { from: currentFrom, to: end },
    previous: { from: addDays(previousTo, -(days - 1)), to: previousTo },
  };
}

/** Lista de fechas ISO del rango, ambos extremos incluidos. */
export function eachDay(range: DateRange): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
  return out;
}
