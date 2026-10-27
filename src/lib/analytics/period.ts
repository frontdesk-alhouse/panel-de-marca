import { addDays, comparisonWindows, todayIso, type DateRange } from "@/lib/dates";

export const PERIOD_OPTIONS = [7, 28, 90] as const;
export type PeriodDays = (typeof PERIOD_OPTIONS)[number];

export interface Period {
  days: PeriodDays;
  current: DateRange;
  previous: DateRange;
}

/** Periodo desde ?p= (7, 28 o 90 días); 28 por defecto. Termina ayer, en la zona horaria de la marca. */
export function resolvePeriod(raw: string | string[] | undefined): Period {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  const days = (PERIOD_OPTIONS as readonly number[]).includes(n) ? (n as PeriodDays) : 28;
  const end = addDays(todayIso(), -1);
  return { days, ...comparisonWindows(end, days) };
}
