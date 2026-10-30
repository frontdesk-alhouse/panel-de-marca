import { addDays, daysBetween } from "@/lib/dates";

/**
 * ¿Se movió la calificación después de un cambio? La calificación usa ventanas de 28 días,
 * así que un cambio tarda hasta 28 días en reflejarse completo: se compara el valor del día
 * del cambio con el de 28 días después. Es coincidencia en el tiempo, no prueba de causa:
 * por eso se avisa si hubo otro cambio (propio o externo) en la misma ventana.
 */
export const IMPACT_WINDOW_DAYS = 28;

export interface ScorePoint { date: string; value: number | null }
export interface ChangeLite { id: number; date: string; kind: "propio" | "externo"; title: string }

export type ChangeImpact =
  | { status: "pending"; daysLeft: number }
  | { status: "no_data" }
  | { status: "measured"; before: number; after: number; delta: number; overlapping: ChangeLite[] };

/** Valor más cercano a `date` (hasta 3 días antes o después) con dato. */
function valueNear(points: readonly ScorePoint[], date: string): number | null {
  let best: { gap: number; value: number } | null = null;
  for (const p of points) {
    if (p.value === null) continue;
    const gap = Math.abs(daysBetween(p.date, date));
    if (gap <= 3 && (!best || gap < best.gap)) best = { gap, value: p.value };
  }
  return best?.value ?? null;
}

export function changeImpact(change: ChangeLite, points: readonly ScorePoint[], all: readonly ChangeLite[], today: string): ChangeImpact {
  const end = addDays(change.date, IMPACT_WINDOW_DAYS);
  if (end > today) return { status: "pending", daysLeft: daysBetween(today, end) };
  const before = valueNear(points, addDays(change.date, -1));
  const after = valueNear(points, end);
  if (before === null || after === null) return { status: "no_data" };
  const overlapping = all.filter((c) => c.id !== change.id && c.date >= addDays(change.date, -7) && c.date <= end);
  return { status: "measured", before, after, delta: after - before, overlapping };
}
