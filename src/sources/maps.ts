import { harvest, isApifyConfigured } from "@/lib/apify";
import { competitors } from "@/lib/scorecard/config";
import { hostOf } from "./serp";
import type { MetricRow, Source } from "./types";
import { searchRegion } from "@/lib/workspace/patterns";

/** Actor oficial de Apify para Google Maps. ~$0.004 por lugar. */
export const MAPS_ACTOR = "compass/crawler-google-places";
const EVERY_DAYS = 7;
const PLACES_PER_SEARCH = 3;

export interface MapsItem { searchString?: string; website?: string | null; totalScore?: number | null; reviewsCount?: number | null; title?: string }

/**
 * Busca el perfil de cada estudio entre los resultados de su búsqueda. Solo cuenta
 * si el sitio del perfil es su dominio; si no aparece, gbp_found = 0.
 */
export function parseMaps(items: MapsItem[], date: string): MetricRow[] {
  const rows: MetricRow[] = [];
  for (const c of competitors()) {
    const results = items.filter((i) => i.searchString === c.mapsQuery);
    if (!results.length) continue;
    const dimKey = `site:${c.domain}`;
    const hit = results.find((i) => {
      const host = i.website ? hostOf(i.website.startsWith("http") ? i.website : `https://${i.website}`) : null;
      return host !== null && (host === c.domain || host.endsWith(`.${c.domain}`));
    });
    rows.push({ source: "maps", metric: "gbp_found", dimKey, date, value: hit ? 1 : 0, meta: hit ? { title: hit.title } : { firstResult: results[0]?.title } });
    if (hit) {
      rows.push({ source: "maps", metric: "gbp_rating", dimKey, date, value: hit.totalScore ?? 0 });
      rows.push({ source: "maps", metric: "gbp_reviews", dimKey, date, value: hit.reviewsCount ?? 0 });
    }
  }
  return rows;
}

/** Prominencia local: perfil de Google Maps, calificación y número de reseñas. */
export const mapsSource: Source = {
  id: "maps",
  label: "Google Maps",
  isConfigured: isApifyConfigured,
  async fetchDaily(): Promise<MetricRow[]> {
    const input = { searchStringsArray: competitors().map((c) => c.mapsQuery), maxCrawledPlacesPerSearch: PLACES_PER_SEARCH, language: searchRegion().language, scrapePlaceDetailPage: false };
    const { items, date } = await harvest<MapsItem>(MAPS_ACTOR, input, { everyDays: EVERY_DAYS, maxChargeUsd: 0.5 });
    return date ? parseMaps(items, date) : [];
  },
};
