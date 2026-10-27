import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClarity, type ClarityBlock } from "./clarity";

const blocks: ClarityBlock[] = [
  { metricName: "Traffic", information: [{ totalSessionCount: "200", totalBotSessionCount: "20", distantUserCount: "150", PagesPerSessionPercentage: 1.8, Url: "https://ejemplo.mx/lets-work" }] },
  { metricName: "Rage Click Count", information: [{ sessionsCount: "200", sessionsWithMetricPercentage: 5, Url: "https://ejemplo.mx/lets-work" }] },
  { metricName: "Scroll Depth", information: [{ averageScrollDepth: 40, Url: "https://ejemplo.mx/lets-work" }] },
  { metricName: "Engagement Time", information: [{ totalTime: "90", activeTime: "30", Url: "https://ejemplo.mx/lets-work" }] },
];

test("convierte porcentajes en sesiones y agrupa por ruta", () => {
  const rows = parseClarity(blocks, "url", "2026-10-23");
  const v = (m: string) => rows.find((r) => r.metric === m)?.value;
  assert.equal(rows[0].dimKey, "url:/lets-work");
  assert.equal(v("sessions"), 200);
  assert.equal(v("rage_sessions"), 10);
  assert.equal(v("scroll_weighted"), 80);
  assert.equal(v("active_time_s"), 6000);
});

test("sin dimensión guarda totales con dim vacío", () => {
  const rows = parseClarity([{ metricName: "Traffic", information: [{ totalSessionCount: 50 }] }], "", "2026-10-23");
  assert.deepEqual(rows.map((r) => [r.metric, r.dimKey, r.value]), [["sessions", "", 50]]);
});

test("URLs distintas de la misma ruta se suman en una sola fila", () => {
  const rows = parseClarity([{ metricName: "Traffic", information: [
    { totalSessionCount: "10", Url: "https://ejemplo.mx/?utm_source=google" },
    { totalSessionCount: "5", Url: "https://ejemplo.mx/" },
  ] }], "url", "2026-10-23");
  const sessions = rows.filter((r) => r.metric === "sessions");
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].value, 15);
});
