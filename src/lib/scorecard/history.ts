import { DEFAULT_COVERAGE_RULES, type CoverageRules } from "./score";

/** Una dimensión tal como se guardó en `scores.dimensions`. */
export interface StoredDimension { id: string; score: number | null; scored: number; total: number }

export interface RegradedDay {
  overall: number;
  dimensions: Record<string, number>;
  /** Peso (0 a 1) de las áreas con base suficiente ese día; el resto vale 0 */
  weightCoverage: number;
}

/**
 * Vuelve a aplicar las reglas actuales a un día ya guardado: un área sin base suficiente vale 0 y
 * pesa completo. Los días anteriores a esas reglas quedaron con «100» sobre dos métricas o con huecos.
 */
export function regradeDay(
  stored: readonly StoredDimension[],
  weights: Readonly<Record<string, number>>,
  rules: CoverageRules = DEFAULT_COVERAGE_RULES,
): RegradedDay {
  const dimensions: Record<string, number> = {};
  let ratedWeight = 0;
  let weighted = 0;
  const totalWeight = Object.values(weights).reduce((a, w) => a + w, 0);
  for (const id of Object.keys(weights)) {
    const d = stored.find((x) => x.id === id);
    const rated = Boolean(d) && d!.score !== null && d!.total > 0 && d!.scored / d!.total >= rules.minDimensionCoverage;
    const score = rated ? (d!.score as number) : 0;
    dimensions[id] = score;
    weighted += score * weights[id];
    if (rated) ratedWeight += weights[id];
  }
  return {
    overall: totalWeight > 0 ? weighted / totalWeight : 0,
    dimensions,
    weightCoverage: totalWeight > 0 ? ratedWeight / totalWeight : 0,
  };
}
