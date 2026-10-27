import { eachDay, type DateRange } from "@/lib/dates";
import { graph, graphAll, isMetaConfigured, metaAssets } from "./meta-graph";
import type { MetricRow, Source } from "./types";

const POSTS_TO_REFRESH = 40;
/** Métricas diarias de la cuenta (total_value por día). «views» reemplazó a impressions en 2025. */
const ACCOUNT_METRICS = ["views", "reach", "total_interactions", "accounts_engaged", "profile_links_taps", "follows_and_unfollows"];
const POST_METRICS = ["reach", "views", "saved", "shares", "total_interactions", "likes", "comments"];

interface Media { id: string; caption?: string; media_type: string; media_product_type?: string; timestamp: string; permalink: string }
interface InsightValue { name: string; total_value?: { value: number; breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] }; values?: { value: number }[] }

const mexDate = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
export const formatOf = (m: Pick<Media, "media_type" | "media_product_type">) =>
  m.media_product_type === "REELS" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carrusel" : m.media_type === "VIDEO" ? "video" : m.media_product_type === "STORY" ? "historia" : "imagen";

export function postRows(media: Media, insights: InsightValue[]): MetricRow[] {
  const date = mexDate(media.timestamp);
  const dimKey = `post:${media.id}`;
  const meta = { caption: (media.caption ?? "").slice(0, 140), permalink: media.permalink, format: formatOf(media), timestamp: media.timestamp };
  const rows: MetricRow[] = [{ source: "instagram", metric: "post_published", dimKey, date, value: 1, meta }];
  for (const i of insights) {
    const v = i.total_value?.value ?? i.values?.[0]?.value;
    if (typeof v === "number") rows.push({ source: "instagram", metric: `post_${i.name}`, dimKey, date, value: v });
  }
  return rows;
}

/** Totales por día de publicación (los usa la calificación general): posts, post_interactions, post_reach. */
export function dailyPostTotals(rows: MetricRow[]): MetricRow[] {
  const map = new Map<string, { posts: number; post_interactions: number; post_reach: number }>();
  for (const r of rows) {
    if (!r.dimKey.startsWith("post:")) continue;
    const e = map.get(r.date) ?? { posts: 0, post_interactions: 0, post_reach: 0 };
    if (r.metric === "post_published") e.posts += 1;
    if (r.metric === "post_total_interactions") e.post_interactions += r.value;
    if (r.metric === "post_reach") e.post_reach += r.value;
    map.set(r.date, e);
  }
  return [...map].flatMap(([date, e]) => Object.entries(e).map(([metric, value]) => ({ source: "instagram" as const, metric, dimKey: "", date, value })));
}

/** Instagram de la marca: seguidores, alcance, interacción y desempeño de cada publicación. */
export const instagramSource: Source = {
  id: "instagram",
  label: "Instagram",
  isConfigured: isMetaConfigured,
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const { igUserId } = await metaAssets();
    if (!igUserId) throw new Error("No hay cuenta de Instagram ligada a la página asignada");
    const rows: MetricRow[] = [];

    const profile = await graph<{ followers_count: number; media_count: number }>(igUserId, { fields: "followers_count,media_count" });
    rows.push({ source: "instagram", metric: "followers", dimKey: "", date: range.to, value: profile.followers_count });
    rows.push({ source: "instagram", metric: "media_count", dimKey: "", date: range.to, value: profile.media_count });

    // Totales por día: una llamada por día con todas las métricas.
    for (const day of eachDay(range)) {
      const until = new Date(Date.parse(`${day}T06:00:00Z`) + 86_400_000);
      const res = await graph<{ data: InsightValue[] }>(`${igUserId}/insights`, {
        metric: ACCOUNT_METRICS.join(","), period: "day", metric_type: "total_value",
        since: Math.floor(Date.parse(`${day}T06:00:00Z`) / 1000), until: Math.floor(until.getTime() / 1000),
        breakdown: "follow_type",
      }).catch(async () => graph<{ data: InsightValue[] }>(`${igUserId}/insights`, {
        metric: ACCOUNT_METRICS.join(","), period: "day", metric_type: "total_value",
        since: Math.floor(Date.parse(`${day}T06:00:00Z`) / 1000), until: Math.floor(until.getTime() / 1000),
      }));
      for (const i of res.data) {
        if (i.name === "follows_and_unfollows") {
          for (const r of i.total_value?.breakdowns?.[0]?.results ?? []) {
            const kind = r.dimension_values[0] === "FOLLOWER" ? "follows" : r.dimension_values[0] === "NON_FOLLOWER" ? "unfollows" : null;
            if (kind) rows.push({ source: "instagram", metric: kind, dimKey: "", date: day, value: r.value });
          }
          continue;
        }
        const v = i.total_value?.value;
        if (typeof v === "number") rows.push({ source: "instagram", metric: i.name, dimKey: "", date: day, value: v });
      }
    }

    // Publicaciones recientes: sus métricas son acumuladas y se refrescan cada día.
    const media = await graphAll<Media>(`${igUserId}/media`, { fields: "id,caption,media_type,media_product_type,timestamp,permalink", limit: 50 }, POSTS_TO_REFRESH);
    for (const m of media) {
      // Si alguna métrica no aplica al formato, Meta rechaza toda la llamada: se reintenta con las básicas.
      const res = await graph<{ data: InsightValue[] }>(`${m.id}/insights`, { metric: POST_METRICS.join(",") })
        .catch(() => graph<{ data: InsightValue[] }>(`${m.id}/insights`, { metric: "reach,saved,shares,total_interactions" }))
        .catch(() => ({ data: [] as InsightValue[] }));
      rows.push(...postRows(m, res.data));
    }
    return [...rows, ...dailyPostTotals(rows)];
  },
};
