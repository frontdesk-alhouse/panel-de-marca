import { addDays, todayIso } from "@/lib/dates";

/**
 * Qué corre solo y cada cuánto. Es el mismo calendario que vercel.json (una prueba
 * lo compara), pero en modo local lo ejecuta el programador del propio servidor.
 * El orden importa: primero las fuentes, luego la calificación, al final el análisis.
 */
export type Cadence = "daily" | "weekly";

export interface Job {
  /** id en sync_runs: la fuente, o «scores» / «analysis» */
  id: string;
  kind: "sync" | "scores" | "analysis";
  cadence: Cadence;
  /** ruta del cron equivalente en vercel.json */
  cronPath: string;
}

const SYNC_ORDER = ["serp", "links", "maps", "igcomp", "ideas", "comp", "ga4", "gads", "clarity", "meta", "instagram", "gsc", "psi"] as const;

export const JOBS: readonly Job[] = [
  ...SYNC_ORDER.map((id): Job => ({ id, kind: "sync", cadence: "daily", cronPath: `/api/cron/sync/${id}` })),
  { id: "scores", kind: "scores", cadence: "daily", cronPath: "/api/cron/scores" },
  { id: "analysis", kind: "analysis", cadence: "weekly", cronPath: "/api/cron/analysis" },
];

export interface JobState {
  lastOkAt: Date | null;
  lastAttemptAt: Date | null;
  lastAttemptStatus: "running" | "ok" | "error" | null;
}

/** Tras un error, esperar antes de reintentar para no martillar una API caída. */
export const RETRY_AFTER_MS = 2 * 60 * 60_000;

/** Una corrida «running» más vieja que esto se cortó (la compu se durmió o se cerró el panel). */
export const STALE_RUNNING_MS = 20 * 60_000;

/** Lunes de la semana de `iso` (las semanas del análisis empiezan en lunes, como el cron). */
export function weekStart(iso: string): string {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return addDays(iso, -((dow + 6) % 7));
}

/**
 * Le toca si no ha corrido bien en el periodo actual (hoy, o esta semana desde el lunes).
 * Si la compu estuvo apagada, al despertar se pone al día con una sola corrida, no con
 * una por cada día perdido: las fuentes ya repasan los últimos 7 días.
 */
export function isDue(job: Job, state: JobState, now: Date, timeZone: string): boolean {
  if (state.lastAttemptStatus === "running") {
    const startedAgo = state.lastAttemptAt ? now.getTime() - state.lastAttemptAt.getTime() : 0;
    if (startedAgo < STALE_RUNNING_MS) return false;
    // Cortada: se trata como error y reintenta en cuanto toque.
  }
  if (state.lastAttemptStatus === "error" && state.lastAttemptAt && now.getTime() - state.lastAttemptAt.getTime() < RETRY_AFTER_MS) return false;
  if (!state.lastOkAt) return true;
  const today = todayIso(now, timeZone);
  const lastOk = todayIso(state.lastOkAt, timeZone);
  return job.cadence === "daily" ? lastOk < today : lastOk < weekStart(today);
}
