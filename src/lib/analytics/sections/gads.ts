import { ownTargets } from "@/lib/scorecard/config";
import { todayIso } from "@/lib/dates";
import { formatMoney, formatPct } from "@/lib/format";
import { breakdown, latestByDim, totals } from "../query";
import { adviseCampaign, wastedTerms, type Advice, type CampaignStats } from "../adsadvice";
import { rankInsights, safeDiv, type Insight } from "../insights";
import type { Period } from "../period";

const M = ["cost_mxn", "clicks", "impressions", "conversions"];

export interface CampaignRow extends CampaignStats { advice: Advice; prevCost: number; cpl: number | null }

/** Google Ads directo: inversión, costo por lead, campañas con recomendación y términos que desperdician. */
export async function loadGoogleAds(p: Period) {
  const [cur, prev, campaigns, terms, latest] = await Promise.all([
    totals("gads", M, p.current), totals("gads", M, p.previous),
    breakdown("gads", "campaign", M, p.current, p.previous),
    breakdown("gads", "term", ["cost_mxn", "clicks", "conversions"], p.current, p.previous),
    latestByDim("gads", "campaign"),
  ]);
  const connected = Object.keys(cur).length > 0 || latest.size > 0;
  const today = todayIso();
  const cplTarget = ownTargets().cplTargetMxn;
  const accountHasConversions = (cur.conversions ?? 0) + (prev.conversions ?? 0) > 0;

  const rows: CampaignRow[] = campaigns.map((c) => {
    const info = (latest.get(c.key)?.meta.campaign_info ?? {}) as { status?: string; primaryStatus?: string; reasons?: string[]; bidding?: string; startDate?: string };
    const stats: CampaignStats = {
      name: c.key, status: info.status ?? null, reasons: [...(info.reasons ?? []), ...(info.primaryStatus ? [info.primaryStatus] : [])], bidding: info.bidding ?? null, startDate: info.startDate ?? null,
      budgetMxn: latest.get(c.key)?.values.campaign_info ?? null,
      cost: c.cur.cost_mxn ?? 0, clicks: c.cur.clicks ?? 0, impressions: c.cur.impressions ?? 0, conversions: c.cur.conversions ?? 0,
      impressionShare: latest.get(c.key)?.values.impression_share ?? null,
    };
    return { ...stats, prevCost: c.prev.cost_mxn ?? 0, cpl: safeDiv(stats.cost, stats.conversions), advice: adviseCampaign(stats, { today, cplTarget, accountHasConversions }) };
  }).sort((a, b) => b.cost - a.cost);

  const termStats = terms.map((t) => ({ term: t.key, cost: t.cur.cost_mxn ?? 0, clicks: t.cur.clicks ?? 0, conversions: t.cur.conversions ?? 0 }));
  const wasted = wastedTerms(termStats, cplTarget);
  const kpis = {
    cost: cur.cost_mxn ?? null, clicks: cur.clicks ?? null, impressions: cur.impressions ?? null, conversions: cur.conversions ?? null,
    cpc: safeDiv(cur.cost_mxn, cur.clicks), ctr: safeDiv(cur.clicks, cur.impressions), cpl: safeDiv(cur.cost_mxn, cur.conversions),
    prevCost: prev.cost_mxn ?? null,
  };

  const out: Insight[] = [];
  for (const r of rows) {
    const tone = r.advice.verdict === "pausar" || r.advice.verdict === "medir" ? "bad" : r.advice.verdict === "ajustar" || r.advice.verdict === "esperar" ? "watch" : "good";
    out.push({ tone, weight: tone === "bad" ? 3 : 2, anchor: "campanas", title: `${r.name}: ${r.advice.title}`, detail: r.advice.detail });
  }
  const wastedCost = wasted.reduce((s, t) => s + t.cost, 0);
  if (wasted.length) out.push({ tone: "bad", weight: 2, anchor: "terminos", title: `${wasted.length} términos gastaron ${formatMoney(wastedCost)} sin traer un lead.`, detail: "Revísalos: si no son tu cliente, agrégalos como palabras negativas." });
  if (kpis.ctr !== null && kpis.ctr < 0.03 && (kpis.impressions ?? 0) > 500) out.push({ tone: "watch", anchor: "resumen", title: `CTR bajo (${formatPct(kpis.ctr, 1)}).`, detail: "El anuncio no convence a quien lo ve. El promedio de servicios profesionales en búsqueda ronda 5 %." });
  if (cplTarget === null) out.push({ tone: "watch", weight: 1, anchor: "campanas", title: "Define tu costo por lead objetivo.", detail: "Mientras tanto las recomendaciones usan $1,000 MXN provisionales." });

  return { connected, kpis, campaigns: rows, terms: termStats.sort((a, b) => b.cost - a.cost), wasted, insights: rankInsights(out) };
}
