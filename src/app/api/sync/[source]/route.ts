import { z } from "zod";
import { daysBetween } from "@/lib/dates";
import { defaultRange, runSync } from "@/lib/sync";
import { isAuthorized, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { getSource } from "@/sources/registry";
import { ranOkToday } from "@/lib/sync";
import { ONCE_A_DAY_SOURCES } from "@/lib/sync-plan";

// PageSpeed tarda ~90 s por medición; Vercel con Fluid Compute permite hasta 300 s.
export const maxDuration = 300;

const MAX_DAYS_PER_CALL = 31;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.object({ from: isoDate, to: isoDate }).partial();

/** Sincroniza una fuente a mano (botón «Sincronizar ahora»). El backfill largo va por scripts/sync.ts. */
export async function POST(req: Request, ctx: { params: Promise<{ source: string }> }) {
  if (!(await isAuthorized(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const { source } = await ctx.params;
  if (!getSource(source)) return Response.json({ error: "Fuente desconocida" }, { status: 404 });

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Fechas inválidas (AAAA-MM-DD)" }, { status: 400 });

  const fallback = defaultRange();
  const range = { from: parsed.data.from ?? fallback.from, to: parsed.data.to ?? fallback.to };
  const span = daysBetween(range.from, range.to);
  if (span < 0 || span >= MAX_DAYS_PER_CALL) {
    return Response.json({ error: `El rango debe ser de 1 a ${MAX_DAYS_PER_CALL} días` }, { status: 400 });
  }

  // Clarity tiene cuota de 10 llamadas al día: si ya trajo datos hoy, no se gasta otra.
  if (ONCE_A_DAY_SOURCES.has(source) && (await ranOkToday(source))) {
    return Response.json({ source, status: "ok", rows: 0, range, skipped: "quota" });
  }
  const result = await runSync(source, range, "manual");
  return Response.json(result, { status: result.status === "ok" ? 200 : 502 });
}
