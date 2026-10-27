import { test } from "node:test";
import assert from "node:assert/strict";
import { asOf, positionPoints, positioningScore, timelineDates } from "./compscore";

test("primer lugar vale 100, el 30 vale ~3 y fuera del top 30 vale 0", () => {
  assert.equal(positionPoints(1), 100);
  assert.equal(Math.round(positionPoints(30)), 3);
  assert.equal(positionPoints(31), 0);
  assert.equal(positionPoints(undefined), 0);
});

test("posicionamiento promedia todas las búsquedas medidas, incluidas las ausentes", () => {
  assert.equal(positioningScore([1, undefined]), 50);
  assert.equal(positioningScore([]), null);
});

test("asOf toma el último valor no posterior a la fecha", () => {
  const list = [{ date: "2026-10-01", value: 1 }, { date: "2026-10-05", value: 2 }];
  assert.equal(asOf(list, "2026-10-04")?.value, 1);
  assert.equal(asOf(list, "2026-09-30"), null);
});

test("la línea arranca en el inicio de la ventana solo si hay dato previo", () => {
  assert.deepEqual(timelineDates(["2026-09-01", "2026-10-10"], "2026-10-01", "2026-10-20"), ["2026-10-01", "2026-10-10"]);
  assert.deepEqual(timelineDates(["2026-10-10", "2026-10-10"], "2026-10-01", "2026-10-20"), ["2026-10-10"]);
});
