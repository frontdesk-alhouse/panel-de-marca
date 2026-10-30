import { z } from "zod";
import { snapshotScorecard } from "@/lib/scorecard/load";
import { isViewerRequest, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { addDays, todayIso } from "@/lib/dates";
import { scoreHistory } from "@/lib/changes/store";

// Reconstruir 120 días son 120 cálculos seguidos.
export const maxDuration = 300;

const Body = z.object({ backfillDays: z.number().int().min(1).max(120).optional() });

/**
 * Recalcula la calificación (solo una persona con sesión). Sin cuerpo: la de hoy, al
 * terminar «Sincronizar ahora». Con backfillDays: completa los días que faltan del historial
 * con los datos que ya hay (para la gráfica en el tiempo). Idempotente por fecha.
 */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Días inválidos (1 a 120)" }, { status: 400 });
  try {
    if (parsed.data.backfillDays) {
      // Solo los días que faltan: los guardados por el cron reflejan el día real y no se pisan.
      const yesterday = addDays(todayIso(), -1);
      const have = new Set((await scoreHistory(parsed.data.backfillDays + 2)).map((h) => h.date));
      let saved = 0;
      for (let d = parsed.data.backfillDays - 1; d >= 0; d--) {
        const date = addDays(yesterday, -d);
        if (have.has(date)) continue;
        await snapshotScorecard(date, { keepExisting: true });
        saved++;
      }
      return Response.json({ saved });
    }
    const { endDate, scorecard } = await snapshotScorecard();
    return Response.json({ endDate, overall: scorecard.overall, coverage: scorecard.coverage });
  } catch (err) {
    console.error("[scores:manual]", err);
    return Response.json({ error: "No se pudo calcular la calificación" }, { status: 500 });
  }
}
