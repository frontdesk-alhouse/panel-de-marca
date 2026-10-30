/** Solo servidor: lee la configuración de la marca y los encabezados de la petición. */
import { getMessages, getLang } from "@/i18n/server";
import { requestOrigin } from "@/lib/http/origin";
import { ws } from "@/lib/workspace/store";
import { formatBands, formatMetric } from "@/lib/format";
import { todayIso } from "@/lib/dates";
import { getSkill, skillsForMetric, SKILL_IDS, type SkillId } from "@/lib/skills/catalog";
import type { DimensionId, MetricResult, Scorecard } from "@/lib/scorecard/types";
import type { Insight } from "@/lib/analytics/insights";
import type { Frente, StoredWeekly } from "@/lib/assistant/weekly";
import type { Strategy } from "@/lib/assistant/strategy";
import type { Evidence, HandoffInput, HandoffItem, HandoffLang, Impact } from "./build";
import { builderFor } from "@/lib/builders/catalog";
import { sitePlatform } from "@/lib/builders/platform";

/**
 * Adaptadores del panel a «Copiar para Claude». El servidor arma todas las acciones con
 * su evidencia y los skills sugeridos; la pantalla deja elegir cuáles copiar y arma el texto.
 */
export interface HandoffPayload {
  input: HandoffInput;
  lang: HandoffLang;
  /** Acciones marcadas de entrada: las de más impacto y con evidencia suficiente. */
  defaultItems: string[];
}

/** Más que esto abruma: se preseleccionan las primeras N y el resto queda a un clic. */
const MAX_DEFAULT = 5;

interface Base {
  origin: string;
  asOf: string;
  summary?: string;
  items: HandoffItem[];
  notes?: string[];
  skills: readonly SkillId[];
  defaultItems: string[];
}

async function finish(base: Base): Promise<HandoffPayload> {
  // En qué está hecho el sitio: así el texto dice cómo conectar la IA a su constructor.
  const [t, lang, panelUrl, platform] = await Promise.all([getMessages(), getLang(), requestOrigin(), sitePlatform().catch(() => null)]);
  const builder = builderFor(platform);
  const w = ws();
  const skills = [...new Set(base.skills)].filter((id) => getSkill(id)).map((id) => ({
    id,
    name: t.skills.items[id]?.name ?? id,
    short: t.skills.items[id]?.short,
    zipUrl: `${panelUrl}/api/skills/${id}/zip`,
    repoUrl: getSkill(id)?.repoUrl,
  }));
  return {
    lang,
    defaultItems: base.defaultItems,
    input: {
      origin: base.origin,
      brand: { name: w.brand.name, domain: w.brand.domain, city: w.brand.city, context: w.assistant.marketContext },
      asOf: base.asOf,
      summary: base.summary,
      items: base.items,
      notes: base.notes,
      skills,
      panelUrl,
      today: todayIso(),
      ...(builder ? { builder } : {}),
    },
  };
}

const BAND_IMPACT: Record<string, Impact> = { red: "alto", yellow: "medio", green: "bajo" };

/**
 * Cuánto puede sumar una métrica a la calificación general si pasa a verde: su dimensión
 * sube (100 − puntaje actual) / métricas calificadas, ponderado por el peso de la dimensión
 * entre las dimensiones que tienen calificación.
 */
export function pointsIfGreen(metric: MetricResult, scorecard: Scorecard): number {
  if (metric.status !== "scored" || metric.score === undefined) return 0;
  const dim = scorecard.dimensions.find((d) => d.definition.id === metric.definition.dimension);
  const scoredWeight = scorecard.dimensions.filter((d) => d.score !== null).reduce((a, d) => a + d.definition.weight, 0);
  if (!dim || !dim.scored || !scoredWeight) return 0;
  return Math.round(((dim.definition.weight * (100 - metric.score)) / dim.scored / scoredWeight) * 10) / 10;
}

/** Qué tan sólida es la referencia contra la que se calificó la métrica. */
export function metricEvidence(m: MetricResult, scorecard: Scorecard): Evidence {
  const d = m.definition;
  const points = pointsIfGreen(m, scorecard);
  if (m.sample !== undefined && d.minSample !== undefined && m.sample < d.minSample * 2) {
    return { confidence: "baja", basis: `muestra chica (${m.sample}; el mínimo es ${d.minSample}), puede ser ruido`, points };
  }
  if (!d.own) return { confidence: "alta", basis: `se compara con un benchmark de industria (${d.source})`, points };
  return { confidence: "media", basis: "se compara con un umbral propio que se ajusta con tu línea base", points };
}

