import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { aiCitations, metricDaily } from "@/db/schema";
import { addDays, todayIso } from "@/lib/dates";
import { citationIndex, citedDomains, type AssistantIndex, type CitationRun } from "./runs";
import type { GeoReport } from "./check";

/** Ventana de la bitácora: las corridas viejas ya no dicen cómo te ven hoy. */
export const CITATION_WINDOW_DAYS = 90;

/** Último chequeo (hasta `upTo` inclusive, para reconstruir la calificación de días pasados). */
export async function latestGeoReport(upTo?: string): Promise<{ date: string; report: GeoReport } | null> {
  const db = await getDb();
  const [row] = await db.select({ date: metricDaily.date, meta: metricDaily.meta }).from(metricDaily)
    .where(and(eq(metricDaily.source, "geo"), eq(metricDaily.metric, "checks_total"), ...(upTo ? [lte(metricDaily.date, upTo)] : [])))
    .orderBy(desc(metricDaily.date)).limit(1);
  const report = row?.meta?.report as GeoReport | undefined;
  return row && report ? { date: String(row.date), report } : null;
}

export async function recentCitations(days = CITATION_WINDOW_DAYS, endDate = todayIso()): Promise<(CitationRun & { id: number })[]> {
  const db = await getDb();
  const rows = await db.select().from(aiCitations)
    .where(and(gte(aiCitations.date, addDays(endDate, -days)), lte(aiCitations.date, endDate)))
    .orderBy(desc(aiCitations.date), aiCitations.queryId, aiCitations.assistant, aiCitations.run);
  return rows.map((r) => ({
    id: r.id, date: String(r.date), assistant: r.assistant, queryId: r.queryId, query: r.query, run: r.run,
    searched: r.searched, appears: r.appears, position: r.position, citedUrls: r.citedUrls ?? [], wrongFact: r.wrongFact, notes: r.notes,
  }));
}

/** Inserta o actualiza corridas (misma consulta, asistente, número y fecha = la misma corrida). */
export async function saveCitations(runs: readonly CitationRun[]): Promise<number> {
  if (!runs.length) return 0;
  const db = await getDb();
  for (const r of runs) {
    const values = { ...r, citedUrls: [...r.citedUrls] };
    await db.insert(aiCitations).values(values).onConflictDoUpdate({
      target: [aiCitations.queryId, aiCitations.assistant, aiCitations.run, aiCitations.date],
      set: values,
    });
  }
  return runs.length;
}

export async function deleteCitation(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(aiCitations).where(eq(aiCitations.id, id));
}

export interface GeoInputs { geo: { ok: number; total: number } | null; citations: { k: number; n: number } | null }

/** Entradas de la calificación (las dos métricas de GEO). Un fallo aquí no tumba la calificación. */
export async function geoScoreInputs(endDate?: string): Promise<GeoInputs> {
  try {
    // El chequeo de hoy cuenta para la calificación de ayer: corre una vez al día y describe el sitio actual.
    const upTo = endDate ? addDays(endDate, 1) : undefined;
    const [latest, runs] = await Promise.all([latestGeoReport(upTo), recentCitations(CITATION_WINDOW_DAYS, upTo)]);
    const counted = latest?.report.checks.filter((c) => c.severity !== "info") ?? [];
    const all = citationIndex(runs).find((i) => i.assistant === "all");
    return {
      geo: counted.length ? { ok: counted.filter((c) => c.ok).length, total: counted.length } : null,
      citations: all ? { k: all.k, n: all.n } : null,
    };
  } catch (err) {
    console.error("[geo] entradas de la calificación", err);
    return { geo: null, citations: null };
  }
}

export interface GeoOverview {
  latest: { date: string; report: GeoReport } | null;
  runs: (CitationRun & { id: number })[];
  index: AssistantIndex[];
  domains: { domain: string; count: number }[];
  wrongFacts: { date: string; assistant: string; fact: string }[];
}

export async function loadGeoOverview(): Promise<GeoOverview> {
  const [latest, runs] = await Promise.all([latestGeoReport(), recentCitations()]);
  return {
    latest,
    runs,
    index: citationIndex(runs),
    domains: citedDomains(runs),
    wrongFacts: runs.filter((r) => r.wrongFact).map((r) => ({ date: r.date, assistant: r.assistant, fact: r.wrongFact! })),
  };
}
