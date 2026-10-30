import { test } from "node:test";
import assert from "node:assert/strict";
import { changeImpact } from "./impact";

const points = [
  { date: "2026-09-01", value: 40 },
  { date: "2026-09-29", value: 52 },
  { date: "2026-10-10", value: 55 },
];
const a = { id: 1, date: "2026-09-02", kind: "propio" as const, title: "Schema Organization" };
const b = { id: 2, date: "2026-09-10", kind: "externo" as const, title: "Core update de Google" };
const c = { id: 3, date: "2026-10-20", kind: "propio" as const, title: "Formulario más corto" };

test("mide antes y 28 días después, y avisa de cambios encimados", () => {
  const r = changeImpact(a, points, [a, b, c], "2026-10-29");
  assert.equal(r.status, "measured");
  if (r.status !== "measured") return;
  assert.equal(r.before, 40);
  assert.equal(r.after, 52);
  assert.equal(r.delta, 12);
  assert.deepEqual(r.overlapping.map((x) => x.id), [2]);
});

test("antes de 28 días no se juzga", () => {
  assert.deepEqual(changeImpact(c, points, [c], "2026-10-29"), { status: "pending", daysLeft: 19 });
});

test("sin calificación cerca de las fechas no hay medición", () => {
  assert.deepEqual(changeImpact({ ...a, date: "2026-07-01" }, points, [], "2026-10-29"), { status: "no_data" });
});