/** Calificación completa o de una dimensión: lo que está en rojo o amarillo, con su palanca y evidencia. */
export async function handoffFromScorecard(scorecard: Scorecard, endDate: string, dimension?: DimensionId): Promise<HandoffPayload> {
  const metrics = scorecard.metrics.filter((m) => !dimension || m.definition.dimension === dimension);
  const weak = metrics.filter((m) => m.status === "scored" && m.band !== "green");
  const missing = metrics.filter((m) => m.status === "no_data" || m.status === "not_tracked");
  const dim = dimension ? scorecard.dimensions.find((d) => d.definition.id === dimension) : null;
  const overall = dim ? dim.score : scorecard.overall;
  const items: HandoffItem[] = weak.map((m) => ({
    id: m.definition.id,
    title: m.definition.lever,
    impact: BAND_IMPACT[m.band ?? "yellow"],
    metric: {
      label: m.definition.label,
      value: formatMetric(m.definition.unit, m.value),
      target: formatBands(m.definition),
      band: m.band,
      source: m.definition.source,
    },
    evidence: metricEvidence(m, scorecard),
  }));
  const defaults = [...items]
    .filter((i) => i.evidence?.confidence !== "baja")
    .sort((a, b) => (b.evidence?.points ?? 0) - (a.evidence?.points ?? 0))
    .slice(0, MAX_DEFAULT)
    .map((i) => i.id);
  return finish({
    origin: dim ? `Calificación · ${dim.definition.label}` : "Calificación",
    asOf: endDate,
    summary: `${dim ? dim.definition.question : "Calificación general"}: ${overall === null ? "sin datos suficientes" : `${Math.round(overall)} de 100`}. Cobertura: ${Math.round(scorecard.coverage * 100)} % de las métricas tienen datos.`,
    items,
    notes: missing.length ? [`Sin datos todavía (no cuentan en la calificación): ${missing.map((m) => m.definition.label).join(", ")}.`] : [],
    skills: weak.flatMap((m) => skillsForMetric(m.definition)),
    defaultItems: defaults,
  });
}

/** Sección del análisis semanal → skill (por palabras de la sección). */
export function skillsForSection(section: string): SkillId[] {
  const s = section.toLowerCase();
  const out: SkillId[] = [];
  if (/seo|búsqueda|busqueda|google search|ia|geo|contenido|ideas/.test(s)) out.push("seo-geo");
  if (/ads|anuncio|meta|paid|campañ|inversi|presupuesto/.test(s)) out.push("anuncios-eficiencia");
  if (/conversi|formulario|sitio|comportamiento|clarity|velocidad|lead|crm|tr[aá]fico/.test(s)) out.push("conversion-medicion");
  return out;
}

const CLAUDE_BASIS = "la propone el análisis de Claude con tus datos; revisa que tenga sentido para tu negocio";

/** Frente de trabajo → skill que le enseña a la IA cómo hacerlo. */
const FRENTE_SKILLS: Record<Frente, SkillId[]> = {
  seo: ["seo-geo"], geo: ["seo-geo"], contenido: ["seo-geo"], competencia: ["seo-geo"],
  anuncios: ["anuncios-eficiencia"],
  conversion: ["conversion-medicion"], medicion: ["conversion-medicion"], sitio: ["conversion-medicion"], crm: ["conversion-medicion"],
  redes: [], otro: [],
};

type WeeklyAction = StoredWeekly["acciones"][number];

function actionSkills(a: WeeklyAction): SkillId[] {
  return a.frente === "otro" ? skillsForSection(`${a.seccion} ${a.accion}`) : FRENTE_SKILLS[a.frente];
}

/** Una acción del análisis como tarea para la IA: qué vimos, qué hacer, pasos y cómo sabremos que funcionó. */
function actionItem(a: WeeklyAction, id: string): HandoffItem {
  const lines = [
    a.hallazgo && `Lo que vimos: ${a.hallazgo}`,
    a.porQue && `Por qué importa: ${a.porQue}`,
    a.pasos.length ? `Pasos: ${a.pasos.map((p, i) => `(${i + 1}) ${p}`).join(" ")}` : "",
    a.exito && `Sabremos que funcionó si: ${a.exito}`,
  ].filter(Boolean);
  return { id, title: a.accion, impact: a.impacto, detail: lines.join("\n") || `${a.porQue} (sección: ${a.seccion})`, evidence: { confidence: "media", basis: CLAUDE_BASIS } };
}

