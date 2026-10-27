/** Lectura de una sección: qué está bien, qué está mal, qué vigilar y qué hacer. */
export type Tone = "good" | "bad" | "watch";

export interface Insight {
  tone: Tone;
  /** Una frase con el hallazgo y su número */
  title: string;
  /** Por qué importa o qué hacer, en una o dos frases */
  detail?: string;
  /** Peso para ordenar entre secciones: 3 alto, 1 bajo */
  weight?: 1 | 2 | 3;
  /** id de la gráfica o tabla que lo respalda (ancla en la página) */
  anchor?: string;
}

/** Hallazgos que van pegados a una gráfica o tabla. */
export const forAnchor = (list: Insight[], anchor: string) => list.filter((i) => i.anchor === anchor);

export const safeDiv = (a: number | undefined, b: number | undefined): number | null =>
  a === undefined || b === undefined || b === 0 ? null : a / b;

export const sumValues = (rows: { cur: Record<string, number> }[], metric: string) =>
  rows.reduce((acc, r) => acc + (r.cur[metric] ?? 0), 0);

export function changeOf(cur: number | undefined, prev: number | undefined, minPrev = 1): number | null {
  if (cur === undefined || prev === undefined || prev < minPrev) return null;
  return (cur - prev) / prev;
}

/** Ordena: primero lo malo de mayor peso, luego vigilar, luego lo bueno. */
export function rankInsights(list: Insight[]): Insight[] {
  const toneOrder: Record<Tone, number> = { bad: 0, watch: 1, good: 2 };
  return [...list].sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || (b.weight ?? 1) - (a.weight ?? 1));
}
