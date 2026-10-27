import { addDays, todayIso } from "@/lib/dates";

/**
 * Cliente mínimo de la API de Apify. Los actores tardan minutos, así que no se
 * espera a que terminen: cada sincronización guarda la última corrida exitosa y,
 * si ya toca, arranca la siguiente. El dato llega con un ciclo de retraso.
 */
const API = "https://api.apify.com/v2";
const TIMEOUT_MS = 30_000;

export interface ApifyRun { id: string; status: string; startedAt: string; defaultDatasetId: string }

/** Estados de corrida que no van a traer datos. */
const FAILED = new Set(["FAILED", "ABORTED", "TIMED-OUT", "TIMING-OUT", "ABORTING"]);

export const isApifyConfigured = () => Boolean(process.env.APIFY_TOKEN);

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN no está en el entorno");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Apify respondió ${res.status} en ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

const actorPath = (actor: string) => `/acts/${actor.replace("/", "~")}`;

export async function lastRun(actor: string, status?: "SUCCEEDED"): Promise<ApifyRun | null> {
  const q = status ? `?status=${status}` : "";
  const json = await call<{ data: ApifyRun }>(`${actorPath(actor)}/runs/last${q}`);
  return json?.data ?? null;
}

export async function startRun(actor: string, input: unknown, maxChargeUsd: number): Promise<ApifyRun> {
  const json = await call<{ data: ApifyRun }>(`${actorPath(actor)}/runs?maxTotalChargeUsd=${maxChargeUsd}`, { method: "POST", body: JSON.stringify(input) });
  if (!json) throw new Error("Apify no encontró el actor");
  return json.data;
}

export async function datasetItems<T>(datasetId: string, limit = 1000): Promise<T[]> {
  return (await call<T[]>(`/datasets/${datasetId}/items?clean=true&format=json&limit=${limit}`)) ?? [];
}

/** Fecha (México) en que arrancó una corrida. */
export const runDate = (run: ApifyRun) => todayIso(new Date(run.startedAt));

/**
 * Devuelve los resultados de la última corrida exitosa y arranca una nueva si la
 * más reciente (de cualquier estado) empezó hace `everyDays` días o más.
 */
export async function harvest<T>(actor: string, input: unknown, opts: { everyDays: number; maxChargeUsd: number }) {
  const [done, latest] = await Promise.all([lastRun(actor, "SUCCEEDED"), lastRun(actor)]);
  const items = done ? await datasetItems<T>(done.defaultDatasetId) : [];
  const today = todayIso();
  const due = !latest || (latest.status !== "RUNNING" && runDate(latest) <= addDays(today, -opts.everyDays));
  let started = false;
  let startError: string | null = null;
  if (due) {
    try {
      await startRun(actor, input, opts.maxChargeUsd);
      started = true;
    } catch (e) {
      // Límite de corridas simultáneas u otro rechazo: se guarda lo que hay y se reintenta mañana.
      startError = e instanceof Error ? e.message : String(e);
      console.warn(`[apify] no se pudo arrancar ${actor}:`, startError);
    }
  }
  const failed = latest && FAILED.has(latest.status) ? latest.status : null;
  // Sin ningún resultado bueno, un fallo se reporta como error (no como «0 filas» que parece dato real).
  if (!done && (failed || startError)) {
    throw new Error(`Apify (${actor}): ${failed ? `la última corrida terminó en ${failed}` : `no se pudo arrancar: ${startError}`}. Revisa tu crédito y el token.`);
  }
  if (done && failed) console.warn(`[apify] ${actor}: la corrida más reciente terminó en ${failed}; se usan los datos del ${runDate(done)}`);
  return { items, date: done ? runDate(done) : null, started };
}

export async function listRuns(actor: string, limit = 20): Promise<ApifyRun[]> {
  const json = await call<{ data: { items: ApifyRun[] } }>(`${actorPath(actor)}/runs?desc=1&limit=${limit}`);
  return json?.data.items ?? [];
}

/** El plan gratis de Apify permite 5 corridas simultáneas; se lanzan pocas por sincronización. */
const MAX_STARTS_PER_SYNC = 2;

/**
 * Para actores que reciben una sola entrada por corrida (p. ej. un dominio):
 * junta los resultados de las corridas exitosas recientes (la más nueva gana por
 * llave) y lanza, como máximo dos por vez, las entradas sin dato o con dato de
 * `everyDays` días o más. Si Apify rechaza el arranque, se reintenta mañana.
 */
export async function harvestEach<T>(actor: string, inputs: { key: string; input: unknown }[], keyOf: (item: T) => string | undefined, opts: { everyDays: number; maxChargeUsd: number }) {
  const runs = await listRuns(actor, Math.max(20, inputs.length * 3));
  const latest = new Map<string, { item: T; date: string }>();
  for (const run of runs.filter((r) => r.status === "SUCCEEDED")) {
    for (const item of await datasetItems<T>(run.defaultDatasetId, 5)) {
      const key = keyOf(item);
      if (key && !latest.has(key)) latest.set(key, { item, date: runDate(run) });
    }
  }
  const started: string[] = [];
  if (!runs.some((r) => r.status === "RUNNING" || r.status === "READY")) {
    const cutoff = addDays(todayIso(), -opts.everyDays);
    const due = inputs.filter(({ key }) => { const d = latest.get(key)?.date; return !d || d <= cutoff; });
    for (const { key, input } of due.slice(0, MAX_STARTS_PER_SYNC)) {
      try {
        await startRun(actor, input, opts.maxChargeUsd);
        started.push(key);
      } catch (e) {
        console.warn(`[apify] no se pudo arrancar ${actor} para ${key}:`, e instanceof Error ? e.message : e);
        break;
      }
    }
  }
  return { latest, started };
}
