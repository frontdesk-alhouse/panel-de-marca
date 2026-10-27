import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, comparisonWindows, daysBetween, eachDay, todayIso } from "./dates";
import { isEmailAllowed, parseAllowlist } from "./allowlist";

test("comparisonWindows produce dos ventanas contiguas de 28 días", () => {
  const { current, previous } = comparisonWindows("2026-10-23");
  assert.deepEqual(current, { from: "2026-09-26", to: "2026-10-23" });
  assert.deepEqual(previous, { from: "2026-08-29", to: "2026-09-25" });
  assert.equal(daysBetween(current.from, current.to), 27);
  assert.equal(addDays(previous.to, 1), current.from);
});

test("eachDay incluye ambos extremos", () => {
  assert.deepEqual(eachDay({ from: "2026-02-27", to: "2026-03-01" }), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("todayIso usa la hora de CDMX, no UTC", () => {
  // 03:00 UTC del 24 = 21:00 del 23 en CDMX (UTC-6)
  assert.equal(todayIso(new Date("2026-10-24T03:00:00Z")), "2026-10-23");
});

test("allowlist ignora mayúsculas y espacios y rechaza vacíos", () => {
  const list = parseAllowlist(" Ana@Ejemplo.mx, otro@correo.com ,,");
  assert.deepEqual(list, ["ana@ejemplo.mx", "otro@correo.com"]);
  assert.equal(isEmailAllowed("ANA@ejemplo.mx", list), true);
  assert.equal(isEmailAllowed("intruso@correo.com", list), false);
  assert.equal(isEmailAllowed(undefined, list), false);
  assert.equal(isEmailAllowed("ana@ejemplo.mx", []), false);
});
