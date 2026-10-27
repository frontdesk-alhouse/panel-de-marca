import { defaultRange, runSync } from "@/lib/sync";
import { hasValidCronSecret, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { getSource } from "@/sources/registry";

// PageSpeed tarda ~90 s por medición; Vercel con Fluid Compute permite hasta 300 s.
export const maxDuration = 300;

/** Vercel Cron invoca con GET. Una ruta por fuente para no pasar de 60 s. */
export async function GET(req: Request, ctx: { params: Promise<{ source: string }> }) {
  if (!hasValidCronSecret(req)) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  const { source } = await ctx.params;
  if (!getSource(source)) return Response.json({ error: "Fuente desconocida" }, { status: 404 });
  const result = await runSync(source, defaultRange(), "cron");
  return Response.json(result, { status: result.status === "ok" ? 200 : 502 });
}
