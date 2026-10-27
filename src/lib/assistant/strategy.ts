import { languageNote } from "./context";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { todayIso } from "@/lib/dates";
import { assistantSystem } from "./context";
import type { Workspace } from "@/lib/workspace/schema";
import { ws } from "@/lib/workspace/store";
import { readSection } from "./data";
import { ASSISTANT_MODEL, latestAnalysis } from "./weekly";

/** Límites de palabras en cada campo: el panel muestra frases, no párrafos. */
const Channel = z.object({
  canal: z.string().describe("Nombre corto del canal, máximo 4 palabras. Ej. Google Search, Meta: mensajes a WhatsApp, Instagram orgánico, Blog y SEO, Google Maps, LinkedIn, Referidos"),
  rol: z.string().describe("Máximo 15 palabras"),
  formatos: z.array(z.string()).describe("Hasta 4, cada uno de máximo 4 palabras"),
  presupuestoMensualMxn: z.number().describe("0 si es orgánico"),
  kpi: z.string().describe("Máximo 6 palabras"),
  meta90Dias: z.string().describe("Cifra corta, máximo 10 palabras"),
});

export const StrategySchema = z.object({
  titular: z.string().describe("La apuesta central, máximo 20 palabras"),
  diagnostico: z.array(z.string()).describe("4 a 6 puntos de máximo 18 palabras, cada uno con una cifra del panel"),
  objetivo90Dias: z.string().describe("Una frase de máximo 25 palabras"),
  metas90: z.array(z.object({ indicador: z.string().describe("Máximo 4 palabras"), valor: z.string().describe("Cifra corta, ej. 5-8 al mes, ≤ $600, 5 reseñas") })).describe("3 a 5 metas clave del día 90"),
  posicionamiento: z.object({
    mensajeCentral: z.string().describe("Máximo 30 palabras"),
    publicos: z.array(z.string()).describe("2 a 4, máximo 8 palabras cada uno"),
    pruebas: z.array(z.string()).describe("2 a 4 pruebas (casos, cifras, procesos), máximo 12 palabras cada una"),
  }),
  embudo: z.array(z.object({
    etapa: z.enum(["reconocimiento", "consideracion", "conversion", "relacion"]),
    objetivo: z.string().describe("Máximo 15 palabras"), publico: z.string().describe("Máximo 12 palabras"),
    mensajes: z.array(z.string()).describe("Hasta 3, máximo 12 palabras cada uno"), canales: z.array(Channel).describe("2 a 4 canales"),
  })).describe("Las 4 etapas, de reconocimiento a leads y relación"),
  presupuesto: z.object({
    totalMensualMxn: z.number(),
    reparto: z.array(z.object({ canal: z.string().describe("Máximo 4 palabras"), mxn: z.number(), porQue: z.string().describe("Máximo 20 palabras") })),
    nota: z.string().describe("Supuestos y cuándo escalar, máximo 40 palabras"),
  }),
  plan90Dias: z.array(z.object({ fase: z.string().describe("Ej. Días 1-30"), foco: z.string().describe("Máximo 12 palabras"), acciones: z.array(z.string()).describe("3 a 6, máximo 14 palabras cada una") })),
  medicion: z.object({
    kpis: z.array(z.object({ kpi: z.string().describe("Máximo 6 palabras"), etapa: z.string(), meta: z.string().describe("Máximo 8 palabras"), fuente: z.string().describe("Máximo 4 palabras") })),
    huecos: z.array(z.string()).describe("Máximo 15 palabras cada uno"),
  }),
  reglas: z.array(z.object({ situacion: z.string().describe("Máximo 12 palabras"), decision: z.string().describe("Máximo 14 palabras") })).describe("4 a 6 reglas"),
  experimentos: z.array(z.object({ hipotesis: z.string().describe("Máximo 14 palabras"), prueba: z.string().describe("Máximo 16 palabras"), criterioDeExito: z.string().describe("Máximo 10 palabras") })).describe("2 a 4"),
  dejarDeHacer: z.array(z.string()).describe("3 a 6, máximo 14 palabras cada uno"),
});
export type Strategy = z.infer<typeof StrategySchema>;
/** Lectura de estrategias guardadas antes de que existiera metas90 (no se usa para generar: un opcional agranda la gramática). */
const StoredStrategySchema = StrategySchema.extend({ metas90: StrategySchema.shape.metas90.default([]) });

export async function latestStrategy() {
  const db = await getDb();
  const [row] = await db.select().from(analyses).where(eq(analyses.kind, "strategy")).orderBy(desc(analyses.createdAt)).limit(1);
  if (!row) return null;
  // Estrategias guardadas antes de un cambio de esquema: se completan con los valores por defecto.
  const parsed = StoredStrategySchema.safeParse(row.output);
  return { creado: row.createdAt, strategy: parsed.success ? parsed.data : (row.output as Strategy), input: row.inputHash };
}

