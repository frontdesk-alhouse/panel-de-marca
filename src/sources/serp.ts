import { harvest, isApifyConfigured } from "@/lib/apify";
import { upsertIdeas } from "@/lib/ideas/store";
import type { IdeaHit } from "@/lib/ideas/collect";
import { SERP_DEPTH } from "@/lib/analytics/compscore";
import { competitors, targetQueries } from "@/lib/scorecard/config";
import type { MetricRow, Source } from "./types";
import { searchRegion } from "@/lib/workspace/patterns";

/** Actor oficial de Apify para resultados de Google (celular, en el país e idioma de la marca). */
export const SERP_ACTOR = "apify/google-search-scraper";
const EVERY_DAYS = 3;
const MAX_CHARGE_USD = 0.5;

export interface SerpItem {
  searchQuery?: { term?: string; page?: number };
  organicResults?: { position?: number; url?: string; title?: string }[];
  peopleAlsoAsk?: { question?: string | null }[];
}

export interface SerpTop { pos: number; domain: string; url: string; title: string }

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const matches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * Convierte las páginas de resultados en filas: mejor posición de cada estudio por
 * búsqueda (`position`), una marca de «búsqueda medida» con el top 10 (`checked`)
 * y las preguntas de «Otras preguntas de los usuarios».
 */
export function parseSerp(items: SerpItem[], date: string) {
  const targets = new Set(targetQueries());
  const byQuery = new Map<string, { pos: number; url: string; title: string }[]>();
  const questions = new Map<string, string>();
  for (const it of items) {
    const term = it.searchQuery?.term?.trim().toLowerCase();
    if (!term || !targets.has(term)) continue;
    const list = byQuery.get(term) ?? [];
    for (const r of it.organicResults ?? []) {
      if (r.url && r.position && r.position <= SERP_DEPTH) list.push({ pos: r.position, url: r.url, title: r.title ?? "" });
    }
    byQuery.set(term, list);
    for (const q of it.peopleAlsoAsk ?? []) if (q.question) questions.set(q.question.trim(), term);
  }

  const rows: MetricRow[] = [];
  for (const [term, results] of byQuery) {
    const sorted = [...results].sort((a, b) => a.pos - b.pos);
    const top: SerpTop[] = [];
    const seen = new Set<string>();
    for (const r of sorted) {
      const host = hostOf(r.url);
      if (!host || seen.has(host) || top.length >= 10) continue;
      seen.add(host);
      top.push({ pos: r.pos, domain: host, url: r.url, title: r.title.slice(0, 140) });
    }
    rows.push({ source: "serp", metric: "checked", dimKey: `q:${term}`, date, value: 1, meta: { top } });
    for (const c of competitors()) {
      const hit = sorted.find((r) => {
        const host = hostOf(r.url);
        return host !== null && matches(host, c.domain);
      });
      if (hit) rows.push({ source: "serp", metric: "position", dimKey: `q:${term}|site:${c.domain}`, date, value: hit.pos, meta: { url: hit.url } });
    }
  }
  const ideas: IdeaHit[] = [...questions].map(([text, seed], i) => ({ source: "paa", text, url: null, seed, rank: i + 1 }));
  return { rows, ideas };
}

/** Posición en Google de la marca y la competencia para las búsquedas objetivo (vía Apify). */
export const serpSource: Source = {
  id: "serp",
  label: "Posiciones en Google",
  isConfigured: isApifyConfigured,
  async fetchDaily(): Promise<MetricRow[]> {
    const region = searchRegion();
    const input = {
      queries: targetQueries().join("\n"),
      maxPagesPerQuery: SERP_DEPTH / 10,
      ...(region.country ? { countryCode: region.country } : {}),
      languageCode: region.language,
      mobileResults: true,
      saveHtmlToKeyValueStore: false,
    };
    const { items, date } = await harvest<SerpItem>(SERP_ACTOR, input, { everyDays: EVERY_DAYS, maxChargeUsd: MAX_CHARGE_USD });
    if (!date) return [];
    const { rows, ideas } = parseSerp(items, date);
    if (ideas.length) await upsertIdeas(ideas, date);
    return rows;
  },
};
