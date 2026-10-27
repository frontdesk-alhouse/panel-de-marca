import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Briefing } from "@/lib/workspace/schema";
import type { SiteProfile } from "./scrape";

/**
 * Borrador de «quién eres» con Claude: lee el sitio y las respuestas del briefing y
 * propone la ficha de la marca. Es un borrador: la persona lo revisa antes de guardar.
 * Sin llave de Anthropic no se llama; la configuración usa solo lo que dice el sitio.
 */
export const DRAFT_MODEL = "claude-sonnet-5-5";

export const DraftSchema = z.object({
  name: z.string().describe("Nombre comercial de la marca"),
  city: z.string().describe("Ciudad principal donde opera; vacío si no se sabe"),
  localCities: z.array(z.string()).describe("Municipios o zonas del área local, si aplica (máx. 6)"),
  marketContext: z.string().describe("Qué es en una línea, p. ej. «una pastelería artesanal en Monterrey»"),
  about: z.string().describe("Un párrafo (60-120 palabras): qué hace, para quién, cómo se diferencia, tono"),
  brief: z.string().describe("Brief de marca (200-400 palabras): posicionamiento, oferta, público, diferenciadores, pruebas, tono y lo que NO es"),
  services: z.array(z.string()).describe("Servicios o productos principales, nombres cortos (3-10)"),
  packages: z.array(z.object({ name: z.string(), price: z.number().nullable().describe("Precio de entrada en la moneda local; null si no se publica") })).describe("Paquetes o planes con precio, solo si el sitio los menciona"),
  currency: z.string().describe("Moneda ISO 4217 que usa la marca, p. ej. MXN"),
  brandTerms: z.array(z.string()).describe("Palabras que identifican búsquedas de marca: nombre, variantes, dominio sin TLD (minúsculas)"),
  targetQueries: z.array(z.string()).describe("5-8 búsquedas de Google que un cliente haría para contratar o comprar, con ciudad si es negocio local"),
  topics: z.array(z.string()).describe("5-10 temas de servicio para el autocompletado de Google (2-4 palabras, sin ciudad)"),
  relevantTerms: z.array(z.string()).describe("10-20 palabras sueltas (minúsculas) que hacen relevante una idea de contenido para esta marca"),
  redditSearches: z.array(z.object({ sub: z.string(), q: z.string(), topic: z.string() })).describe("3-8 búsquedas en subreddits reales y activos donde su público conversa (inglés o español)"),
  missing: z.array(z.string()).describe("Datos importantes que el sitio no dice y conviene preguntar (máx. 4)"),
});
export type Draft = z.infer<typeof DraftSchema>;

const MAX_SITE_CHARS = 45_000;

function siteForPrompt(site: SiteProfile): string {
  const parts = site.pages.map((p) => `### ${p.url}\nTítulo: ${p.title}\nDescripción: ${p.description}\nEncabezados: ${p.headings.join(" · ")}\n${p.text}`);
  let out = "";
  for (const part of parts) {
    if (out.length + part.length > MAX_SITE_CHARS) break;
    out += `${part}\n\n`;
  }
  const f = site.facts;
  return `Dominio: ${site.domain}\nDatos estructurados: nombre=${f.name ?? "?"}, ciudad=${f.city ?? "?"}, idioma=${f.lang ?? "?"}, instagram=${f.instagram ?? "?"}, precios vistos=${f.prices.join(", ") || "ninguno"}\n\n${out}`;
}

export interface DraftInput {
  site: SiteProfile;
  briefing: Briefing;
  /** Competidores que la persona ya conoce (texto libre). */
  knownCompetitors: string;
  language: "es" | "en";
}

export async function draftBrand({ site, briefing, knownCompetitors, language }: DraftInput): Promise<Draft> {
  const client = new Anthropic();
  const answers = [
    `¿A quién le vende? ${briefing.audience || "(no respondió)"}`,
    `¿Qué quiere lograr? ${briefing.goals || "(no respondió)"}`,
    `¿Qué quiere saber de su competencia? ${[...briefing.wantToKnow, briefing.wantToKnowOther].filter(Boolean).join(", ") || "(no respondió)"}`,
    `¿Qué ideas de contenido quiere? ${briefing.contentIdeas || "(no respondió)"}`,
    `Competencia que ya conoce: ${knownCompetitors || "(no respondió)"}`,
  ].join("\n");
  const response = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 8000,
    system: `Eres estratega de marca. Lees el sitio web de un negocio y las respuestas de su dueño, y escribes la ficha que usará su panel de marketing. Escribe en ${language === "en" ? "inglés" : "español de México, de tú"}. Usa solo lo que dice el sitio o el dueño: no inventes cifras, clientes, premios ni precios. Si algo no se sabe, déjalo vacío y anótalo en «missing». Lo que el dueño responda pesa más que el sitio.`,
    output_config: { format: zodOutputFormat(DraftSchema) },
    messages: [{ role: "user", content: `# Respuestas del dueño\n${answers}\n\n# Sitio web\n${siteForPrompt(site)}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`No se pudo escribir el borrador (${response.stop_reason})`);
  return response.parsed_output;
}