export async function handoffFromWeekly(weekly: StoredWeekly, periodTo: string): Promise<HandoffPayload> {
  const items = weekly.acciones.map((a, i) => actionItem(a, `w${i}`));
  return finish({
    origin: "Análisis semanal",
    asOf: periodTo,
    summary: [weekly.foco && `En qué trabajamos esta semana: ${weekly.foco}`, weekly.titular, ...weekly.queCambio.map((c) => `- ${c}`)].filter(Boolean).join("\n"),
    items,
    notes: [...weekly.riesgos.map((r) => `Riesgo: ${r}`), ...weekly.esperar.map((e) => `Esperar: ${e}`)],
    skills: weekly.acciones.flatMap(actionSkills),
    defaultItems: items.filter((i) => i.impact === "alto").map((i) => i.id).slice(0, MAX_DEFAULT),
  });
}

/** Una sola acción del análisis, lista para pasarla a la IA con su skill. */
export async function handoffFromWeeklyAction(weekly: StoredWeekly, index: number, periodTo: string): Promise<HandoffPayload> {
  const a = weekly.acciones[index];
  const item = actionItem(a, `w${index}`);
  return finish({
    origin: `Análisis semanal · ${a.accion}`,
    asOf: periodTo,
    summary: weekly.foco ? `En qué trabajamos esta semana: ${weekly.foco}` : weekly.titular,
    items: [item],
    notes: weekly.esperar.map((e) => `No tocar todavía: ${e}`),
    skills: actionSkills(a),
    defaultItems: [item.id],
  });
}

export async function handoffFromStrategy(strategy: Strategy, createdAt: Date): Promise<HandoffPayload> {
  const first = strategy.plan90Dias[0];
  const items: HandoffItem[] = (first?.acciones ?? []).map((a, i) => ({
    id: `s${i}`, title: a, impact: i < 2 ? "alto" as const : "medio" as const, detail: first ? `${first.fase}: ${first.foco}` : undefined,
    evidence: { confidence: "media", basis: "sale del plan de medios que armó Claude con todo el panel" },
  }));
  return finish({
    origin: "Plan de medios",
    asOf: createdAt.toISOString().slice(0, 10),
    summary: [strategy.titular, `Objetivo a 90 días: ${strategy.objetivo90Dias}`, ...strategy.diagnostico.map((d) => `- ${d}`)].join("\n"),
    items,
    notes: [
      ...strategy.reglas.map((r) => `Si ${r.situacion}: ${r.decision}`),
      ...strategy.dejarDeHacer.map((d) => `Dejar de hacer: ${d}`),
      ...strategy.medicion.huecos.map((h) => `Hueco de medición: ${h}`),
    ],
    skills: [...SKILL_IDS],
    defaultItems: items.slice(0, 3).map((i) => i.id),
  });
}

/** Hallazgos de una sección (SEO, visibilidad en IA…): lo que está mal o hay que vigilar. */
export async function handoffFromInsights(origin: string, asOf: string, insights: readonly Insight[], skills: readonly SkillId[]): Promise<HandoffPayload> {
  const open = insights.filter((i) => i.tone !== "good");
  const items: HandoffItem[] = open.map((i, n) => ({
    id: `i${n}`, title: i.title, detail: i.detail,
    impact: i.weight === 3 || i.tone === "bad" ? "alto" : "medio",
    evidence: i.tone === "bad"
      ? { confidence: "alta", basis: "regla fija del panel aplicada a tus datos medidos" }
      : { confidence: "media", basis: "señal a vigilar: todavía no es un problema confirmado" },
  }));
  return finish({
    origin,
    asOf,
    items,
    notes: insights.filter((i) => i.tone === "good").map((i) => `Ya funciona (no romper): ${i.title}`),
    skills,
    defaultItems: items.filter((i) => i.evidence?.confidence === "alta").map((i) => i.id).slice(0, MAX_DEFAULT),
  });
}
