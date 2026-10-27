import { hasValidSyncSecret, IngestSchema, ingestProposals, syncContext } from "@/lib/crm/meetings";
import { unauthorized, requireWorkspace } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** Para el proceso local que lee Wispr Flow: reuniones ya recibidas y prospectos para cruzar. */
export async function GET(req: Request) {
  if (!hasValidSyncSecret(req)) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  try {
    return Response.json(await syncContext());
  } catch (e) {
    console.error("[meetings] contexto", e);
    return Response.json({ error: "No se pudo leer el CRM" }, { status: 500 });
  }
}

/** Recibe propuestas de reuniones; quedan pendientes en la bandeja del CRM. */
export async function POST(req: Request) {
  if (!hasValidSyncSecret(req)) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const parsed = IngestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Formato inválido", issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  }
  try {
    return Response.json({ ok: true, ...(await ingestProposals(parsed.data.proposals)) });
  } catch (e) {
    console.error("[meetings] ingest", e);
    return Response.json({ error: "No se pudieron guardar" }, { status: 500 });
  }
}
