import { readFileSync } from "node:fs";
import path from "node:path";
import { isSkillId } from "@/lib/skills/catalog";
import { SKILLS_DIR } from "@/lib/skills/zip";

/** El SKILL.md en texto: para pegarlo como instrucciones en una IA que no carga skills. Público, como el zip. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSkillId(id)) return Response.json({ error: "Skill desconocido" }, { status: 404 });
  try {
    const text = readFileSync(path.join(SKILLS_DIR, id, "SKILL.md"), "utf8");
    return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
  } catch {
    return Response.json({ error: "Este skill todavía no está disponible" }, { status: 503 });
  }
}
