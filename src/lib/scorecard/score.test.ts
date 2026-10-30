import { test } from "node:test";
import assert from "node:assert/strict";
import { bandFor, computeScorecard as compute, DEFAULT_COVERAGE_RULES, type CoverageRules } from "./score";
import { rankLevers } from "./priorities";
import { METRICS } from "./benchmarks";
import { DIMENSIONS } from "./config";
import type { DimensionDefinition, MetricDefinition } from "./types";

const base = { source: "t", asOf: "t", own: false, ease: 2 as const, lever: "t", unit: "pct" as const };
const up: MetricDefinition = { ...base, id: "up", dimension: "conversion", label: "up", direction: "up", green: 0.04, yellow: 0.02 };
const down: MetricDefinition = { ...base, id: "down", dimension: "conversion", label: "down", direction: "down", green: 5, yellow: 60 };

test("bandas en los bordes, ambas direcciones", () => {
  assert.equal(bandFor(0.04, up), "green");
  assert.equal(bandFor(0.0399, up), "yellow");
  assert.equal(bandFor(0.02, up), "yellow");
  assert.equal(bandFor(0.0199, up), "red");
  assert.equal(bandFor(5, down), "green");
  assert.equal(bandFor(60, down), "yellow");
  assert.equal(bandFor(61, down), "red");
});

// Los casos a mano de abajo prueban la aritmética, no la compuerta: reglas sin mínimo.
const OPEN: CoverageRules = { minDimensionCoverage: 0, minWeightCoverage: 0 };
const computeScorecard = (i: Parameters<typeof compute>[0], m: MetricDefinition[], d: DimensionDefinition[]) => compute(i, m, d, OPEN);

const dims: DimensionDefinition[] = [
  { id: "conversion", label: "C", weight: 20, question: "" },
  { id: "pipeline", label: "P", weight: 10, question: "" },
  { id: "marca", label: "M", weight: 10, question: "" },
];
const metrics: MetricDefinition[] = [
  { ...up, id: "c1" },
  { ...up, id: "c2", minSample: 100 },
  { ...down, id: "p1", dimension: "pipeline" },
  { ...up, id: "m1", dimension: "marca" },
];

test("calificación a mano con cobertura parcial y renormalización", () => {
  const sc = computeScorecard(
    {
      c1: { value: 0.05 },              // verde 100
      c2: { value: 0.03, sample: 20 },  // muestra insuficiente → no puntúa
      p1: { value: 30 },                // amarillo 50
      // m1 sin datos
    },
    metrics, dims,
  );
  const byId = Object.fromEntries(sc.dimensions.map((d) => [d.definition.id, d]));
  assert.equal(byId.conversion.score, 100);
  assert.equal(byId.conversion.scored, 1);
  assert.equal(byId.pipeline.score, 50);
  assert.equal(byId.marca.score, null);
  // (100·20 + 50·10) / (20 + 10) = 83.33…
  assert.ok(Math.abs((sc.overall as number) - 2500 / 30) < 1e-9);
  assert.equal(sc.coverage, 2 / 4);
  assert.equal(sc.metrics.find((m) => m.definition.id === "c2")?.status, "insufficient");
});

test("mover un peso cambia la general como se espera", () => {
  const heavyPipeline = dims.map((d) => (d.id === "pipeline" ? { ...d, weight: 30 } : d));
  const sc = computeScorecard({ c1: { value: 0.05 }, p1: { value: 30 } }, metrics, heavyPipeline);
  // (100·20 + 50·30) / 50 = 70
  assert.equal(sc.overall, 70);
});

test("sin referencia propia no puntúa y sin datos da general nula", () => {
  const sc = computeScorecard({ c1: { value: 2, status: "no_reference" } }, metrics, dims);
  assert.equal(sc.overall, null);
  assert.equal(sc.coverage, 0);
  assert.equal(sc.metrics[0].status, "no_reference");
});

test("palancas: rojo antes que amarillo, ponderado por facilidad", () => {
  const sc = computeScorecard({ c1: { value: 0.01 }, p1: { value: 30 }, m1: { value: 0.03 } }, metrics, dims);
  const levers = rankLevers(sc);
  assert.deepEqual(levers.map((l) => l.metric.definition.id), ["c1", "m1", "p1"]);
  // c1 rojo en dimensión de peso 20 con 1 métrica calificada: 100 × 20 = 2000
  assert.equal(levers[0].impact, 2000);
});

test("el catálogo real es coherente", () => {
  const ids = new Set<string>();
  const dimIds = new Set(DIMENSIONS.map((d) => d.id));
  for (const m of METRICS) {
    assert.ok(!ids.has(m.id), `id duplicado ${m.id}`);
    ids.add(m.id);
    assert.ok(dimIds.has(m.dimension), `dimensión desconocida ${m.dimension}`);
    assert.ok(m.source.length > 0 && m.asOf.length > 0, `${m.id} sin fuente`);
    if (m.direction === "up") assert.ok(m.green >= m.yellow, `${m.id}: verde < amarillo`);
    else assert.ok(m.green <= m.yellow, `${m.id}: verde > amarillo`);
  }
  assert.equal(DIMENSIONS.reduce((a, d) => a + d.weight, 0), 100);
  for (const d of DIMENSIONS) assert.ok(METRICS.some((m) => m.dimension === d.id), `${d.id} sin métricas`);
});

test("pocas métricas verdes no dan 100: la dimensión y la general quedan sin nota", () => {
  // Una dimensión de nueve métricas con solo dos calificadas (22 %) no alcanza el 40 %.
  const many: MetricDefinition[] = Array.from({ length: 9 }, (_, i) => ({ ...up, id: `v${i}`, dimension: "conversion" as const }));
  const sc = compute({ v0: { value: 0.05 }, v1: { value: 0.05 } }, many, dims, DEFAULT_COVERAGE_RULES);
  const conv = sc.dimensions.find((d) => d.definition.id === "conversion")!;
  assert.equal(conv.score, null);
  assert.equal(conv.partial, 100);
  assert.equal(sc.overall, null);
  assert.equal(sc.weightCoverage, 0);
});

test("la general exige que las dimensiones calificadas cubran el peso mínimo", () => {
  // Solo conversión (20 de 40) está calificada: 50 % < 60 %.
  const sc = compute({ c1: { value: 0.05 } }, metrics, dims, DEFAULT_COVERAGE_RULES);
  assert.equal(sc.dimensions.find((d) => d.definition.id === "conversion")!.score, 100);
  assert.equal(sc.weightCoverage, 0.5);
  assert.equal(sc.overall, null);
  // Con pipeline también (30 de 40 = 75 %) sí se califica.
  const ok = compute({ c1: { value: 0.05 }, p1: { value: 30 } }, metrics, dims, DEFAULT_COVERAGE_RULES);
  assert.equal(ok.weightCoverage, 0.75);
  assert.ok(Math.abs((ok.overall as number) - 2500 / 30) < 1e-9);
});
