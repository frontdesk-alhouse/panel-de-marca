import { harvestEach, isApifyConfigured } from "@/lib/apify";
import { competitors } from "@/lib/scorecard/config";
import type { MetricRow, Source } from "./types";

/** Perfil de enlaces por dominio (índice propio + Open PageRank). ~$0.015 por dominio. */
export const LINKS_ACTOR = "s-r/backlinks-checker";
const EVERY_DAYS = 28;

export interface LinksItem { domain?: string; domain_score?: number | null; referring_domains_count?: number | null }

const clean = (d?: string) => d?.toLowerCase().replace(/^www\./, "");

export function parseLinks(latest: Map<string, { item: LinksItem; date: string }>): MetricRow[] {
  const rows: MetricRow[] = [];
  for (const c of competitors()) {
    const hit = latest.get(c.domain);
    if (!hit) continue;
    const dimKey = `site:${c.domain}`;
    const { item, date } = hit;
    if (typeof item.referring_domains_count === "number") rows.push({ source: "links", metric: "ref_domains", dimKey, date, value: item.referring_domains_count });
    if (typeof item.domain_score === "number") rows.push({ source: "links", metric: "domain_score", dimKey, date, value: item.domain_score });
  }
  return rows;
}

/** Autoridad: cuántos dominios distintos enlazan a cada estudio (Google usa enlaces vía PageRank). */
export const linksSource: Source = {
  id: "links",
  label: "Enlaces y autoridad",
  isConfigured: isApifyConfigured,
  async fetchDaily(): Promise<MetricRow[]> {
    const inputs = competitors().map((c) => ({ key: c.domain, input: { domain: c.domain, include_backlinks: false } }));
    const { latest } = await harvestEach<LinksItem>(LINKS_ACTOR, inputs, (i) => clean(i.domain), { everyDays: EVERY_DAYS, maxChargeUsd: 0.5 });
    return parseLinks(latest);
  },
};
