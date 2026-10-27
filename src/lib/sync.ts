import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, syncRuns } from "@/db/schema";
import { addDays, todayIso, type DateRange } from "@/lib/dates";
import { upsertMetricRows } from "@/lib/metrics-store";
import { getSource } from "@/sources/registry";
import { MOCK_LEADS } from "@/sources/mock";
import { isLocalMode } from "@/lib/mode";

/**
 * Una corrida «running» más vieja que esto se da por cortada. Nube: más que el
 * maxDuration de Vercel con margen. Local: no hay tope de tiempo, pero PageSpeed
 * y Apify pueden tardar varios minutos.
 */
const staleRunMs = () => (isLocalMode() ? 20 * 60_000 : 120_000);

export type SyncTrigger = "cron" | "manual" | "script";

export interface SyncResult {
  source: string;
  status: "ok" | "error";
  rows: number;
  range: DateRange;
  error?: string;
}

/**
 * Rango por defecto: los últimos 7 días cerrados. Search Console publica con 2-3
 * días de retraso y GA4 corrige días recientes; repasar una semana los cubre.
 */
export function defaultRange(): DateRange {
  const yesterday = addDays(todayIso(), -1);
  return { from: addDays(yesterday, -6), to: yesterday };
}

async function seedMockLeads(): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  for (const l of MOCK_LEADS) {
    const createdAt = new Date(now - l.daysAgo * 86_400_000);
    const minutes = (m: number) => new Date(createdAt.getTime() + m * 60_000);
    const values = {
      source: "form" as const,
      externalId: l.externalId,
      createdAt,
      nickname: `Prueba ${l.externalId.slice(5)}`,
      channel: l.channel,
      stage: l.stage,
      qualified: l.qualified,
      package: l.package,
      firstContactAt: l.responseMinutes === null ? null : minutes(l.responseMinutes),
      proposalAt: ["propuesta", "cerrado", "perdido"].includes(l.stage) && l.qualified ? minutes(4 * 1440) : null,
      closedAt: l.stage === "cerrado" ? minutes(12 * 1440) : null,
      meta: { mock: true },
    };
    await db.insert(leads).values(values).onConflictDoUpdate({ target: leads.externalId, set: values });
  }
}

export async function runSync(sourceId: string, range: DateRange, trigger: SyncTrigger): Promise<SyncResult> {
  const source = getSource(sourceId);
  if (!source) return { source: sourceId, status: "error", rows: 0, range, error: "Fuente desconocida" };
  if (!source.isConfigured()) {
    return { source: sourceId, status: "error", rows: 0, range, error: "Fuente sin credenciales en el entorno" };
  }

  const db = await getDb();
  // Una corrida cortada (Vercel a los 60 s, o la compu que se apagó) nunca llega a ok ni a error: cerrarla aquí.
  await db.update(syncRuns)
    .set({ status: "error", error: "Se cortó por tiempo", finishedAt: new Date() })
    .where(and(eq(syncRuns.source, sourceId), eq(syncRuns.status, "running"), lt(syncRuns.startedAt, new Date(Date.now() - staleRunMs()))));
  const [run] = await db.insert(syncRuns).values({ source: sourceId, trigger }).returning({ id: syncRuns.id });
  try {
    const rows = await source.fetchDaily(range);
    const written = await upsertMetricRows(rows);
    if (sourceId === "mock") await seedMockLeads();
    await db.update(syncRuns)
      .set({ status: "ok", rows: written, finishedAt: new Date() })
      .where(eq(syncRuns.id, run.id));
    return { source: sourceId, status: "ok", rows: written, range };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sync:${sourceId}]`, err);
    await db.update(syncRuns)
      .set({ status: "error", error: message.slice(0, 2000), finishedAt: new Date() })
      .where(eq(syncRuns.id, run.id));
    // Al cliente, mensaje genérico; el detalle queda en sync_runs y en los logs.
    return { source: sourceId, status: "error", rows: 0, range, error: "La fuente respondió con error" };
  }
}
