import { asc, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { CHANGE_AREAS, CHANGE_KINDS, changes, scores } from "@/db/schema";
import { addDays, todayIso } from "@/lib/dates";
import { DIMENSIONS } from "@/lib/scorecard/config";
import { regradeDay, type StoredDimension } from "@/lib/scorecard/history";

export const ChangeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD"),
  kind: z.enum(CHANGE_KINDS),
  area: z.enum(CHANGE_AREAS),
  title: z.string().trim().min(3, "Describe el cambio").max(200),
  detail: z.string().trim().max(2000).nullable(),
  url: z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)").nullable(),
});
export type ChangeInput = z.infer<typeof ChangeSchema>;
export interface ChangeRow extends ChangeInput { id: number; createdBy: string | null }

const toRow = (r: typeof changes.$inferSelect): ChangeRow => ({
  id: r.id, date: String(r.date), kind: r.kind, area: r.area, title: r.title, detail: r.detail, url: r.url, createdBy: r.createdBy,
});

export async function listChanges(days = 365): Promise<ChangeRow[]> {
  const db = await getDb();
  const rows = await db.select().from(changes).where(gte(changes.date, addDays(todayIso(), -days))).orderBy(desc(changes.date), desc(changes.id));
  return rows.map(toRow);
}

export async function addChange(input: ChangeInput, createdBy: string | null): Promise<ChangeRow> {
  const db = await getDb();
  const [row] = await db.insert(changes).values({ ...input, createdBy }).returning();
  return toRow(row);
}

export async function deleteChange(id: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(changes).where(eq(changes.id, id)).returning({ id: changes.id });
  return rows.length > 0;
}

export interface ScoreHistoryPoint {
  date: string;
  overall: number | null;
  coverage: number;
  dimensions: Record<string, number | null>;
  /** Nota de cada métrica ese día (100 verde · 50 amarillo · 0 rojo); null si no se calificó */
  metrics: Record<string, number | null>;
}

const BAND_SCORE = { green: 100, yellow: 50, red: 0 } as const;
const WEIGHTS = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.weight]));

/**
 * Calificaciones guardadas (una por día), de la más vieja a la más nueva. Se vuelven a calificar con
 * las reglas de cobertura actuales para que un día viejo con «100» sobre dos métricas no engañe.
 */
export async function scoreHistory(days = 365): Promise<ScoreHistoryPoint[]> {
  const db = await getDb();
  const rows = await db.select().from(scores).where(gte(scores.periodEnd, addDays(todayIso(), -days))).orderBy(asc(scores.periodEnd));
  return rows.map((r) => {
    const day = regradeDay((r.dimensions as StoredDimension[]) ?? [], WEIGHTS);
    const metrics = Object.fromEntries(
      ((r.metrics as { id: string; status: string; band: keyof typeof BAND_SCORE | null }[]) ?? [])
        .map((m) => [m.id, m.status === "scored" && m.band ? BAND_SCORE[m.band] : null]),
    );
    return { date: String(r.periodEnd), overall: day.overall, coverage: r.coverage, dimensions: day.dimensions, metrics };
  });
}
