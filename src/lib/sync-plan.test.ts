import { test } from "node:test";
import assert from "node:assert/strict";
import { groupOf, isLiveRun, manualPlan, LIVE_RUN_MS } from "./sync-plan";

const sources = ["serp", "ga4", "comp", "gsc", "clarity"].map((id) => ({ id, label: id, group: groupOf(id) }));

test("sin competencia solo corre lo propio, en el mismo orden", () => {
  assert.deepEqual(manualPlan(sources, false).map((s) => s.id), ["ga4", "gsc", "clarity"]);
});

test("con competencia corre todo lo configurado", () => {
  assert.equal(manualPlan(sources, true).length, 5);
});

test("una corrida reciente está viva; una vieja se dio por cortada", () => {
  const now = Date.now();
  assert.equal(isLiveRun({ status: "running", startedAt: new Date(now - 1000) }, now), true);
  assert.equal(isLiveRun({ status: "running", startedAt: new Date(now - LIVE_RUN_MS - 1) }, now), false);
  assert.equal(isLiveRun({ status: "ok", startedAt: new Date(now) }, now), false);
});
