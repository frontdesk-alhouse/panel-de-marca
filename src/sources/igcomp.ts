import { harvest, isApifyConfigured } from "@/lib/apify";
import { competitors } from "@/lib/scorecard/config";
import type { MetricRow, Source } from "./types";

/** Actor oficial de Apify para perfiles públicos de Instagram. ~$0.0026 por perfil. */
export const IG_ACTOR = "apify/instagram-profile-scraper";
/** El actor de perfiles no siempre trae publicaciones recientes; este sí. ~$0.0017 por post. */
export const IG_POSTS_ACTOR = "apify/instagram-post-scraper";
const POSTS_PER_PROFILE = 8;
const EVERY_DAYS = 7;
const RECENT_DAYS = 30;

export interface IgPost { ownerUsername?: string; timestamp?: string; likesCount?: number | null; commentsCount?: number | null }

export interface IgProfile {
  username?: string; followersCount?: number; postsCount?: number;
  latestPosts?: { timestamp?: string; likesCount?: number | null; commentsCount?: number | null; type?: string; productType?: string }[];
}

/**
 * Seguidores, publicaciones de los últimos 30 días e interacción promedio de las
 * publicaciones recientes de cada estudio. Engagement = interacciones promedio
 * por publicación / seguidores (la métrica pública comparable entre cuentas).
 */
export function parseIgProfiles(items: IgProfile[], date: string, postItems: IgPost[] = []): MetricRow[] {
  const rows: MetricRow[] = [];
  const cutoff = Date.parse(`${date}T12:00:00Z`) - RECENT_DAYS * 86_400_000;
  for (const c of competitors()) {
    if (!c.instagram) continue;
    const p = items.find((i) => i.username?.toLowerCase() === c.instagram!.toLowerCase());
    if (!p || typeof p.followersCount !== "number") continue;
    const dimKey = `site:${c.domain}`;
    const fromPostsActor = postItems.filter((x) => x.ownerUsername?.toLowerCase() === c.instagram!.toLowerCase());
    const posts = fromPostsActor.length ? fromPostsActor : (p.latestPosts ?? []);
    const recent = posts.filter((x) => x.timestamp && Date.parse(x.timestamp) >= cutoff);
    const interactions = posts.map((x) => Math.max(0, x.likesCount ?? 0) + Math.max(0, x.commentsCount ?? 0));
    const avg = interactions.length ? interactions.reduce((a, b) => a + b, 0) / interactions.length : null;
    const push = (metric: string, value: number | null) => { if (value !== null && Number.isFinite(value)) rows.push({ source: "igcomp", metric, dimKey, date, value }); };
    push("followers", p.followersCount);
    push("posts_total", p.postsCount ?? null);
    push("posts_30d", recent.length);
    push("avg_interactions", avg);
    push("engagement", avg !== null && p.followersCount > 0 ? avg / p.followersCount : null);
  }
  return rows;
}

/** Instagram de la competencia (y la propia, para comparar con la misma regla). */
export const igCompSource: Source = {
  id: "igcomp",
  label: "Instagram de la competencia",
  isConfigured: isApifyConfigured,
  async fetchDaily(): Promise<MetricRow[]> {
    const usernames = competitors().flatMap((c) => (c.instagram ? [c.instagram] : []));
    const [profiles, posts] = await Promise.all([
      harvest<IgProfile>(IG_ACTOR, { usernames, includeAboutSection: false }, { everyDays: EVERY_DAYS, maxChargeUsd: 0.5 }),
      harvest<IgPost>(IG_POSTS_ACTOR, { username: usernames, resultsLimit: POSTS_PER_PROFILE, onlyPostsNewerThan: "60 days", dataDetailLevel: "basicData", skipPinnedPosts: true }, { everyDays: EVERY_DAYS, maxChargeUsd: 0.5 }),
    ]);
    return profiles.date ? parseIgProfiles(profiles.items, profiles.date, posts.items) : [];
  },
};
