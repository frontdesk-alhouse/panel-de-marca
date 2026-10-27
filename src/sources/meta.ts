import type { DateRange } from "@/lib/dates";
import { graphAll, isMetaConfigured, metaAssets } from "./meta-graph";
import type { MetricRow, Source } from "./types";

/** Acciones que cuentan como lead en Meta: formularios, píxel, conversaciones iniciadas (WhatsApp/DM). */
const LEAD_ACTIONS = new Set([
  "lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "leadgen_grouped",
]);
const CONVERSATION_ACTIONS = new Set(["onsite_conversion.messaging_conversation_started_7d"]);
/** Resultados de tráfico (promociones de Instagram para visitas al perfil o al sitio). */
const LINK_ACTIONS = new Set(["link_click"]);
const LANDING_ACTIONS = new Set(["landing_page_view"]);

export interface MetaInsightRow {
  date_start: string; campaign_name?: string;
  impressions?: string; reach?: string; clicks?: string; inline_link_clicks?: string; spend?: string; frequency?: string;
  actions?: { action_type: string; value: string }[];
}

const n = (v?: string) => Number(v ?? 0);
const sumActions = (row: MetaInsightRow, set: Set<string>) => (row.actions ?? []).filter((a) => set.has(a.action_type)).reduce((s, a) => s + n(a.value), 0);

export function metaRows(rows: MetaInsightRow[]): MetricRow[] {
  const out: MetricRow[] = [];
  const totals = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const date = r.date_start;
    const v = {
      impressions: n(r.impressions), clicks: n(r.inline_link_clicks ?? r.clicks), spend_mxn: n(r.spend),
      leads: sumActions(r, LEAD_ACTIONS), conversations: sumActions(r, CONVERSATION_ACTIONS), reach: n(r.reach),
      link_clicks: sumActions(r, LINK_ACTIONS), landing_page_views: sumActions(r, LANDING_ACTIONS),
    };
    const dimKey = `campaign:${r.campaign_name ?? "(sin nombre)"}`;
    for (const [metric, value] of Object.entries(v)) out.push({ source: "meta", metric, dimKey, date, value });
    const t = totals.get(date) ?? {};
    for (const [metric, value] of Object.entries(v)) if (metric !== "reach") t[metric] = (t[metric] ?? 0) + value;
    totals.set(date, t);
  }
  for (const [date, t] of totals) for (const [metric, value] of Object.entries(t)) out.push({ source: "meta", metric, dimKey: "", date, value });
  return out;
}

/** Meta Ads: gasto, clics, leads y conversaciones por campaña y día. */
export const metaSource: Source = {
  id: "meta",
  label: "Meta Ads",
  isConfigured: isMetaConfigured,
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const { adAccountIds } = await metaAssets();
    if (!adAccountIds.length) throw new Error("El usuario del sistema no tiene cuentas publicitarias en pesos asignadas");
    const rows: MetaInsightRow[] = [];
    let freqWeighted = 0, freqReach = 0;
    for (const id of adAccountIds) {
      rows.push(...await graphAll<MetaInsightRow>(`${id}/insights`, {
        level: "campaign", time_increment: 1, time_range: JSON.stringify({ since: range.from, until: range.to }),
        fields: "campaign_name,impressions,reach,clicks,inline_link_clicks,spend,frequency,actions", limit: 500,
      }));
      // Frecuencia de los últimos 28 días (cuántas veces vio el anuncio cada persona): señal de fatiga.
      const f = (await graphAll<MetaInsightRow>(`${id}/insights`, { date_preset: "last_28d", fields: "frequency,reach" }).catch(() => []))[0];
      if (f?.frequency && f.reach) { freqWeighted += n(f.frequency) * n(f.reach); freqReach += n(f.reach); }
    }
    const out = metaRows(rows);
    if (freqReach) out.push({ source: "meta", metric: "frequency_28d", dimKey: "", date: range.to, value: freqWeighted / freqReach });
    return out;
  },
};
