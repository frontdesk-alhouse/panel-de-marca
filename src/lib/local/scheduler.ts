import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { syncRuns } from "@/db/schema";
import { defaultRange, runSync } from "@/lib/sync";
import { loadWorkspace } from "@/lib/workspace/load";
import { localeSettings } from "@/lib/workspace/store";
import { getSource } from "@/sources/registry";
import { isDue, JOBS, type Job, type JobState } from "./schedule";

/**
 * Programador del modo local: hace lo que en la nube hacen los crons de Vercel.
 * Revisa cada 10 minutos qué le toca y corre una cosa a la vez (PGlite es un solo
 * proceso y así tampoco se gastan cuotas de golpe). Si la compu estaba dormida,
 * se pone al día en la primera revisión.
 */
const TICK_MS = 10 * 60_000;
const FIRST_TICK_MS = 30_000;

type RunStatus = JobState["lastAttemptStatus"];

async function readStates(): Promise<Map<string, JobState>> {
  const db = await getDb();
  const [attempts, oks] = await Promise.all([
    db.selectDistinctOn([syncRuns.source]).from(syncRuns).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
    db.selectDistinctOn([syncRuns.source]).from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
  ]);
  const states = new Map<string, JobState>();
  for (const job of JOBS) {
    const attempt = attempts.find((r) => r.source === job.id);
    const ok = oks.find((r) => r.source === job.id);
    states.set(job.id, {
      lastOkAt: ok?.startedAt ?? null,
      lastAttemptAt: attempt?.startedAt ?? null,
      lastAttemptStatus: (attempt?.status as RunStatus) ?? null,
    });
  }
  return states;
}

/** Puede correr con lo que hay configurado; si no, ni se intenta (no llena sync_runs de errores). */
function canRun(job: Job): boolean {
  if (job.kind === "sync") return Boolean(getSource(job.id)?.isConfigured());
  if (job.kind === "analysis") return Boolean(process.env.ANTHROPIC_API_KEY);
  return true;
}

/** La calificación y el análisis no son fuentes: se registran en sync_runs para saber cuándo corrieron. */
async function runLogged(job: Job, work: () => Promise<unknown>): Promise<void> {
  const db = await getDb();
  const [run] = await db.insert(syncRuns).values({ source: job.id, trigger: "cron" }).returning({ id: syncRuns.id });
  try {
    await work();
    await db.update(syncRuns).set({ status: "ok", finishedAt: new Date() }).where(eq(syncRuns.id, run.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[programador:${job.id}]`, err);
    await db.update(syncRuns).set({ status: "error", error: message.slice(0, 2000), finishedAt: new Date() }).where(eq(syncRuns.id, run.id));
  }
}

async function runJob(job: Job): Promise<void> {
  if (job.kind === "sync") {
    const result = await runSync(job.id, defaultRange(), "cron");
    if (result.status !== "ok") console.warn(`[programador:${job.id}] ${result.error ?? "error"}`);
    return;
  }
  if (job.kind === "scores") {
    const { snapshotScorecard } = await import("@/lib/scorecard/load");
    return runLogged(job, () => snapshotScorecard());
  }
  const { runWeeklyAnalysis } = await import("@/lib/assistant/weekly");
  return runLogged(job, () => runWeeklyAnalysis());
}

let ticking = false;

/** Una revisión: corre en orden todo lo que toca. No se encima con otra revisión. */
export async function tick(now = () => new Date()): Promise<string[]> {
  if (ticking) return [];
  ticking = true;
  const ran: string[] = [];
  try {
    if (!(await loadWorkspace())) return ran; // sin marca configurada no hay nada que medir
    const states = await readStates();
    const { timeZone } = localeSettings();
    for (const job of JOBS) {
      const state = states.get(job.id);
      if (!state || !canRun(job) || !isDue(job, state, now(), timeZone)) continue;
      await runJob(job);
      ran.push(job.id);
    }
  } catch (err) {
    console.error("[programador]", err);
  } finally {
    ticking = false;
  }
  return ran;
}

const STARTED = Symbol.for("panel-de-marca.scheduler");
type GlobalWithFlag = typeof globalThis & { [STARTED]?: boolean };

/** Arranca una sola vez por proceso (el hot reload de `next dev` vuelve a evaluar módulos). */
export function startScheduler(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[STARTED]) return;
  g[STARTED] = true;
  setTimeout(() => void tick(), FIRST_TICK_MS).unref();
  setInterval(() => void tick(), TICK_MS).unref();
  console.info("[programador] activo: revisa cada 10 min qué fuentes toca actualizar");
}
