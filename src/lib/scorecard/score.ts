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
 * Métrica sin datos, con muestra insuficiente o sin referencia no puntúa: se
 * excluye y los pesos se renormalizan. La cobertura dice qué parte se calificó.
 */
export function computeScorecard(
  inputs: Record<string, MetricInput>,
  metrics: MetricDefinition[],
  dimensions: DimensionDefinition[],
): Scorecard {
  const results = metrics.map((def) => scoreMetric(def, inputs[def.id]));

  const dimensionResults: DimensionResult[] = dimensions.map((dim) => {
    const own = results.filter((r) => r.definition.dimension === dim.id);
    const scored = own.filter((r) => r.status === "scored").map((r) => r.score as number);
    return { definition: dim, score: mean(scored), scored: scored.length, total: own.length };
  });

  const weighted = dimensionResults.filter((d) => d.score !== null && d.definition.weight > 0);
  const weightSum = weighted.reduce((a, d) => a + d.definition.weight, 0);
  const overall = weightSum > 0
    ? weighted.reduce((a, d) => a + (d.score as number) * d.definition.weight, 0) / weightSum
    : null;

  const scoredCount = results.filter((r) => r.status === "scored").length;
  return {
    overall,
    coverage: results.length ? scoredCount / results.length : 0,
    dimensions: dimensionResults,
    metrics: results,
  };
}
