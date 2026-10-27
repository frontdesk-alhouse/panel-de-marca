import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { contentIdeas } from "@/db/schema";
import type { IdeaHit } from "./collect";
import { classifyIntent } from "./intent";

const BATCH = 300;

/** Guarda ideas: las nuevas con first_seen = hoy; las conocidas suman un día visto y su mejor lugar. */
export async function upsertIdeas(hits: IdeaHit[], date: string): Promise<number> {
  const db = await getDb();
  const unique = [...new Map(hits.map((h) => [`${h.source}|${h.text}`, h])).values()];
  for (let i = 0; i < unique.length; i += BATCH) {
    const rows = unique.slice(i, i + BATCH).map((h) => ({
      source: h.source, text: h.text.slice(0, 500), url: h.url, seed: h.seed, intent: classifyIntent(h.text),
      bestRank: h.rank, firstSeen: date, lastSeen: date, timesSeen: 1, meta: h.meta ?? null,
    }));
    await db.insert(contentIdeas).values(rows).onConflictDoUpdate({
      target: [contentIdeas.source, contentIdeas.text],
      set: {
        timesSeen: sql`${contentIdeas.timesSeen} + case when ${contentIdeas.lastSeen} < excluded.last_seen then 1 else 0 end`,
        lastSeen: sql`greatest(${contentIdeas.lastSeen}, excluded.last_seen)`,
        bestRank: sql`least(${contentIdeas.bestRank}, excluded.best_rank)`,
        url: sql`coalesce(excluded.url, ${contentIdeas.url})`,
        meta: sql`coalesce(excluded.meta, ${contentIdeas.meta})`,
      },
    });
  }
  return unique.length;
}
