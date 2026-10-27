import { and, between, desc, eq, inArray, like, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { metricDaily } from "@/db/schema";
import { addDays, daysBetween, eachDay, type DateRange } from "@/lib/dates";

export type Values = Record<string, number>;

export interface BreakdownRow {
  key: string;
  cur: Values;
  prev: Values;
}

async function grouped(source: string, metrics: string[], range: DateRange, dim: { exact?: string; prefix?: string }) {
  const db = await getDb();
  const dimCond = dim.prefix !== undefined
    ? like(metricDaily.dimKey, `${dim.prefix}:%`)
    : eq(metricDaily.dimKey, dim.exact ?? "");
  const rows = await db
    .select({ dimKey: metricDaily.dimKey, metric: metricDaily.metric, value: sql<string>`sum(${metricDaily.value})` })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), inArray(metricDaily.metric, metrics), between(metricDaily.date, range.from, range.to), dimCond))
    .groupBy(metricDaily.dimKey, metricDaily.metric);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/** Totales del periodo (dim_key vacío). Métrica ausente = no está en el objeto. */
export async function totals(source: string, metrics: string[], range: DateRange): Promise<Values> {
  const out: Values = {};
  for (const r of await grouped(source, metrics, range, { exact: "" })) out[r.metric] = r.value;
  return out;
}

/** Desglose por una dimensión (prefijo de dim_key) con el periodo anterior para comparar. */
export async function breakdown(source: string, prefix: string, metrics: string[], current: DateRange, previous: DateRange): Promise<BreakdownRow[]> {
  const [cur, prev] = await Promise.all([
    grouped(source, metrics, current, { prefix }),
    grouped(source, metrics, previous, { prefix }),
  ]);
  const map = new Map<string, BreakdownRow>();
  const row = (dimKey: string) => {
    const key = dimKey.slice(prefix.length + 1);
    if (!map.has(key)) map.set(key, { key, cur: {}, prev: {} });
    return map.get(key) as BreakdownRow;
  };
  for (const r of cur) row(r.dimKey).cur[r.metric] = r.value;
  for (const r of prev) row(r.dimKey).prev[r.metric] = r.value;
  return [...map.values()];
}

export type SeriesPoint = { date: string } & Values;

/** Serie diaria de varias métricas (totales), con ceros en los días sin dato. */
export async function series(source: string, metrics: string[], range: DateRange, dimKey = ""): Promise<SeriesPoint[]> {
  const db = await getDb();
  const rows = await db
    .select({ date: metricDaily.date, metric: metricDaily.metric, value: metricDaily.value })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), inArray(metricDaily.metric, metrics), eq(metricDaily.dimKey, dimKey), between(metricDaily.date, range.from, range.to)));
  const byDate = new Map<string, Values>();
  for (const r of rows) {
    const v = byDate.get(r.date) ?? {};
    v[r.metric] = Number(r.value);
    byDate.set(r.date, v);
  }
  return eachDay(range).map((date) => {
    const v = byDate.get(date) ?? {};
    return { date, ...Object.fromEntries(metrics.map((m) => [m, v[m] ?? 0])) } as SeriesPoint;
  });
}

/** Serie diaria de una métrica separada por dimensión; las que no entran en `top` se suman en «Otros». */
export async function seriesByDim(source: string, metric: string, prefix: string, range: DateRange, top: number) {
  const db = await getDb();
  const rows = await db
    .select({ date: metricDaily.date, dimKey: metricDaily.dimKey, value: metricDaily.value })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.metric, metric), like(metricDaily.dimKey, `${prefix}:%`), between(metricDaily.date, range.from, range.to)));
  const totalsByKey = new Map<string, number>();
  for (const r of rows) {
    const k = r.dimKey.slice(prefix.length + 1);
    totalsByKey.set(k, (totalsByKey.get(k) ?? 0) + Number(r.value));
  }
  const keys = [...totalsByKey].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const shown = keys.slice(0, top);
  const hasOther = keys.length > top;
  const byDate = new Map<string, Values>();
  for (const r of rows) {
    const k = r.dimKey.slice(prefix.length + 1);
    const bucket = shown.includes(k) ? k : "Otros";
    const v = byDate.get(r.date) ?? {};
    v[bucket] = (v[bucket] ?? 0) + Number(r.value);
    byDate.set(r.date, v);
  }
  const allKeys = hasOther ? [...shown, "Otros"] : shown;
  const points = eachDay(range).map((date) => {
    const v = byDate.get(date) ?? {};
    return { date, ...Object.fromEntries(allKeys.map((k) => [k, v[k] ?? 0])) } as SeriesPoint;
  });
  return { keys: allKeys, points };
}

