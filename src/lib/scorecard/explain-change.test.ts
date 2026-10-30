import { test } from "node:test";
import assert from "node:assert/strict";
import { explainChange, referencePoint, type ExplainMeta, type ExplainPoint } from "./explain-change";
import { regradeDay } from "./history";

const meta: ExplainMeta = {
  dimensions: [{ id: "a", label: "Área A", weight: 20 }, { id: "b", label: "Área B", weight: 10 }],
  metrics: [{ id: "m1", label: "Métrica 1", dimension: "a" }, { id: "m2", label: "Métrica 2", dimension: "a" }],
};
const pt = (date: string, overall: number | null, a: number | null, b: number | null, m1: number | null, m2: number | null): ExplainPoint =>
  ({ date, overall, dimensions: { a, b }, metrics: { m1, m2 } });
const points = [pt("2026-10-01", 40, 50, 20, 50, 50), pt("2026-10-20", 45, 50, 35, 50, 50), pt("2026-10-29", 62, 80, 35, 100, 50)];

test("la referencia es el día guardado más cercano a 7 días antes", () => {
  assert.equal(referencePoint(points, "2026-10-29")?.date, "2026-10-20");
  assert.equal(referencePoint(points, "2026-10-01"), null);
  assert.equal(referencePoint(points, "2026-10-03")?.date, "2026-10-01");
});

test("General: nombra el área que movió la nota", () => {
  const e = explainChange(points, "2026-10-29", "overall", meta)!;
  assert.equal(e.delta, 17);
  assert.equal(e.drivers[0].label, "Área A");
  assert.equal(e.drivers[0].direction, "up");
  assert.equal(e.drivers[0].change, "50 → 80");
});

test("Área: nombra la métrica que cambió de color", () => {
  const e = explainChange(points, "2026-10-29", "a", meta)!;
  assert.deepEqual(e.drivers.map((d) => [d.label, d.change]), [["Métrica 1", "amarillo → verde"]]);
});

test("entrar o salir de la calificación se explica, no se esconde", () => {
  const pts = [pt("2026-10-01", 40, 50, 20, 50, 50), pt("2026-10-29", null, 50, null, 50, 50)];
  const e = explainChange(pts, "2026-10-29", "overall", meta)!;
  assert.equal(e.delta, null);
  assert.match(e.drivers[0].change, /dejó de calificarse/);
});

test("el primer día no tiene con qué compararse", () => {
  const e = explainChange(points, "2026-10-01", "overall", meta)!;
  assert.equal(e.delta, null);
  assert.deepEqual(e.drivers, []);
});

test("un día viejo con 100 sobre pocas métricas deja de contar", () => {
  const weights = { a: 20, b: 10, c: 70 };
  // a: 1 de 9 métricas (11 %), el resto sin datos → no alcanza.
  const day = regradeDay([{ id: "a", score: 100, scored: 1, total: 9 }, { id: "b", score: 100, scored: 3, total: 4 }], weights);
  assert.equal(day.dimensions.a, null);
  assert.equal(day.dimensions.b, 100);
  assert.equal(day.overall, null); // solo b: 10 % del peso
});
