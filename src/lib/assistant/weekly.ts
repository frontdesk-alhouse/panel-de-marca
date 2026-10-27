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

export const WeeklySchema = z.object({
  titular: z.string().describe("Una frase: lo más importante de la semana"),
  queCambio: z.array(z.string()).describe("3 a 6 cambios relevantes contra la semana anterior, con cifras"),
  bien: z.array(z.string()).describe("Lo que está funcionando"),
  riesgos: z.array(z.string()).describe("Lo que hay que atender"),
  acciones: z.array(z.object({
    accion: z.string(), seccion: z.string(), impacto: z.enum(["alto", "medio", "bajo"]), porQue: z.string(),
  })).describe("3 a 5 acciones priorizadas para esta semana"),
  aprendizajes: z.array(z.string()).describe("Qué se confirmó o se descartó respecto a análisis anteriores; qué dejar de hacer"),
  esperar: z.array(z.string()).describe("Cosas que todavía no conviene juzgar o cambiar, y hasta cuándo"),
});
export type Weekly = z.infer<typeof WeeklySchema>;

export async function latestAnalysis(n = 1) {
  const db = await getDb();
  const rows = await db.select().from(analyses).where(eq(analyses.kind, "weekly")).orderBy(desc(analyses.createdAt)).limit(n);
  return rows.map((r) => ({ periodo: `${r.periodFrom} a ${r.periodTo}`, range: { from: r.periodFrom, to: r.periodTo }, creado: r.createdAt, analisis: r.output as Weekly }));
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
    messages: [{ role: "user", content: `Escribe el análisis semanal del ${from} al ${to}. Compara con los análisis anteriores: di qué recomendaciones se cumplieron o no movieron nada, y ajusta. Sé concreto y usa cifras.\n\n${data}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`El análisis no se pudo generar (${response.stop_reason})`);

  const db = await getDb();
  await db.insert(analyses).values({
    kind: "weekly", periodFrom: from, periodTo: to, inputHash, output: response.parsed_output, model: ASSISTANT_MODEL, usage: response.usage,
  });
  return response.parsed_output;
}
