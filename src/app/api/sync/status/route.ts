import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { syncRuns } from "@/db/schema";
import { isAuthorized, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { JOBS } from "@/lib/local/schedule";
import { getSource } from "@/sources/registry";
import { groupOf, type PlannedSource } from "@/lib/sync-plan";

/** Última corrida por fuente, la última buena y las fuentes que se pueden sincronizar ahora. */
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const db = await getDb();
  const [runs, oks] = await Promise.all([
    db.selectDistinctOn([syncRuns.source]).from(syncRuns).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
    db.selectDistinctOn([syncRuns.source], { source: syncRuns.source, finishedAt: syncRuns.finishedAt })
      .from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
  ]);
  const sources: PlannedSource[] = JOBS.filter((j) => j.kind === "sync")
    .map((j) => getSource(j.id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.isConfigured()))
    .map((s) => ({ id: s.id, label: s.label, group: groupOf(s.id) }));
  const lastOk = Object.fromEntries(oks.map((o) => [o.source, o.finishedAt]));
  return Response.json({ runs, sources, lastOk });
}
