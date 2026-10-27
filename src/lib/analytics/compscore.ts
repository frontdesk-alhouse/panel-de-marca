/**
 * Visibilidad en Google (0-100): el resultado, no un factor. Promedio, en las
 * búsquedas objetivo, de (31 − lugar) / 30. Lugar 1 = 100, lugar 30 = 3, fuera
 * del top 30 = 0.
 */
export const SERP_DEPTH = 30;

export function positionPoints(pos: number | undefined): number {
  if (pos === undefined || pos > SERP_DEPTH || pos < 1) return 0;
  return ((SERP_DEPTH + 1 - pos) / SERP_DEPTH) * 100;
}

/** Posicionamiento a partir de los lugares por búsqueda medida (undefined = fuera del top 30). */
export function positioningScore(positions: (number | undefined)[]): number | null {
  if (!positions.length) return null;
  return positions.reduce<number>((s, p) => s + positionPoints(p), 0) / positions.length;
}

export interface Snap { date: string; value: number }

/** Último valor en o antes de una fecha (lista ordenada por fecha). */
export function asOf(list: Snap[], date: string): Snap | null {
  let found: Snap | null = null;
  for (const s of list) {
    if (s.date > date) break;
    found = s;
  }
  return found;
}

/** Puntos de la línea: fechas con alguna medición dentro de la ventana, más el arranque de la ventana. */
export function timelineDates(allDates: string[], from: string, to: string): string[] {
  const inside = [...new Set(allDates)].filter((d) => d > from && d <= to).sort();
  const before = allDates.some((d) => d <= from);
  return before ? [from, ...inside] : inside;
}
