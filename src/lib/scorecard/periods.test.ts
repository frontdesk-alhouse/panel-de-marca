import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, bucketEnd, bucketLabel, bucketStart } from "./periods";

test("inicio y fin de cada periodo", () => {
  assert.equal(bucketStart("2026-10-29", "week"), "2026-10-26"); // jueves → lunes
  assert.equal(bucketStart("2026-11-01", "week"), "2026-10-26"); // domingo
  assert.equal(bucketStart("2026-10-29", "month"), "2026-10-01");
  assert.equal(bucketStart("2026-10-29", "quarter"), "2026-10-01");
  assert.equal(bucketStart("2026-08-29", "quarter"), "2026-07-01");
  assert.equal(bucketStart("2026-08-29", "semester"), "2026-07-01");
  assert.equal(bucketStart("2026-03-29", "semester"), "2026-01-01");
  assert.equal(bucketEnd("2026-10-01", "quarter"), "2026-12-31");
  assert.equal(bucketEnd("2026-02-01", "month"), "2026-02-28");
  assert.equal(bucketEnd("2026-07-01", "semester"), "2026-12-31");
  assert.equal(bucketEnd("2026-01-01", "year"), "2026-12-31");
  assert.equal(bucketLabel("2026-10-01", "quarter"), "Q4 2026");
  assert.equal(bucketLabel("2026-07-01", "semester"), "S2 2026");
});

const day = (date: string, overall: number, a: number, m1: number | null) =>
  ({ date, overall, dimensions: { a }, metrics: { m1 } });

test("promedia los días del periodo y marca el que sigue en curso", () => {
  const pts = [day("2026-09-29", 0, 0, null), day("2026-10-01", 40, 20, 50), day("2026-10-02", 60, 40, 100), day("2026-10-29", 50, 30, null)];
  const m = aggregate(pts, "month", "2026-10-29");
  assert.equal(m.length, 2);
  assert.equal(m[0].overall, 0);
  assert.equal(m[0].inProgress, false);
  assert.equal(m[1].overall, 50); // (40+60+50)/3
  assert.equal(m[1].dimensions.a, 30);
  assert.equal(m[1].metrics.m1, 75); // el día sin nota de la métrica no cuenta
  assert.equal(m[1].days, 3);
  assert.equal(m[1].inProgress, true);
  assert.equal(aggregate(pts, "day", "2026-10-29").length, 4);
});
