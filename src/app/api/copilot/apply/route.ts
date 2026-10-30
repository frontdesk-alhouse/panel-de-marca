import { z } from "zod";
import { getViewer } from "@/auth";
import { isViewerRequest, requireWorkspace, unauthorized } from "@/lib/api-auth";
import { decideProposal } from "@/lib/assistant/copilot";

export const maxDuration = 300;

const Body = z.object({ id: z.number().int().positive(), decision: z.enum(["apply", "discard"]) });

/** «Aplicar» / «Descartar» de una propuesta del copiloto: la única vía para que el chat cambie algo. */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pedido inválido" }, { status: 400 });
  const viewer = (await getViewer())?.email ?? "desconocido";
  const r = await decideProposal(parsed.data.id, parsed.data.decision, viewer);
  return r.ok ? Response.json({ result: r.result }) : Response.json({ error: r.error }, { status: r.status });
}
