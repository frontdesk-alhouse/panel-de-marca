/**
 * Tipos y cálculo puro de la tendencia de competencia. Separado de comptrend.ts
 * porque la gráfica corre en el navegador y no debe arrastrar la base de datos.
 */
import type { FactorKey, FactorScores } from "../seofactors";
import type { SerpTop } from "@/sources/serp";

/** Qué se grafica: la fuerza SEO (factores), la visibilidad real en Google, o un factor suelto. */
export type TrendKind = "strength" | "visibility" | FactorKey;

export interface TrendPoint { date: string; strength: number | null; coverage: number; visibility: number | null; factors: FactorScores }
export interface TrendSeries { name: string; domain: string; self: boolean; points: TrendPoint[]; start: TrendPoint | null; current: TrendPoint | null }
export interface QueryRow { query: string; date: string; top: SerpTop[]; bySite: Record<string, number | null> }

export function pointValue(p: TrendPoint | null | undefined, kind: TrendKind): number | null {
  if (!p) return null;
  if (kind === "strength") return p.strength;
  if (kind === "visibility") return p.visibility;
  return p.factors[kind];
}
