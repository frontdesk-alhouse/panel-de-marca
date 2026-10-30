import { DEFAULT_COVERAGE_RULES, type CoverageRules } from "./score";

/** Una dimensión tal como se guardó en `scores.dimensions`. */
export interface StoredDimension { id: string; score: number | null; scored: number; total: number }

export interface RegradedDay {
  overall: number | null;
  dimensions: Record<string, number | null>;
  /** Peso (0 a 1) de las dimensiones que sí se calificaron ese día */
  weightCoverage: number;
}

/**
 * Vuelve a aplicar las reglas de cobertura a un día ya guardado. Los días anteriores a esas reglas
 * quedaron con «100» calculado sobre dos métricas; así la gráfica no los muestra aunque no se reconstruya.
 */
export function regradeDay(
  stored: readonly StoredDimension[],
  weights: Readonly<Record<string, number>>,
  rules: CoverageRules = DEFAULT_COVERAGE_RULES,
): RegradedDay {
  const dimensions: Record<string, number | null> = {};
  let weightSum = 0;
  let weighted = 0;
  for (const d of stored) {
    const enough = d.score !== null && d.total > 0 && d.scored / d.total >= rules.minDimensionCoverage;
    dimensions[d.id] = enough ? d.score : null;
    if (enough) {
      weightSum += weights[d.id] ?? 0;
      weighted += (d.score as number) * (weights[d.id] ?? 0);
    }
  }
  const totalWeight = Object.values(weights).reduce((a, w) => a + w, 0);
  const weightCoverage = totalWeight > 0 ? weightSum / totalWeight : 0;
  const overall = weightSum > 0 && weightCoverage >= rules.minWeightCoverage ? weighted / weightSum : null;
  return { overall, dimensions, weightCoverage };
}
