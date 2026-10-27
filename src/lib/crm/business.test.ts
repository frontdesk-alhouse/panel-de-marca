import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBusiness, type BizLead } from "./business";

const now = new Date("2026-10-25T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const lead = (o: Partial<BizLead>): BizLead => ({
  createdAt: daysAgo(30), stage: "nuevo", qualified: null, value: null, channel: "otro", proposalAt: null,
  closedAt: null, outcome: null, retainer: false, monthlyFee: null, company: "X", contactName: null, ...o,
});
const metric = (b: ReturnType<typeof computeBusiness>, k: string) => b.metrics.find((m) => m.key === k)!;

test("win rate y ciclo salen de los cierres de la ventana", () => {
  const b = computeBusiness([
    lead({ createdAt: daysAgo(60), stage: "cerrado", outcome: "ganado", closedAt: daysAgo(20), value: 90_000, qualified: true, proposalAt: daysAgo(30) }),
    lead({ stage: "perdido", outcome: "perdido", closedAt: daysAgo(5), qualified: true, proposalAt: daysAgo(10) }),
  ], { paidMxn: 0 }, now);
  assert.equal(metric(b, "win_rate").value, 0.5);
  assert.equal(metric(b, "sales_cycle").value, 40);
  assert.equal(metric(b, "avg_deal").value, 90_000);
  assert.equal(metric(b, "roas").value, null);
});

test("sin gasto no inventa CAC ni costo por calificado", () => {
  const b = computeBusiness([lead({ channel: "ads", qualified: true })], { paidMxn: 0 }, now);
  assert.equal(metric(b, "cac").status, "nodata");
  assert.equal(metric(b, "cost_per_qualified_lead").value, null);
});

test("costo por lead calificado, CAC y ROAS de anuncios", () => {
  const b = computeBusiness([
    lead({ channel: "ads", qualified: true }),
    lead({ channel: "meta", qualified: true, stage: "cerrado", outcome: "ganado", closedAt: daysAgo(2), value: 60_000 }),
    lead({ channel: "referido", qualified: true }),
  ], { paidMxn: 6_000 }, now);
  assert.equal(metric(b, "cost_per_qualified_lead").value, 3_000);
  assert.equal(metric(b, "cac").value, 6_000);
  assert.equal(metric(b, "roas").value, 10);
  assert.equal(metric(b, "cac").status, "few");
});

test("pipeline ponderado por etapa y concentración del cliente más grande", () => {
  const b = computeBusiness([
    lead({ stage: "propuesta", value: 100_000 }),
    lead({ stage: "nuevo", value: 50_000 }),
    lead({ company: "A", stage: "cerrado", outcome: "ganado", closedAt: daysAgo(100), value: 75_000 }),
    lead({ company: "B", stage: "cerrado", outcome: "ganado", closedAt: daysAgo(200), value: 25_000 }),
  ], { paidMxn: 0 }, now);
  assert.equal(b.pipeline.weighted, 55_000);
  assert.equal(metric(b, "client_concentration").value, 0.75);
  assert.equal(metric(b, "client_concentration").status, "few");
});

test("con pocos casos la tasa se marca como pocos datos, no como mala", () => {
  const b = computeBusiness([lead({})], { paidMxn: 0 }, now);
  assert.equal(metric(b, "qualified_rate").value, 0);
  assert.equal(metric(b, "qualified_rate").status, "few");
});
