import { asc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { competitors as competitorsTable, workspace as workspaceTable } from "@/db/schema";
import { CompetitorSchema, WorkspaceSchema, type CompetitorInput, type Workspace } from "./schema";
import { hasWorkspace, loadedAt, setWorkspace } from "./store";

/** Cada cuánto se vuelve a leer la base (cambios hechos desde otra instancia). */
const REFRESH_MS = 60_000;
let inflight: Promise<boolean> | null = null;

async function read(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select().from(workspaceTable).where(eq(workspaceTable.id, 1)).limit(1);
  if (!row) return false;
  const parsed = WorkspaceSchema.safeParse(row.data);
  if (!parsed.success) {
    throw new Error(`La configuración guardada no es válida: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const rows = await db.select().from(competitorsTable).where(eq(competitorsTable.active, true)).orderBy(asc(competitorsTable.sort), asc(competitorsTable.id));
  const list: CompetitorInput[] = rows.map((r) => {
    const c: CompetitorInput = { name: r.name, domain: r.domain, city: r.city, mapsQuery: r.mapsQuery };
    if (r.instagram) c.instagram = r.instagram;
    return c;
  });
  setWorkspace(parsed.data, list, row.setupCompletedAt);
  return true;
}

/**
 * Carga la configuración en memoria (si no está o ya pasó un minuto).
 * Devuelve false si la base no tiene configuración todavía.
 */
export async function loadWorkspace(opts: { force?: boolean } = {}): Promise<boolean> {
  if (!isDbConfigured()) return hasWorkspace();
  const fresh = hasWorkspace() && Date.now() - loadedAt() < REFRESH_MS;
  if (fresh && !opts.force) return true;
  inflight ??= read().finally(() => { inflight = null; });
  try {
    return await inflight;
  } catch (err) {
    // Si ya había una copia, se sigue usando: un fallo pasajero de la base no tumba el panel.
    if (hasWorkspace()) {
      console.error("[workspace] no se pudo refrescar:", err instanceof Error ? err.message : err);
      return true;
    }
    throw err;
  }
}

/** Guarda la configuración completa y la competencia (reemplaza la lista activa). */
export async function saveWorkspace(data: Workspace, list?: CompetitorInput[], opts: { completeSetup?: boolean } = {}): Promise<void> {
  const ws = WorkspaceSchema.parse(data);
  const db = await getDb();
  const now = new Date();
  const setup = opts.completeSetup ? { setupCompletedAt: now } : {};
  await db.insert(workspaceTable).values({ id: 1, data: ws, updatedAt: now, ...setup })
    .onConflictDoUpdate({ target: workspaceTable.id, set: { data: ws, updatedAt: now, ...setup } });
  if (list) await saveCompetitors(list);
  await loadWorkspace({ force: true });
}

/** La lista recibida queda activa en ese orden; las que ya no vienen se desactivan (conservan su historial). */
export async function saveCompetitors(list: CompetitorInput[]): Promise<void> {
  const items = list.map((c) => CompetitorSchema.parse({ ...c, domain: c.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") }));
  const domains = new Set(items.map((c) => c.domain));
  if (domains.size !== items.length) throw new Error("Hay dominios repetidos en la competencia");
  const db = await getDb();
  const existing = await db.select().from(competitorsTable);
  for (const row of existing) {
    if (!domains.has(row.domain) && row.active) await db.update(competitorsTable).set({ active: false }).where(eq(competitorsTable.id, row.id));
  }
  for (const [sort, c] of items.entries()) {
    const values = { name: c.name, city: c.city, mapsQuery: c.mapsQuery, instagram: c.instagram ?? null, active: true, sort };
    await db.insert(competitorsTable).values({ domain: c.domain, ...values })
      .onConflictDoUpdate({ target: competitorsTable.domain, set: values });
  }
}
