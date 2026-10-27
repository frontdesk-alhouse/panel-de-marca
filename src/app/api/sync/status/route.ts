import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { syncRuns } from "@/db/schema";
import { isAuthorized, unauthorized, requireWorkspace } from "@/lib/api-auth";

/** Última corrida por fuente. */
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const db = await getDb();
  const runs = await db
    .selectDistinctOn([syncRuns.source])
    .from(syncRuns)
    .orderBy(syncRuns.source, desc(syncRuns.startedAt));
  return Response.json({ runs });
}
