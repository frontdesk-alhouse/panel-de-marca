import { and, between, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, metricDaily } from "@/db/schema";
import type { MetricRow } from "@/sources/types";
import type { AggRow } from "@/lib/scorecard/raw";
import type { DateRange } from "@/lib/dates";
import { addDays } from "@/lib/dates";

const BATCH = 500;

/** Inserta o actualiza por (fuente, métrica, dimensión, fecha). Idempotente. */
export async function upsertMetricRows(rows: MetricRow[]): Promise<number> {
  const db = await getDb();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({ ...r, meta: r.meta ?? null }));
    await db
      .insert(metricDaily)
      .values(chunk)
      .onConflictDoUpdate({
        target: [metricDaily.source, metricDaily.metric, metricDaily.dimKey, metricDaily.date],
        set: { value: sql`excluded.value`, meta: sql`excluded.meta` },
      });
  }
  return rows.length;
}

export async function sumsForWindow(range: DateRange): Promise<AggRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      source: metricDaily.source,
      metric: metricDaily.metric,
      dimKey: metricDaily.dimKey,
      value: sql<string>`sum(${metricDaily.value})`,
    })
    .from(metricDaily)
    .where(between(metricDaily.date, range.from, range.to))
    .groupBy(metricDaily.source, metricDaily.metric, metricDaily.dimKey);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/** Último valor por (fuente, métrica, dimensión) hasta `date`, mirando hacia atrás `lookbackDays`. */
export async function latestUpTo(date: string, lookbackDays = 90): Promise<AggRow[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinctOn([metricDaily.source, metricDaily.metric, metricDaily.dimKey], {
      source: metricDaily.source,
      metric: metricDaily.metric,
      dimKey: metricDaily.dimKey,
      value: metricDaily.value,
    })
    .from(metricDaily)
    .where(and(lte(metricDaily.date, date), gte(metricDaily.date, addDays(date, -lookbackDays))))
    .orderBy(metricDaily.source, metricDaily.metric, metricDaily.dimKey, sql`${metricDaily.date} desc`);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export interface DataSpan {
  firstDate: string | null;
  lastDate: string | null;
  hasMock: boolean;
  sources: string[];
}

export async function dataSpan(): Promise<DataSpan> {
  const db = await getDb();
  const [span] = await db
    .select({
      first: sql<string | null>`min(${metricDaily.date})`,
      last: sql<string | null>`max(${metricDaily.date})`,
      mock: sql<boolean>`coalesce(bool_or((${metricDaily.meta}->>'mock')::boolean), false)`,
    })
    .from(metricDaily);
  const sources = await db.selectDistinct({ source: metricDaily.source }).from(metricDaily);
  return {
    firstDate: span?.first ?? null,
    lastDate: span?.last ?? null,
    hasMock: Boolean(span?.mock),
    sources: sources.map((s) => s.source).sort(),
  };
}

/** Borra todo lo que escribió la fuente de prueba (métricas y leads). */
export async function deleteMockData(): Promise<void> {
  const db = await getDb();
  await db.delete(metricDaily).where(sql`(${metricDaily.meta}->>'mock')::boolean is true`);
  await db.delete(leads).where(sql`(${leads.meta}->>'mock')::boolean is true`);
}

export async function sumByDate(source: string, metric: string, range: DateRange, dimKey = "") {
  const db = await getDb();
  const rows = await db
    .select({ date: metricDaily.date, value: metricDaily.value })
    .from(metricDaily)
    .where(and(
      eq(metricDaily.source, source), eq(metricDaily.metric, metric), eq(metricDaily.dimKey, dimKey),
      between(metricDaily.date, range.from, range.to),
    ))
    .orderBy(metricDaily.date);
  return rows.map((r) => ({ date: r.date, value: Number(r.value) }));
}
