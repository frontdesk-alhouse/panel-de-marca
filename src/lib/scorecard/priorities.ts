import type { MetricResult, Scorecard } from "./types";

export interface Lever {
  metric: MetricResult;
  /** Brecha hasta verde × peso que la métrica aporta a la calificación general */
  impact: number;
  priority: number;
}

/**
 * Palancas: métricas en rojo o amarillo ordenadas por impacto × facilidad.
 * Impacto = puntos que faltan para verde × (peso de la dimensión / métricas calificadas en ella).
 */
export function rankLevers(scorecard: Scorecard, limit = 3): Lever[] {
  const levers: Lever[] = [];
  for (const metric of scorecard.metrics) {
    if (metric.status !== "scored" || metric.band === "green") continue;
    const dim = scorecard.dimensions.find((d) => d.definition.id === metric.definition.dimension);
    if (!dim || dim.scored === 0) continue;
    const impact = (100 - (metric.score as number)) * (dim.definition.weight / dim.scored);
    levers.push({ metric, impact, priority: impact * metric.definition.ease });
  }
  return levers
    .sort((a, b) => b.priority - a.priority || a.metric.definition.id.localeCompare(b.metric.definition.id))
    .slice(0, limit);
}
