import { z } from "zod";
import { isAuthorized, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { runStrategy } from "@/lib/assistant/strategy";
import { money } from "@/lib/crm/validation";

export const maxDuration = 300;

const Body = z.object({ budget: money, notes: z.string().max(1500).optional(), goal: z.string().max(500).optional() });

/** Genera el plan de medios (Opus, ~2-3 min). */
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Falta la API key de Anthropic" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Revisa el presupuesto: solo el monto, por ejemplo 15,000" }, { status: 400 });
  try {
    await runStrategy({ budgetMxn: parsed.data.budget, notes: parsed.data.notes, goal: parsed.data.goal });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[strategy]", e);
    return Response.json({ error: "No se pudo generar la estrategia. Intenta de nuevo." }, { status: 502 });
  }
}
