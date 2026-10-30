import { isSkillId } from "@/lib/skills/catalog";
import { cachedZip } from "@/lib/skills/zip";

/**
 * Descarga de un skill como .zip. Es material público (también está en GitHub), así que
 * no pide sesión: el comando de instalación con curl tiene que funcionar desde la terminal.
 * Solo acepta ids del catálogo: nunca arma rutas con lo que llega en la URL.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSkillId(id)) return Response.json({ error: "Skill desconocido" }, { status: 404 });
  try {
    const body = cachedZip(id);
    return new Response(Buffer.from(body), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${id}.zip"`,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error(`[skills:${id}]`, err);
    return Response.json({ error: "Este skill todavía no está disponible para descargar" }, { status: 503 });
  }
}
