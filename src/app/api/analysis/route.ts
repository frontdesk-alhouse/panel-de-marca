import { isViewerRequest, requireWorkspace } from "@/lib/api-auth";
import { runWeeklyAnalysis } from "@/lib/assistant/weekly";

export const maxDuration = 300;

/** Genera el análisis semanal a pedido (botón del inicio). */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return Response.json({ error: "No autorizado" }, { status: 401 });
  const missing = await requireWorkspace();
  if (missing) return missing;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Falta la API key de Anthropic" }, { status: 503 });
  try {
    await runWeeklyAnalysis();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[analysis]", e);
    return Response.json({ error: "No se pudo generar el análisis" }, { status: 502 });
  }
}