/** Último valor de cada métrica por dimensión (instantáneas: competencia, PageSpeed). */
export async function latestByDim(source: string, prefix: string) {
  const db = await getDb();
  const rows = await db
    .selectDistinctOn([metricDaily.dimKey, metricDaily.metric], {
      dimKey: metricDaily.dimKey, metric: metricDaily.metric, value: metricDaily.value, date: metricDaily.date, meta: metricDaily.meta,
    })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), like(metricDaily.dimKey, `${prefix}:%`)))
    .orderBy(metricDaily.dimKey, metricDaily.metric, sql`${metricDaily.date} desc`);
  const out = new Map<string, { values: Values; date: string; meta: Record<string, Record<string, unknown> | null> }>();
  for (const r of rows) {
    const k = r.dimKey.slice(prefix.length + 1);
    const e = out.get(k) ?? { values: {}, date: r.date, meta: {} };
    e.values[r.metric] = Number(r.value);
    e.meta[r.metric] = r.meta ?? null;
    if (r.date > e.date) e.date = r.date;
    out.set(k, e);
  }
  return out;
}

export interface History {
  values: Values;
  /** Días con datos antes del periodo actual */
  days: number;
}

/**
 * Tu propio estándar: todo lo anterior al periodo actual, desde el primer dato de la fuente.
 * null si todavía no hay historia.
 */
/** Rango de tu historia: del primer dato de la fuente al día anterior al periodo. */
export async function historyRange(source: string, current: DateRange): Promise<DateRange | null> {
  const db = await getDb();
  const [row] = await db
    .select({ first: sql<string | null>`min(${metricDaily.date})` })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.dimKey, "")));
  const first = row?.first;
  return first && first < current.from ? { from: first, to: addDays(current.from, -1) } : null;
}

export async function history(source: string, metrics: string[], current: DateRange): Promise<History | null> {
  const db = await getDb();
  const [row] = await db
    .select({ first: sql<string | null>`min(${metricDaily.date})` })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.dimKey, "")));
  const first = row?.first;
  if (!first || first >= current.from) return null;
  const to = addDays(current.from, -1);
  const values = await totals(source, metrics, { from: first, to });
  return { values, days: daysBetween(first, to) + 1 };
}

/** Serie de una métrica instantánea por fecha para varias dimensiones (p. ej. competencia). */
export async function snapshots(source: string, metrics: string[], dimKeys: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ dimKey: metricDaily.dimKey, metric: metricDaily.metric, date: metricDaily.date, value: metricDaily.value })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), inArray(metricDaily.metric, metrics), inArray(metricDaily.dimKey, dimKeys)))
    .orderBy(metricDaily.date);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/** Como snapshots, pero de una sola métrica y con su meta (p. ej. el top 10 de Google). */
export async function snapshotsWithMeta(source: string, metric: string, dimKeys: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ dimKey: metricDaily.dimKey, date: metricDaily.date, meta: metricDaily.meta })
    .from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.metric, metric), inArray(metricDaily.dimKey, dimKeys)))
    .orderBy(metricDaily.date);
  return rows.map((r) => ({ ...r, meta: (r.meta ?? null) as Record<string, unknown> | null }));
}

/** Último valor de una métrica total (dim vacío) en o antes de una fecha. */
export async function valueAsOf(source: string, metric: string, date: string, dimKey = ""): Promise<number | null> {
  const db = await getDb();
  const [row] = await db.select({ value: metricDaily.value }).from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.metric, metric), eq(metricDaily.dimKey, dimKey), lte(metricDaily.date, date)))
    .orderBy(desc(metricDaily.date)).limit(1);
  return row ? Number(row.value) : null;
}

/** Filas de una métrica para todas las dimensiones con un prefijo, con su meta (p. ej. publicaciones). */
export async function metaByPrefix(source: string, metric: string, prefix: string) {
  const db = await getDb();
  const rows = await db.select({ dimKey: metricDaily.dimKey, date: metricDaily.date, meta: metricDaily.meta }).from(metricDaily)
    .where(and(eq(metricDaily.source, source), eq(metricDaily.metric, metric), like(metricDaily.dimKey, `${prefix}:%`)));
  return rows.map((r) => ({ ...r, meta: (r.meta ?? null) as Record<string, unknown> | null }));
}
