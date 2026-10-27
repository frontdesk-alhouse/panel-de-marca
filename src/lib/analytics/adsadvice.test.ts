import { test } from "node:test";
import assert from "node:assert/strict";
import { adviseCampaign, wastedTerms, type CampaignStats } from "./adsadvice";

const base: CampaignStats = { name: "Branding GDL", status: "ENABLED", reasons: [], bidding: "MAXIMIZE_CLICKS", startDate: "2026-08-01", budgetMxn: 200, cost: 0, clicks: 0, impressions: 0, conversions: 0, impressionShare: null };
const opts = { today: "2026-10-24", cplTarget: 1000, accountHasConversions: true };

test("sin conversiones en la cuenta, lo primero es medir", () => {
  assert.equal(adviseCampaign({ ...base, cost: 500, clicks: 30 }, { ...opts, accountHasConversions: false }).verdict, "medir");
});

test("campaña nueva o marcada en aprendizaje: esperar, con fecha", () => {
  const a = adviseCampaign({ ...base, startDate: "2026-10-15", cost: 900, clicks: 40 }, opts);
  assert.equal(a.verdict, "esperar");
  assert.equal(a.until, "2026-11-12");
  assert.equal(adviseCampaign({ ...base, reasons: ["BIDDING_STRATEGY_LEARNING"], cost: 5000, clicks: 300 }, opts).verdict, "esperar");
});

test("mucho gasto sin leads: pausar", () => {
  assert.equal(adviseCampaign({ ...base, cost: 4000, clicks: 180 }, opts).verdict, "pausar");
});

test("CPL alto: ajustar; CPL bueno con poco alcance: escalar", () => {
  assert.equal(adviseCampaign({ ...base, cost: 9000, clicks: 300, conversions: 3 }, opts).verdict, "ajustar");
  assert.equal(adviseCampaign({ ...base, cost: 3000, clicks: 200, conversions: 5, impressionShare: 0.3 }, opts).verdict, "escalar");
  assert.equal(adviseCampaign({ ...base, cost: 3000, clicks: 200, conversions: 5, impressionShare: 0.8 }, opts).verdict, "mantener");
});

test("términos que gastan sin leads se proponen como negativos", () => {
  const t = wastedTerms([{ term: "logo gratis", cost: 400, clicks: 20, conversions: 0 }, { term: "branding guadalajara", cost: 900, clicks: 30, conversions: 2 }, { term: "x", cost: 50, clicks: 2, conversions: 0 }], 1000);
  assert.deepEqual(t.map((x) => x.term), ["logo gratis"]);
});

test("con 3 o más leads ya se juzga aunque haya menos de 100 clics", () => {
  assert.equal(adviseCampaign({ ...base, cost: 2673, clicks: 99, conversions: 7, impressionShare: 0.32 }, opts).verdict, "escalar");
});
