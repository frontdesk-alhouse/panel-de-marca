import type {
  Band, DimensionDefinition, DimensionResult, MetricDefinition, MetricInput, MetricResult, Scorecard,
} from "./types";

const BAND_SCORE: Record<Band, number> = { green: 100, yellow: 50, red: 0 };

export function bandFor(value: number, def: Pick<MetricDefinition, "direction" | "green" | "yellow">): Band {
  if (def.direction === "up") {
    if (value >= def.green) return "green";
    return value >= def.yellow ? "yellow" : "red";
  }
  if (value <= def.green) return "green";
  return value <= def.yellow ? "yellow" : "red";
}

export function scoreMetric(def: MetricDefinition, input: MetricInput | undefined): MetricResult {
  if (!input || input.value === null || !Number.isFinite(input.value)) {
    return { definition: def, value: null, sample: input?.sample, status: input?.status ?? "no_data" };
  }
  if (input.status) {
    return { definition: def, value: input.value, sample: input.sample, status: input.status };
  }
  if (def.minSample !== undefined && (input.sample ?? 0) < def.minSample) {
    return { definition: def, value: input.value, sample: input.sample, status: "insufficient" };
  }
  const band = bandFor(input.value, def);
  return { definition: def, value: input.value, sample: input.sample, status: "scored", band, score: BAND_SCORE[band] };
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * Cuánta evidencia hace falta para dar una nota. Sin esto, dos métricas en verde de una
 * dimensión de nueve (o una sola dimensión de siete) se leían como «100».
 */
export interface CoverageRules {
  /** Parte mínima de las métricas de una dimensión que debe estar calificada para darle nota. */
  minDimensionCoverage: number;
  /** Parte mínima del peso total que debe estar en dimensiones calificadas para dar la general. */
  minWeightCoverage: number;
}

export const DEFAULT_COVERAGE_RULES: CoverageRules = { minDimensionCoverage: 0.4, minWeightCoverage: 0.6 };

/**
 * Métrica sin datos, con muestra insuficiente o sin referencia no puntúa y no cuenta como buena:
 * si la dimensión no tiene base suficiente queda sin nota, y si las dimensiones calificadas no
 * cubren suficiente peso, la general queda sin nota. `partial` conserva lo poco medido.
 */
export function computeScorecard(
  inputs: Record<string, MetricInput>,
  metrics: MetricDefinition[],
  dimensions: DimensionDefinition[],
  rules: CoverageRules = DEFAULT_COVERAGE_RULES,
): Scorecard {
  const results = metrics.map((def) => scoreMetric(def, inputs[def.id]));

  const dimensionResults: DimensionResult[] = dimensions.map((dim) => {
    const own = results.filter((r) => r.definition.dimension === dim.id);
    const scored = own.filter((r) => r.status === "scored").map((r) => r.score as number);
    const partial = mean(scored);
    const enough = scored.length > 0 && scored.length / own.length >= rules.minDimensionCoverage;
    return { definition: dim, score: enough ? partial : null, partial, scored: scored.length, total: own.length };
  });

  const totalWeight = dimensions.reduce((a, d) => a + d.weight, 0);
  const weighted = dimensionResults.filter((d) => d.score !== null && d.definition.weight > 0);
  const weightSum = weighted.reduce((a, d) => a + d.definition.weight, 0);
  const weightCoverage = totalWeight > 0 ? weightSum / totalWeight : 0;
  const overall = weightSum > 0 && weightCoverage >= rules.minWeightCoverage
    ? weighted.reduce((a, d) => a + (d.score as number) * d.definition.weight, 0) / weightSum
    : null;

  const scoredCount = results.filter((r) => r.status === "scored").length;
  return {
    overall,
    coverage: results.length ? scoredCount / results.length : 0,
    weightCoverage,
    dimensions: dimensionResults,
    metrics: results,
  };
}
