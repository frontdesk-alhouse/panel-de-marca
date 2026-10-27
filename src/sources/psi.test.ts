import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePsi } from "./psi";

const byMetric = (rows: ReturnType<typeof parsePsi>) => Object.fromEntries(rows.map((r) => [r.metric, r.value]));

test("con datos de campo usa CrUX y convierte CLS", () => {
  const rows = parsePsi({
    loadingExperience: { metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2300 },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
    } },
    lighthouseResult: { categories: { seo: { score: 0.92 }, accessibility: { score: 0.86 }, performance: { score: 0.71 } } },
  }, "mobile:/", "2026-10-22");
  const m = byMetric(rows);
  assert.equal(m.lcp_ms, 2300);
  assert.equal(m.inp_ms, 180);
  assert.equal(m.cls, 0.05);
  assert.equal(m.lighthouse_seo, 92);
  assert.equal(rows[0].meta?.measurement, "field");
});

test("sin campo cae a laboratorio, sin INP, y lo marca", () => {
  const rows = parsePsi({
    lighthouseResult: {
      categories: { seo: { score: 1 }, accessibility: { score: null } },
      audits: { "largest-contentful-paint": { numericValue: 3100 }, "cumulative-layout-shift": { numericValue: 0.02 } },
    },
  }, "mobile:/services", "2026-10-22");
  const m = byMetric(rows);
  assert.equal(m.lcp_ms, 3100);
  assert.equal(m.inp_ms, undefined);
  assert.equal(m.lighthouse_a11y, undefined);
  assert.ok(rows.every((r) => r.meta?.measurement === "lab"));
});

test("la rotación cubre todas las páginas en días consecutivos", async () => {
  const { rotatingJob } = await import("./psi");
  const seen = new Set(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map((d) => rotatingJob(d).join(" ")));
  assert.equal(seen.size, 4);
});
