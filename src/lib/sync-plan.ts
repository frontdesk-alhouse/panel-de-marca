/**
 * Qué corre el botón «Sincronizar ahora». Las fuentes de competencia usan Apify
 * (gastan créditos y cambian lento): solo entran si la persona lo pide.
 * Clarity permite 10 llamadas al día: si ya corrió bien hoy, se salta.
 */
export const COMPETITION_SOURCES: ReadonlySet<string> = new Set(["comp", "serp", "links", "maps", "igcomp", "ideas"]);
export const ONCE_A_DAY_SOURCES: ReadonlySet<string> = new Set(["clarity"]);

export type SyncGroup = "own" | "competition";

export interface PlannedSource {
  id: string;
  label: string;
  group: SyncGroup;
}

export const groupOf = (id: string): SyncGroup => (COMPETITION_SOURCES.has(id) ? "competition" : "own");

/** Orden del calendario (los configurados) filtrado por lo que se pidió. */
export function manualPlan(configured: readonly PlannedSource[], includeCompetition: boolean): PlannedSource[] {
  return configured.filter((s) => includeCompetition || s.group === "own");
}

/** Una corrida «running» más nueva que esto se considera viva: el botón espera en vez de lanzar otra. */
export const LIVE_RUN_MS = 6 * 60_000;

export function isLiveRun(run: { status: string; startedAt: string | Date }, now = Date.now()): boolean {
  return run.status === "running" && now - new Date(run.startedAt).getTime() < LIVE_RUN_MS;
}
