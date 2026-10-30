import { z } from "zod";
import { snapshotScorecard } from "@/lib/scorecard/load";
import { isViewerRequest, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { addDays, todayIso } from "@/lib/dates";

// Reconstruir 120 días son 120 cálculos seguidos.
export const maxDuration = 300;

const Body = z.object({ backfillDays: z.number().int().min(1).max(120).optional() });

/**
 * Recalcula la calificación (solo una persona con sesión). Sin cuerpo: la de hoy, al
 * terminar «Sincronizar ahora». Con backfillDays: recalcula todo el historial
 * con los datos que ya hay (para la gráfica en el tiempo). Idempotente por fecha: reemplaza.
 */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Días inválidos (1 a 120)" }, { status: 400 });
  try {
    if (parsed.data.backfillDays) {
      // Se recalculan todos los días, también los ya guardados: si cambian las reglas de la nota
      // (o llegaron datos tarde), el historial viejo no se queda con calificaciones que ya no valen.
      const yesterday = addDays(todayIso(), -1);
      let saved = 0;
      for (let d = parsed.data.backfillDays - 1; d >= 0; d--) {
        await snapshotScorecard(addDays(yesterday, -d));
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
