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
 * Cuánta evidencia hace falta para que el promedio de un área sea una medición y no una anécdota.
 * Sin esto, dos métricas en verde de una área de nueve se leían como «100».
 */
export interface CoverageRules {
  /** Parte mínima de las métricas de un área que debe estar calificada para tomar su promedio. */
  minDimensionCoverage: number;
}

export const DEFAULT_COVERAGE_RULES: CoverageRules = { minDimensionCoverage: 0.4 };

/**
 * Un área sin base suficiente (sin datos, sin tráfico, sin conectar) vale 0 y cuenta con su peso
 * completo: no hay huecos ni áreas que «desaparecen» de la nota. `rated` dice si el número viene de
 * una medición o de ese cero por falta de base; `partial` conserva lo poco medido.
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
    const rated = scored.length > 0 && scored.length / own.length >= rules.minDimensionCoverage;
    return { definition: dim, score: rated ? (partial as number) : 0, rated, partial, scored: scored.length, total: own.length };
  });

  const totalWeight = dimensions.reduce((a, d) => a + d.weight, 0);
  const weightSum = dimensionResults.filter((d) => d.rated).reduce((a, d) => a + d.definition.weight, 0);
  const weightCoverage = totalWeight > 0 ? weightSum / totalWeight : 0;
  const overall = totalWeight > 0
    ? dimensionResults.reduce((a, d) => a + d.score * d.definition.weight, 0) / totalWeight
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
