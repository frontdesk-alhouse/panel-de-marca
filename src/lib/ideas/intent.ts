import type { IDEA_INTENTS } from "@/db/schema";
import { localIntentPattern } from "@/lib/workspace/patterns";

export type Intent = (typeof IDEA_INTENTS)[number];

/** "city" = las ciudades de la marca (configuración), no una lista fija. */
const RULES: [Intent, RegExp | "city"][] = [
  ["ia", /\b(ai|ia|chatgpt|gpt|claude|gemini|midjourney|inteligencia artificial|artificial intelligence|llm|ai overviews?|ai[- ]generated|automat)/i],
  ["quejas", /\b(problema|problemas|malo|mala|estafa|fraude|queja|no funciona|error|scam|bad|terrible|worst|ghost|refund|fired|regret|issue|frustrat|hate|nightmare)/i],
  ["precio", /\b(cu[aá]nto cuesta|precio|precios|costo|cobra|tarifa|presupuesto|cost|price|pricing|charge|budget|how much|worth it|vale la pena)/i],
  ["comparativa", /\b(vs|versus|mejor|mejores|diferencia|comparar|best|top|alternativ|or hire|freelancer or)/i],
  ["local", "city"],
  ["dudas", /\b(qu[eé] es|c[oó]mo|para qu[eé]|por qu[eé]|cu[aá]ndo|necesito|sirve|what is|how to|how do|should i|do i need|why|tips|advice)/i],
];

/** Intención de una búsqueda o conversación por palabras clave (español e inglés). */
export function classifyIntent(text: string, local: RegExp = localIntentPattern()): Intent {
  for (const [intent, re] of RULES) if ((re === "city" ? local : re).test(text)) return intent;
  return "general";
}

export const INTENT_LABELS: Record<Intent, string> = {
  precio: "Precio",
  dudas: "Dudas",
  comparativa: "Comparativa",
  quejas: "Quejas e inconformidades",
  local: "Local",
  ia: "IA",
  general: "General",
};
