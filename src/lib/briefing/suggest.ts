import { hostOf, SERP_ACTOR, type SerpItem } from "@/sources/serp";
import { autocompleteParams } from "@/lib/ideas/collect";
import { searchRegion } from "@/lib/workspace/patterns";
import type { Messages } from "@/i18n";

type T = Messages["server"]["suggest"];

/**
 * Sugerencias del briefing, siempre con su razón y con datos reales:
 * - búsquedas objetivo: lo que Google sugiere al escribir el servicio (gratis);
 * - competidores: quién aparece en Google para esas búsquedas (con Apify, centavos).
 * Sin Apify no se inventan competidores: se dan links para verlo en Google.
 */
export interface Suggestion<T> {
  value: T;
  reason: string;
}

export interface CompetitorSuggestion {
  domain: string;
  name: string;
  /** En cuántas de las búsquedas aparece, y su mejor lugar. */
  hits: number;
  best: number;
}

const UA = "Mozilla/5.0 (compatible; PanelDeMarca/1.0)";
const TIMEOUT_MS = 8_000;

async function googleSuggest(seed: string, locale: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&${autocompleteParams(locale)}&q=${encodeURIComponent(seed)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return [];
    const json = (await res.json()) as [string, string[]];
    return json[1] ?? [];
  } catch {
    return [];
  }
}

/**
 * Búsquedas que la gente hace de verdad: servicio (+ ciudad) en el autocompletado.
 * Con ciudad solo se usan las locales: sin ella Google mezcla marcas nacionales.
 */
export async function suggestQueries(services: string[], city: string, locale: string, m: T, max = 12): Promise<Suggestion<string>[]> {
  const seeds = [...new Set(services.slice(0, 6).map((s) => (city ? `${s} ${city}` : s).toLowerCase()))];
  const lists = await Promise.all(seeds.map(async (seed) => ({ seed, list: await googleSuggest(seed, locale) })));
  const best = new Map<string, Suggestion<string> & { rank: number }>();
  for (const { seed, list } of lists) {
    list.forEach((text, i) => {
      const q = text.toLowerCase().trim();
      if (q === seed || q.split(" ").length < 2) return;
      const prev = best.get(q);
      if (!prev || prev.rank > i) best.set(q, { value: q, rank: i, reason: m.googleSuggests(seed) });
    });
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank).slice(0, max).map(({ value, reason }) => ({ value, reason }));
}

/** Sitios que no son competidores aunque salgan en Google: redes, directorios, marketplaces. */
const NOT_COMPETITOR = /(^|\.)(facebook|instagram|linkedin|youtube|tiktok|twitter|x|pinterest|reddit|quora|wikipedia|yelp|tripadvisor|doctoralia|clutch|sortlist|goodfirms|designrush|upcity|topdesignfirms|behance|dribbble|99designs|fiverr|upwork|workana|freelancer|mercadolibre|amazon|seccionamarilla|paginasamarillas|indeed|glassdoor|occ|computrabajo|canva|wix|godaddy|hubspot|semrush|ahrefs|google|gob|gov|blogspot|medium|wordpress|apple|microsoft)\.[a-z.]+$/i;

export const isLikelyCompetitor = (domain: string, own: string): boolean =>
  domain !== own && !domain.endsWith(`.${own}`) && !NOT_COMPETITOR.test(domain) && !/\.(gob|gov|edu)(\.[a-z]{2})?$/.test(domain);

/** Cuenta en cuántas búsquedas aparece cada dominio (top 10) y su mejor lugar. */
export function rankCompetitors(items: SerpItem[], ownDomain: string, max = 10): CompetitorSuggestion[] {
  const map = new Map<string, CompetitorSuggestion & { queries: Set<string> }>();
  for (const item of items) {
    const query = item.searchQuery?.term ?? "";
    for (const r of item.organicResults ?? []) {
      const domain = r.url ? hostOf(r.url) : null;
      if (!domain || !isLikelyCompetitor(domain, ownDomain)) continue;
      const pos = r.position ?? 99;
      const cur = map.get(domain) ?? { domain, name: (r.title ?? domain).split(/\s[|·–—-]\s/).pop()?.trim() || domain, hits: 0, best: 99, queries: new Set<string>() };
      cur.queries.add(query);
      cur.hits = cur.queries.size;
      cur.best = Math.min(cur.best, pos);
      map.set(domain, cur);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.hits - a.hits || a.best - b.best)
    .slice(0, max)
    .map(({ domain, name, hits, best }) => ({ domain, name, hits, best }));
}

/** Corre la búsqueda de Google en Apify y espera el resultado (~30-60 s, centavos de dólar). */
export async function suggestCompetitors(queries: string[], ownDomain: string, locale: string, m: T): Promise<Suggestion<CompetitorSuggestion>[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token || !queries.length) return [];
  const picked = queries.slice(0, 4);
  const region = searchRegion(locale);
  const input = {
    queries: picked.join("\n"),
    maxPagesPerQuery: 1,
    ...(region.country ? { countryCode: region.country } : {}),
    languageCode: region.language,
    mobileResults: true,
    saveHtmlToKeyValueStore: false,
  };
  const url = `https://api.apify.com/v2/acts/${SERP_ACTOR.replace("/", "~")}/run-sync-get-dataset-items?timeout=150&maxTotalChargeUsd=0.25`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(170_000),
  });
  if (!res.ok) throw new Error(`Apify respondió ${res.status}`);
  const items = (await res.json()) as SerpItem[];
  return rankCompetitors(items, ownDomain).map((c) => ({
    value: c,
    reason: m.appearsIn(c.hits, picked.length, c.best),
  }));
}

/** Sin Apify: links para que la persona vea quién aparece en Google. */
export function googleSearchLinks(queries: string[], locale: string): { query: string; url: string }[] {
  const region = searchRegion(locale);
  return queries.slice(0, 5).map((q) => ({
    query: q,
    url: `https://www.google.com/search?${new URLSearchParams({ q, hl: region.language, ...(region.country ? { gl: region.country } : {}) })}`,
  }));
}
