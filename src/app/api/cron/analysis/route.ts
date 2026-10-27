import { hasValidCronSecret, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { runWeeklyAnalysis } from "@/lib/assistant/weekly";

export const maxDuration = 300;

/** Cron de los lunes: análisis semanal automático. */
export async function GET(req: Request) {
  if (!hasValidCronSecret(req)) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 503 });
  try {
    const out = await runWeeklyAnalysis();
    return Response.json({ ok: true, titular: out.titular });
  } catch (e) {
    console.error("[cron:analysis]", e);
    return Response.json({ error: "No se pudo generar el análisis" }, { status: 502 });
  }
}
