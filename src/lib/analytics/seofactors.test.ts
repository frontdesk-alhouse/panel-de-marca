import { test } from "node:test";
import assert from "node:assert/strict";
import { factorScores, freshness, logScale, seoStrength } from "./seofactors";

test("la escala logarítmica llega a 1 en el tope y no pasa de ahí", () => {
  assert.equal(logScale(0, 100), 0);
  assert.equal(logScale(100, 100), 1);
  assert.equal(logScale(500, 100), 1);
  assert.ok(logScale(10, 100) > 0.45 && logScale(10, 100) < 0.6);
});

test("frescura por días desde la última página actualizada", () => {
  assert.equal(freshness(10), 1);
  assert.equal(freshness(60), 0.6);
  assert.equal(freshness(400), 0);
  assert.equal(freshness(undefined), null);
});

test("sin perfil en Google Maps el factor local vale 0, no «sin dato»", () => {
  assert.equal(factorScores({ gbpFound: 0 }).local, 0);
  assert.equal(factorScores({}).local, null);
  assert.ok((factorScores({ gbpFound: 1, gbpRating: 5, gbpReviews: 31 }).local ?? 0) > 80);
});

test("técnico necesita al menos 4 chequeos y un solo H1 cuenta como acierto", () => {
  assert.equal(factorScores({ https: 1, sitemap: 1, indexable: 1 }).technical, null);
  assert.equal(factorScores({ https: 1, sitemap: 1, indexable: 1, h1: 1 }).technical, 100);
  assert.equal(factorScores({ https: 1, sitemap: 1, indexable: 1, h1: 3 }).technical, 75);
});

test("la fuerza reescala sobre lo medido y reporta cobertura", () => {
  const r = seoStrength({ content: 50, authority: null, local: null, technical: 100, experience: null, trust: null });
  assert.equal(r.score, 66.7);
  assert.equal(r.coverage, 0.45);
  assert.equal(seoStrength({ content: null, authority: null, local: null, technical: null, experience: null, trust: null }).score, null);
});
