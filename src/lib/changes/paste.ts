import { CHANGE_AREAS } from "@/db/schema";
import { ChangeSchema, type ChangeInput } from "./store";

/**
 * Lee el bloque «panel-cambios» que devuelve la IA (o cualquier lista con el mismo formato):
 *   - 2026-10-29 | propio | conversion | Qué cambió | https://enlace-opcional
 * Tolera acentos y mayúsculas en el área, viñetas «-», «*» o «•», y texto alrededor del bloque.
 */
const AREA_ALIASES: Record<string, string> = {
  conversión: "conversion", inversión: "inversion", adquisición: "adquisicion", visibilidad: "visibilidad",
  seo: "visibilidad", anuncios: "inversion", ads: "inversion", sitio: "experiencia", velocidad: "experiencia",
  redes: "marca", social: "marca", crm: "pipeline", leads: "pipeline", trafico: "adquisicion", tráfico: "adquisicion",
};
const KIND_ALIASES: Record<string, "propio" | "externo"> = { propio: "propio", nuestro: "propio", own: "propio", ours: "propio", externo: "externo", external: "externo" };

export interface PasteResult { changes: ChangeInput[]; problems: string[] }

export function parseChangeBlock(text: string, today: string): PasteResult {
  const fenced = text.match(/```panel-cambios\s*\n([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const changes: ChangeInput[] = [];
  const problems: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line.includes("|")) continue;
    const parts = line.split("|").map((p) => p.trim());
    const [dateRaw, kindRaw, areaRaw, title, url] = parts.length >= 4 ? parts : ["", "", "", parts[0], parts[1]];
    const areaKey = (areaRaw ?? "").toLowerCase();
    const area = (CHANGE_AREAS as readonly string[]).includes(areaKey) ? areaKey : AREA_ALIASES[areaKey] ?? "general";
    const parsed = ChangeSchema.safeParse({
      date: /^\d{4}-\d{2}-\d{2}$/.test(dateRaw ?? "") ? dateRaw : today,
      kind: KIND_ALIASES[(kindRaw ?? "").toLowerCase()] ?? "propio",
      area,
      title: title ?? "",
      detail: null,
      url: url && /^https?:\/\//i.test(url) ? url : null,
    });
    if (parsed.success) {
      if (parsed.data.date > today) problems.push(`«${parsed.data.title}»: fecha futura, se registra con hoy`);
      changes.push(parsed.data.date > today ? { ...parsed.data, date: today } : parsed.data);
    } else {
      problems.push(`No se entendió: ${line.slice(0, 80)}`);
    }
  }
  return { changes: changes.slice(0, 50), problems };
}
