import { gte } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, scores } from "@/db/schema";
import { addDays, comparisonWindows, daysBetween, todayIso } from "@/lib/dates";
import { dataSpan, latestUpTo, sumsForWindow } from "@/lib/metrics-store";
import { METRICS } from "./benchmarks";
import { DIMENSIONS, PIPELINE_WINDOW_DAYS, WINDOW_DAYS } from "./config";
import { buildInputs } from "./inputs";
import { rankLevers, type Lever } from "./priorities";
import { computeKpis, type Kpi } from "@/lib/kpis";
import { computeScorecard } from "./score";
import type { Scorecard } from "./types";

export interface LoadedScorecard {
  scorecard: Scorecard;
  levers: Lever[];
  endDate: string;
  windowFrom: string;
  /** Menos de dos ventanas completas de datos: la calificación es línea base */
  isBaseline: boolean;
  hasMock: boolean;
  kpis: Kpi[];
  /** Fecha del primer dato guardado, o null si no hay datos */
  firstDate: string | null;
}

export async function loadScorecard(endDate = addDays(todayIso(), -1)): Promise<LoadedScorecard> {
  const { current, previous } = comparisonWindows(endDate, WINDOW_DAYS);
  const pipelineFrom = addDays(endDate, -(PIPELINE_WINDOW_DAYS - 1));
  const db = await getDb();

  const [cur, prev, pipe, latest, latestPrev, span, leadRows] = await Promise.all([
    sumsForWindow(current),
    sumsForWindow(previous),
    sumsForWindow({ from: pipelineFrom, to: endDate }),
    latestUpTo(endDate),
    latestUpTo(previous.to),
    dataSpan(),
    db.select().from(leads).where(gte(leads.createdAt, new Date(`${pipelineFrom}T06:00:00Z`))),
  ]);

  const windows = { current: cur, previous: prev, pipeline: pipe, latest, latestAtPreviousEnd: latestPrev };
  const inputs = buildInputs(
    windows,
    leadRows.map((l) => ({
      createdAt: l.createdAt, firstContactAt: l.firstContactAt, proposalAt: l.proposalAt,
      stage: l.stage, qualified: l.qualified, value: l.value, package: l.package,
    })),
  );
  const scorecard = computeScorecard(inputs, METRICS, DIMENSIONS);
  const daysOfData = span.firstDate ? daysBetween(span.firstDate, endDate) + 1 : 0;

  return {
    scorecard,
    levers: rankLevers(scorecard),
    endDate,
    windowFrom: current.from,
    isBaseline: daysOfData < WINDOW_DAYS * 2,
    hasMock: span.hasMock,
    kpis: computeKpis(windows),
    firstDate: span.firstDate,
  };
}

/** Guarda la calificación del día para verla en el tiempo. Idempotente por fecha. */
export async function snapshotScorecard(endDate?: string) {
  const loaded = await loadScorecard(endDate);
  const { scorecard } = loaded;
  const values = {
    periodEnd: loaded.endDate,
    overall: scorecard.overall,
    coverage: scorecard.coverage,
    dimensions: scorecard.dimensions.map((d) => ({ id: d.definition.id, score: d.score, scored: d.scored, total: d.total })),
    metrics: scorecard.metrics.map((m) => ({
      id: m.definition.id, value: m.value, status: m.status, band: m.band ?? null,
      benchmark: { green: m.definition.green, yellow: m.definition.yellow, source: m.definition.source },
    })),
  };
  const db = await getDb();
  await db.insert(scores).values(values).onConflictDoUpdate({ target: scores.periodEnd, set: values });
  return loaded;
}
