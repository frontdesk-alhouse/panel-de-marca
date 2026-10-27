import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInputs, expectedCtr, isBrandQuery } from "./inputs";
import type { AggRow, LeadLite, RawWindows } from "./raw";

const row = (source: string, metric: string, dimKey: string, value: number): AggRow => ({ source, metric, dimKey, value });
const empty: RawWindows = { current: [], previous: [], pipeline: [], latest: [], latestAtPreviousEnd: [] };

test("búsquedas de marca se detectan sin importar mayúsculas", () => {
  assert.equal(isBrandQuery("query:Estudio Ejemplo Guadalajara"), true);
  assert.equal(isBrandQuery("query:agencia de branding"), false);
  assert.equal(expectedCtr(1), 0.28);
  assert.equal(expectedCtr(7), 0.04);
});

test("visibilidad: CTR de marca y CTR no-marca vs esperado", () => {
  const current = [
    row("gsc", "clicks", "query:estudio ejemplo", 60), row("gsc", "impressions", "query:estudio ejemplo", 100),
    row("gsc", "position_weighted", "query:estudio ejemplo", 110),
    // no-marca en pos. 2 (esperado 15 %): 300 impr × 0.15 = 45 esperados, 30 reales → 0.667
    row("gsc", "clicks", "query:branding gdl", 30), row("gsc", "impressions", "query:branding gdl", 300),
    row("gsc", "position_weighted", "query:branding gdl", 600),
    // fuera del top 10: no cuenta
    row("gsc", "clicks", "query:diseño web", 1), row("gsc", "impressions", "query:diseño web", 500),
    row("gsc", "position_weighted", "query:diseño web", 12500),
  ];
  const i = buildInputs({ ...empty, current }, []);
  assert.equal(i.brand_ctr.value, 0.6);
  assert.equal(i.brand_position.value, 1.1);
  assert.ok(Math.abs((i.nonbrand_ctr_vs_expected.value as number) - 30 / 45) < 1e-9);
  assert.equal(i.nonbrand_ctr_vs_expected.sample, 300);
  assert.equal(i.nonbrand_top10_queries.value, 1);
});

test("adquisición: proporción no pagada y delta de sesiones", () => {
  const current = [
    row("ga4", "sessions", "", 1000), row("ga4", "engaged_sessions", "", 550),
    row("ga4", "sessions", "channel:Paid Search", 300), row("ga4", "sessions", "channel:Organic Search", 500),
  ];
  const previous = [row("ga4", "sessions", "", 800)];
  const i = buildInputs({ ...empty, current, previous }, []);
  assert.equal(i.non_paid_share.value, 0.7);
  assert.equal(i.sessions_delta.value, 0.25);
  assert.equal(i.engagement_rate.value, 0.55);
});

test("sin datos queda null; el CPL se compara contra el objetivo propio", () => {
  const i = buildInputs({ ...empty, current: [row("gads", "cost_mxn", "", 1000), row("gads", "conversions", "", 4)] }, []);
  assert.equal(i.site_conversion.value, null);
  // $1,000 / 4 leads = $250 por lead contra el objetivo de $500 → 0.5
  assert.equal(i.cpl_vs_target.value, 0.5);
  assert.equal(i.cac_vs_ticket.value, null);
});

test("un delta sobre un periodo previo diminuto no se califica", async () => {
  const { computeScorecard } = await import("./score");
  const { METRICS } = await import("./benchmarks");
  const { DIMENSIONS } = await import("./config");
  const i = buildInputs({ ...empty, current: [row("ga4", "sessions", "", 263)], previous: [row("ga4", "sessions", "", 5)] }, []);
  const m = computeScorecard(i, METRICS, DIMENSIONS).metrics.find((x) => x.definition.id === "sessions_delta");
  assert.equal(m?.status, "insufficient");
});

test("sin eventos clave con visitas: la conversión queda «no se está midiendo»", () => {
  const current = [row("ga4", "sessions", "", 263), row("ga4", "key_events", "", 0)];
  const i = buildInputs({ ...empty, current }, []);
  assert.equal(i.site_conversion.status, "not_tracked");
  assert.equal(i.site_conversion.value, null);
});

test("pipeline: mediana de respuesta, calificados y cierre de propuestas", () => {
  const t0 = new Date("2026-10-01T10:00:00Z");
  const at = (min: number) => new Date(t0.getTime() + min * 60_000);
  const lead = (p: Partial<LeadLite>): LeadLite => ({
    createdAt: t0, firstContactAt: null, proposalAt: null, stage: "nuevo", qualified: null, value: null, package: null, ...p,
  });
  const leads = [
    lead({ firstContactAt: at(4), qualified: true, proposalAt: at(100), stage: "cerrado", package: "completo" }),
    lead({ firstContactAt: at(30), qualified: true, proposalAt: at(100), stage: "perdido" }),
    lead({ firstContactAt: at(120), qualified: false }),
  ];
  const pipelineRows = [row("gads", "cost_mxn", "", 9000)];
  const i = buildInputs({ ...empty, pipeline: pipelineRows }, leads);
  assert.equal(i.speed_to_lead.value, 30);
  assert.ok(Math.abs((i.lead_qualified_rate.value as number) - 2 / 3) < 1e-9);
  assert.equal(i.proposal_close_rate.value, 0.5);
  // CAC 9,000 / ticket Completo 90,000 = 10 %
  assert.equal(i.cac_vs_ticket.value, 0.1);
});

test("experiencia: el peor estado de Core Web Vitals manda", () => {
  const latest = [
    row("psi", "lcp_ms", "mobile:/", 2100), row("psi", "inp_ms", "mobile:/", 350), row("psi", "cls", "mobile:/", 0.05),
    row("psi", "lcp_ms", "desktop:/", 9000),
  ];
  assert.equal(buildInputs({ ...empty, latest }, []).cwv_status.value, 1);
});
