import type { DateRange } from "@/lib/dates";
import { googleAuth, isGoogleConfigured } from "./google-auth";
import type { MetricRow, Source } from "./types";

/** Versión vigente de la API REST (v26, 2026-10-14). */
const API = "https://googleads.googleapis.com/v26";
const TIMEOUT_MS = 60_000;
const MICROS = 1_000_000;
const MAX_TERMS_PER_DAY = 200;

const customerId = () => (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, "");

/**
 * Desde el 2026-09-09 el developer token es opcional (el acceso va por el proyecto
 * de Google Cloud). Si existe en el entorno se manda; si hay cuenta administradora, también.
 */
async function headers(): Promise<Record<string, string>> {
  const { token } = await googleAuth().getAccessToken();
  if (!token) throw new Error("Google no devolvió un token de acceso");
  const h: Record<string, string> = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) h["developer-token"] = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) h["login-customer-id"] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, "");
  return h;
}

/** GAQL vía searchStream; junta los resultados de todos los lotes. */
export async function gaql<T>(query: string): Promise<T[]> {
  const res = await fetch(`${API}/customers/${customerId()}/googleAds:searchStream`, {
    method: "POST", headers: await headers(), body: JSON.stringify({ query }), signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    // Mensaje corto y sin datos sensibles: el código de error de Google basta para diagnosticar.
    const code = body.match(/"errorCode":\s*\{\s*"(\w+)":\s*"(\w+)"/)?.slice(1).join(".") ?? body.match(/"status":\s*"(\w+)"/)?.[1] ?? "";
    throw new Error(`Google Ads respondió ${res.status} ${code}`.trim());
  }
  const batches = (await res.json()) as { results?: T[] }[];
  return batches.flatMap((b) => b.results ?? []);
}

interface CampaignDay {
  segments: { date: string };
  campaign: { name: string };
  metrics: { impressions?: string; clicks?: string; costMicros?: string; conversions?: number; searchImpressionShare?: number };
}
interface TermDay { segments: { date: string }; searchTermView: { searchTerm: string }; metrics: { impressions?: string; clicks?: string; costMicros?: string; conversions?: number } }
interface KeywordDay { segments: { date: string }; adGroupCriterion: { qualityInfo?: { qualityScore?: number } }; metrics: { impressions?: string } }
export interface CampaignInfo {
  campaign: { name: string; status: string; primaryStatus?: string; primaryStatusReasons?: string[]; biddingStrategyType?: string; startDateTime?: string; advertisingChannelType?: string };
  campaignBudget?: { amountMicros?: string };
}

const n = (v?: string | number) => Number(v ?? 0);

export function campaignRows(days: CampaignDay[]): MetricRow[] {
  const rows: MetricRow[] = [];
  const totals = new Map<string, { impressions: number; clicks: number; cost: number; conversions: number }>();
  for (const d of days) {
    const date = d.segments.date;
    const dimKey = `campaign:${d.campaign.name}`;
    const v = { impressions: n(d.metrics.impressions), clicks: n(d.metrics.clicks), cost: n(d.metrics.costMicros) / MICROS, conversions: n(d.metrics.conversions) };
    rows.push(
      { source: "gads", metric: "impressions", dimKey, date, value: v.impressions },
      { source: "gads", metric: "clicks", dimKey, date, value: v.clicks },
      { source: "gads", metric: "cost_mxn", dimKey, date, value: v.cost },
      { source: "gads", metric: "conversions", dimKey, date, value: v.conversions },
    );
    if (typeof d.metrics.searchImpressionShare === "number") rows.push({ source: "gads", metric: "impression_share", dimKey, date, value: d.metrics.searchImpressionShare });
    const t = totals.get(date) ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
    totals.set(date, { impressions: t.impressions + v.impressions, clicks: t.clicks + v.clicks, cost: t.cost + v.cost, conversions: t.conversions + v.conversions });
  }
  for (const [date, t] of totals) {
    rows.push(
      { source: "gads", metric: "impressions", dimKey: "", date, value: t.impressions },
      { source: "gads", metric: "clicks", dimKey: "", date, value: t.clicks },
      { source: "gads", metric: "cost_mxn", dimKey: "", date, value: t.cost },
      { source: "gads", metric: "conversions", dimKey: "", date, value: t.conversions },
    );
  }
  return rows;
}

export function termRows(days: TermDay[]): MetricRow[] {
  const byDate = new Map<string, TermDay[]>();
  for (const d of days) byDate.set(d.segments.date, [...(byDate.get(d.segments.date) ?? []), d]);
  const rows: MetricRow[] = [];
  for (const [date, list] of byDate) {
    for (const d of list.sort((a, b) => n(b.metrics.costMicros) - n(a.metrics.costMicros)).slice(0, MAX_TERMS_PER_DAY)) {
      const dimKey = `term:${d.searchTermView.searchTerm.toLowerCase().slice(0, 200)}`;
      rows.push(
        { source: "gads", metric: "clicks", dimKey, date, value: n(d.metrics.clicks) },
        { source: "gads", metric: "cost_mxn", dimKey, date, value: n(d.metrics.costMicros) / MICROS },
        { source: "gads", metric: "conversions", dimKey, date, value: n(d.metrics.conversions) },
      );
    }
  }
  return rows;
}

export function qualityRows(days: KeywordDay[]): MetricRow[] {
  const byDate = new Map<string, { w: number; impr: number }>();
  for (const d of days) {
    const qs = d.adGroupCriterion.qualityInfo?.qualityScore;
    const impr = n(d.metrics.impressions);
    if (!qs || !impr) continue;
    const e = byDate.get(d.segments.date) ?? { w: 0, impr: 0 };
    byDate.set(d.segments.date, { w: e.w + qs * impr, impr: e.impr + impr });
  }
  return [...byDate].flatMap(([date, e]) => [
    { source: "gads" as const, metric: "qs_weighted", dimKey: "", date, value: e.w },
    { source: "gads" as const, metric: "qs_impressions", dimKey: "", date, value: e.impr },
  ]);
}

/** Estado actual de cada campaña (instantánea): presupuesto, estrategia, si está aprendiendo. */
export function infoRows(list: CampaignInfo[], date: string): MetricRow[] {
  return list.map((c) => ({
    source: "gads" as const, metric: "campaign_info", dimKey: `campaign:${c.campaign.name}`, date,
    value: n(c.campaignBudget?.amountMicros) / MICROS,
    meta: {
      status: c.campaign.status, primaryStatus: c.campaign.primaryStatus ?? null, reasons: c.campaign.primaryStatusReasons ?? [],
      bidding: c.campaign.biddingStrategyType ?? null, startDate: c.campaign.startDateTime?.slice(0, 10) ?? null, channel: c.campaign.advertisingChannelType ?? null,
    },
  }));
}

export const gadsSource: Source = {
  id: "gads",
  label: "Google Ads",
  isConfigured: () => isGoogleConfigured() && Boolean(customerId()),
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const between = `segments.date BETWEEN '${range.from}' AND '${range.to}'`;
    const [days, terms, keywords, info] = await Promise.all([
      gaql<CampaignDay>(`SELECT segments.date, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.search_impression_share FROM campaign WHERE ${between}`),
      gaql<TermDay>(`SELECT segments.date, search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE ${between} AND metrics.impressions > 0`),
      gaql<KeywordDay>(`SELECT segments.date, ad_group_criterion.quality_info.quality_score, metrics.impressions FROM keyword_view WHERE ${between} AND metrics.impressions > 0`),
      gaql<CampaignInfo>(`SELECT campaign.name, campaign.status, campaign.primary_status, campaign.primary_status_reasons, campaign.bidding_strategy_type, campaign.start_date_time, campaign.advertising_channel_type, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'`),
    ]);
    return [...campaignRows(days), ...termRows(terms), ...qualityRows(keywords), ...infoRows(info, range.to)];
  },
};