/** El esquema completo excede el límite de gramática de salida estricta: va como JSON Schema en el prompt y se valida con zod. */
const JSON_INSTRUCTIONS = `Responde SOLO con un objeto JSON válido (sin texto alrededor ni bloques de código) que cumpla este JSON Schema; respeta los máximos de palabras de cada descripción:\n${JSON.stringify(z.toJSONSchema(StrategySchema))}`;
const MAX_ATTEMPTS = 2;

function extractJson(text: string): unknown {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("La respuesta no trae JSON");
  return JSON.parse(text.slice(start, end + 1));
}

async function generateStrategy(prompt: string) {
  const client = new Anthropic();
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const retry = lastError ? `\n\nEl intento anterior no cumplió el formato (${lastError}). Corrígelo.` : "";
    // Respuesta larga: con streaming el SDK no corta por tiempo.
    const stream = client.messages.stream({
      model: ASSISTANT_MODEL,
      max_tokens: 32000,
      system: [{ type: "text", text: assistantSystem(), cache_control: { type: "ephemeral" } }],
      output_config: { effort: "high" },
      messages: [{ role: "user", content: `${prompt}\n\n${JSON_INSTRUCTIONS}${retry}` }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") throw new Error(`La estrategia no se pudo generar (${message.stop_reason})`);
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    try {
      const parsed = StrategySchema.safeParse(extractJson(text));
      if (parsed.success) return { parsed_output: parsed.data, usage: message.usage };
      lastError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "JSON inválido";
    }
    console.error(`[strategy] intento ${attempt} inválido: ${lastError}`);
  }
  throw new Error("La estrategia no cumplió el formato esperado");
}

export interface StrategyInput { budgetMxn?: number | null; notes?: string | null }

/** Texto del pedido de estrategia (puro: se prueba contra la versión fija). */
export function buildStrategyPrompt(w: Workspace, input: StrategyInput, data90: readonly (readonly [string, string])[], weeklyJson: string | null): string {
  const budget = input.budgetMxn ? `Presupuesto mensual disponible para medios: $${input.budgetMxn.toLocaleString(w.locale.locale)} ${w.locale.currency}.` : "No hay presupuesto definido: propón uno mínimo viable y uno de crecimiento, y usa el mínimo en el reparto.";
  const notes = input.notes?.trim() ? `Prioridades de ${w.brand.owner}: ${input.notes.trim().slice(0, 1500)}` : "";

  const prompt = `Diseña el plan de medios de ${w.brand.name} para los próximos 90 días: desde que la marca empiece a ser reconocida en su nicho hasta generar leads calificados, con el mix de canales pagados, orgánicos y de relación.

Reglas:
- Parte de los datos reales del panel (abajo) y del contexto de la marca. Cita cifras.
- Mezcla canales por etapa del embudo; cada canal con un rol claro, formatos concretos, presupuesto y una meta medible.
- Sé realista para ${w.assistant.marketContext}: pocas cosas bien hechas antes que todos los canales.
- Respeta lo que ya funciona y di qué dejar de hacer.
- Escribe frases cortas y concretas: respeta el máximo de palabras de cada campo. Nada de párrafos.
- Incluye reglas de decisión (cuándo escalar, pausar o esperar el aprendizaje de los algoritmos) y experimentos con criterio de éxito.
- ${budget}
${notes}

# Contexto de ${w.brand.name}
${w.assistant.brief}

# Datos del panel
${data90.map(([s, v]) => `## ${s}\n${v}`).join("\n\n")}

# Último análisis semanal
${weeklyJson ?? "Aún no hay."}`;

  return `${prompt}${languageNote(w)}`;
}

/** Plan de medios de punta a punta con los datos del panel y el contexto de la marca. */
export async function runStrategy(input: StrategyInput) {
  const sections = ["resumen", "google_ads", "social", "seo", "competencia", "comportamiento", "ideas", "crm", "negocio", "calificacion"] as const;
  const data90 = await Promise.all(sections.map(async (s) => [s, await readSection(s, s === "resumen" || s === "google_ads" || s === "social" ? "90" : "28")] as const));
  const weekly = await latestAnalysis(1);
  const prompt = buildStrategyPrompt(ws(), input, data90, weekly.length ? JSON.stringify(weekly[0].analisis) : null);

  const response = await generateStrategy(prompt);

  const db = await getDb();
  const today = todayIso();
  await db.insert(analyses).values({
    kind: "strategy", periodFrom: today, periodTo: today,
    inputHash: createHash("sha256").update(prompt).digest("hex").slice(0, 32),
    output: response.parsed_output, model: ASSISTANT_MODEL, usage: { ...response.usage, budgetMxn: input.budgetMxn ?? null, notes: input.notes ?? null },
  });
  return response.parsed_output;
}
