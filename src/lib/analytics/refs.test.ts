import { test } from "node:test";
import assert from "node:assert/strict";
import { INDUSTRY, ownRef } from "./refs";

test("sin historia suficiente dice cuántos días faltan", () => {
  const r = ownRef({ kind: "count", current: 263, hist: { values: { sessions: 20 }, days: 9 }, metric: "sessions", periodDays: 28, comparable: false });
  assert.match(r.text, /se forma con el tiempo \(9 de 28 días/);
});

test("el promedio de conteos se escala al largo del periodo", () => {
  // 600 visitas en 60 días = 280 en 28 días
  const r = ownRef({ kind: "count", current: 263, hist: { values: { sessions: 600 }, days: 60 }, metric: "sessions", periodDays: 28, comparable: false });
  assert.match(r.text, /tu promedio histórico: 280/);
});

test("rebote = 1 - interacción y baja es buena", () => {
  const r = ownRef({ kind: "pct", current: 0.4, previous: 0.5, hist: { values: { engaged_sessions: 55, sessions: 100 }, days: 60 }, ratio: ["engaged_sessions", "sessions"], invert: true, periodDays: 28, comparable: true, higherIsBetter: false });
  assert.match(r.text, /tu promedio histórico: 45 %/);
  assert.equal(r.tone, "good");
});

test("bandas de industria: interacción y posición", () => {
  assert.equal(INDUSTRY.engagement(0.56).tone, "good");
  assert.equal(INDUSTRY.engagement(0.5).tone, "watch");
  assert.equal(INDUSTRY.position(9.3).tone, "good");
  assert.equal(INDUSTRY.position(25).tone, "bad");
});
