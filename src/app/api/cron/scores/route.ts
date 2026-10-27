import { snapshotScorecard } from "@/lib/scorecard/load";
import { hasValidCronSecret, unauthorized, requireWorkspace } from "@/lib/api-auth";

export const maxDuration = 60;

/** Guarda la calificación de ayer en `scores` (Vercel Cron, diario). */
export async function GET(req: Request) {
  if (!hasValidCronSecret(req)) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  try {
    const { endDate, scorecard } = await snapshotScorecard();
    return Response.json({ endDate, overall: scorecard.overall, coverage: scorecard.coverage });
  } catch (err) {
    console.error("[cron:scores]", err);
    return Response.json({ error: "No se pudo calcular la calificación" }, { status: 500 });
  }
}
