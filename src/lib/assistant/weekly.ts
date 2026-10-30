import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { addDays, todayIso } from "@/lib/dates";
import { assistantSystem } from "./context";
import { readSection } from "./data";

export const ASSISTANT_MODEL = "claude-opus-5-5";

/** Modelos que se pueden elegir en el chat (Opus como máximo). */
export const CHAT_MODELS = {
  sonnet: { id: "claude-sonnet-5-5", label: "Sonnet 5.5", hint: "Rápido" },
  opus: { id: "claude-opus-5-5", label: "Opus 5.5", hint: "Más profundo" },
} as const;
export type ChatModelKey = keyof typeof CHAT_MODELS;

/** Sobre qué se trabaja: agrupa las acciones y elige el skill que se le pasa a la IA. */
export const FRENTES = ["seo", "geo", "anuncios", "conversion", "medicion", "sitio", "contenido", "redes", "crm", "competencia"] as const;
export type Frente = (typeof FRENTES)[number] | "otro";

const Accion = z.object({
  frente: z.enum(FRENTES).describe("Sobre qué vamos a trabajar: seo (Google), geo (asistentes de IA), anuncios, conversion (formularios y contacto), medicion (GA4, eventos, píxeles), sitio (velocidad, páginas), contenido, redes, crm, competencia"),
  accion: z.string().describe("Qué vamos a hacer, en imperativo y concreto, máximo 14 palabras. Ej. Crear la página «branding para médicos» y enlazarla desde la Home"),
  hallazgo: z.string().describe("Lo que vimos en los datos y lleva a esta acción, con cifra, máximo 25 palabras"),
  pasos: z.array(z.string()).describe("2 a 4 pasos concretos, cada uno de máximo 16 palabras, diciendo dónde se hace (Framer, Google Ads, GA4, Instagram…)"),
  exito: z.string().describe("Cómo sabremos que funcionó: métrica, meta y plazo, máximo 18 palabras"),
  seccion: z.string().describe("Sección del panel donde se ve el dato"),
  impacto: z.enum(["alto", "medio", "bajo"]),
  porQue: z.string().describe("Por qué importa para el negocio, máximo 20 palabras"),
});

export const WeeklySchema = z.object({
  titular: z.string().describe("Una frase: lo más importante de la semana"),
  foco: z.string().describe("En qué vamos a trabajar esta semana: una frase que empiece con verbo y nombre los frentes, máximo 20 palabras"),
  queCambio: z.array(z.string()).describe("3 a 6 cambios relevantes contra la semana anterior, con cifras"),
  bien: z.array(z.string()).describe("Lo que está funcionando"),
  riesgos: z.array(z.string()).describe("Lo que hay que atender"),
  acciones: z.array(Accion).describe("3 a 5 acciones priorizadas para esta semana; cada una sale de un hallazgo del análisis"),
  aprendizajes: z.array(z.string()).describe("Qué se confirmó o se descartó respecto a análisis anteriores; qué dejar de hacer"),
  esperar: z.array(z.string()).describe("Cosas que todavía no conviene juzgar o cambiar, y hasta cuándo"),
});
export type Weekly = z.infer<typeof WeeklySchema>;

/** Análisis guardados antes de que existieran foco, frente, hallazgo, pasos y éxito: se leen con valores vacíos. */
const StoredWeeklySchema = WeeklySchema.extend({
  foco: z.string().default(""),
  acciones: z.array(Accion.extend({
    frente: z.enum([...FRENTES, "otro"]).default("otro"),
    hallazgo: z.string().default(""),
    pasos: z.array(z.string()).default([]),
    exito: z.string().default(""),
  })),
});
export type StoredWeekly = z.infer<typeof StoredWeeklySchema>;

function readWeekly(output: unknown): StoredWeekly {
  const parsed = StoredWeeklySchema.safeParse(output);
  return parsed.success ? parsed.data : (output as StoredWeekly);
}

export async function latestAnalysis(n = 1) {
  const db = await getDb();
  const rows = await db.select().from(analyses).where(eq(analyses.kind, "weekly")).orderBy(desc(analyses.createdAt)).limit(n);
  return rows.map((r) => ({ periodo: `${r.periodFrom} a ${r.periodTo}`, range: { from: r.periodFrom, to: r.periodTo }, creado: r.createdAt, analisis: readWeekly(r.output) }));
}

/**
 * Análisis semanal: junta las secciones del panel (7 y 28 días), el análisis
 * anterior y le pide a Claude un resumen estructurado. Se guarda en `analyses`.
 */
export async function runWeeklyAnalysis() {
  const sections = ["resumen", "google_ads", "comportamiento", "social", "seo", "competencia", "crm", "negocio", "ideas"] as const;
  const week = await Promise.all(sections.map(async (s) => [s, await readSection(s, "7")] as const));
  const month = await readSection("resumen", "28");
  const previous = await latestAnalysis(2);

  const data = `# Datos de la última semana (7 días) por sección\n${week.map(([s, v]) => `## ${s}\n${v}`).join("\n\n")}\n\n# Resumen de 28 días\n${month}\n\n# Análisis anteriores\n${previous.length ? JSON.stringify(previous) : "Ninguno: este es el primero."}`;
  const to = addDays(todayIso(), -1);
  const from = addDays(to, -6);
  const inputHash = createHash("sha256").update(data).digest("hex").slice(0, 32);

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: ASSISTANT_MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: assistantSystem(), cache_control: { type: "ephemeral" } }],
    output_config: { effort: "high", format: zodOutputFormat(WeeklySchema) },
    messages: [{ role: "user", content: `Escribe el análisis semanal del ${from} al ${to}. Compara con los análisis anteriores: di qué recomendaciones se cumplieron o no movieron nada, y ajusta. Sé concreto y usa cifras.

Lo más importante es QUÉ VAMOS A HACER: el análisis es el diagnóstico y las acciones son el tratamiento. Cada acción sale de un hallazgo concreto (dilo en «hallazgo» con su cifra), dice sobre qué frente se trabaja (SEO, GEO, anuncios, conversión, medición…), qué hacer exactamente, en qué plataforma, y cómo sabremos que funcionó. Nada genérico como «mejorar el SEO»: di qué página, qué campaña, qué evento. «foco» resume en una frase en qué se trabaja esta semana.\n\n${data}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`El análisis no se pudo generar (${response.stop_reason})`);

  const db = await getDb();
  await db.insert(analyses).values({
    kind: "weekly", periodFrom: from, periodTo: to, inputHash, output: response.parsed_output, model: ASSISTANT_MODEL, usage: response.usage,
  });
  return response.parsed_output;
}
