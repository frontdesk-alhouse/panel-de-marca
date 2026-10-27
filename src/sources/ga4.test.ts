import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsFromEvents, rowsFromReport, SPECS } from "./ga4";
import { parseHome } from "./competitors";

const r = (dims: string[], vals: number[]) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: vals.map((v) => ({ value: String(v) })) });

test("el reporte por canal suma el total del día", () => {
  const spec = SPECS[0];
  const rows = rowsFromReport(spec, { rows: [r(["20261022", "Paid Search"], [10, 5, 0, 300, 9]), r(["20261022", "Direct"], [4, 2, 1, 100, 3])] });
  const total = rows.find((x) => x.metric === "sessions" && x.dimKey === "");
  assert.equal(total?.value, 14);
  assert.equal(total?.date, "2026-10-22");
  assert.ok(rows.some((x) => x.dimKey === "channel:Direct" && x.metric === "key_events" && x.value === 1));
});

test("las vistas por página no generan totales que choquen con los del canal", () => {
  const pageSpec = SPECS.find((s) => s.prefix === "page")!;
  const rows = rowsFromReport(pageSpec, { rows: [r(["20261022", "/"], [20, 400])] });
  const totals = rows.filter((x) => x.dimKey === "").map((x) => x.metric);
  assert.deepEqual(totals.sort(), ["page_engagement_seconds", "page_views"]);
});

test("eventos por página: métrica event_<nombre> y total del día", () => {
  const rows = rowsFromEvents({ rows: [r(["20261023", "generate_lead", "/lets-work"], [2]), r(["20261023", "generate_lead", "/en/lets-work"], [1])] });
  assert.equal(rows.find((x) => x.dimKey === "")?.value, 3);
  assert.ok(rows.every((x) => x.metric === "event_generate_lead"));
});

test("señales básicas de SEO en el HTML", () => {
  const h = parseHome('<title>Estudio</title><meta name="description" content="Brand management y posicionamiento para marcas"><script type="application/ld+json">{}</script><h1>A</h1><h1 class="x">B</h1>');
  assert.deepEqual([h.title, h.has_meta_description, h.has_schema, h.h1_count], ["Estudio", 1, 1, 2]);
});
