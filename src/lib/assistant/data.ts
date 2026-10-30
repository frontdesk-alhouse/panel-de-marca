import { z } from "zod";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadOverview } from "@/lib/analytics/sections/overview";
import { loadTraffic } from "@/lib/analytics/sections/traffic";
import { loadSeo } from "@/lib/analytics/sections/seo";
import { loadIdeas } from "@/lib/analytics/sections/ideas";
import { loadGoogleAds } from "@/lib/analytics/sections/gads";
import { loadAds } from "@/lib/analytics/sections/ads";
import { loadBehavior } from "@/lib/analytics/sections/behavior";
import { loadSite } from "@/lib/analytics/sections/site";
import { loadCompetition, loadIgCompetition } from "@/lib/analytics/sections/competition";
import { loadCompetitorTrend } from "@/lib/analytics/sections/comptrend";
import { loadSocial } from "@/lib/analytics/sections/social";
import { loadScorecard } from "@/lib/scorecard/load";
import { listLeads } from "@/lib/crm/store";
import { summarize } from "@/lib/crm/summary";
import { loadBusiness } from "@/lib/analytics/sections/business";
import { todayIso } from "@/lib/dates";
import { loadGeoOverview } from "@/lib/geo/store";
import { listChanges, scoreHistory } from "@/lib/changes/store";

const MAX_LIST = 15;

/** JSON compacto para el modelo: listas recortadas, números redondeados, sin vacíos. */
export function compact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_LIST).map((v) => compact(v, depth + 1)).filter((v) => v !== undefined);
    return value.length > MAX_LIST ? [...items, `(+${value.length - MAX_LIST} más)`] : items;
  }
  if (typeof value === "object") {
    if (depth > 6) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v, depth + 1);
      if (c !== undefined && !(Array.isArray(c) && c.length === 0)) out[k] = c;
    }
    return out;
  }
  return value;
}

const toJson = (v: unknown) => JSON.stringify(compact(v));
export const period = z.enum(["7", "28", "90"]).default("28").describe("Días del periodo: 7, 28 o 90");

/** CRM solo en agregado: nunca nombres, correos, teléfonos ni notas personales. */
async function crmAggregate() {
  const leads = (await listLeads()).map((r) => r.lead);
  const by = (key: (l: (typeof leads)[number]) => string | null) => {
    const m: Record<string, { total: number; cerrados: number; perdidos: number }> = {};
    for (const l of leads) {
      const k = key(l) ?? "sin dato";
      m[k] ??= { total: 0, cerrados: 0, perdidos: 0 };
      m[k].total++;
      if (l.stage === "cerrado") m[k].cerrados++;
      if (l.stage === "perdido") m[k].perdidos++;
    }
    return m;
  };
  return {
    resumen: summarize(leads, todayIso()),
    porCanal: by((l) => l.channel), porIndustria: by((l) => l.industry), porTamano: by((l) => l.companySize),
    sinSiguientePaso: leads.filter((l) => !l.nextStep && l.stage !== "cerrado" && l.stage !== "perdido" && !l.doNotNurture).length,
    noNutrir: leads.filter((l) => l.doNotNurture).length,
  };
}

export const SECTIONS = {
  resumen: async (p: string) => { const o = await loadOverview(resolvePeriod(p)); return { kpis: o.kpis, enQueConcentrarte: o.focus, secciones: o.sections.map((s) => ({ seccion: s.title, hallazgos: s.insights.map((i) => i.title) })) }; },
  trafico: async (p: string) => loadTraffic(resolvePeriod(p)),
  seo: async (p: string) => loadSeo(resolvePeriod(p)),
  ideas: async (p: string) => loadIdeas(resolvePeriod(p)),
  google_ads: async (p: string) => ({ directo: await loadGoogleAds(resolvePeriod(p)), enElSitio: await loadAds(resolvePeriod(p)) }),
  comportamiento: async (p: string) => loadBehavior(resolvePeriod(p)),
  sitio: async (p: string) => loadSite(resolvePeriod(p)),
  competencia: async () => { const [c, t, ig] = await Promise.all([loadCompetition(), loadCompetitorTrend("mes"), loadIgCompetition()]); return { sitios: c.rows, instagram: ig.rows, fuerzaSeo: t.series.map((s) => ({ estudio: s.name, actual: s.current, inicioDelMes: s.start?.strength })), busquedas: t.queries.map((q) => ({ busqueda: q.query, posiciones: q.bySite })), hallazgos: [...c.insights, ...t.insights, ...ig.insights].map((i) => i.title) }; },
  social: async (p: string) => loadSocial(resolvePeriod(p)),
  crm: async () => crmAggregate(),
  // Métricas de negocio (win rate, CAC, ROAS, ticket, ciclo, pipeline): solo agregados, sin datos de personas.
  negocio: async () => { const b = await loadBusiness(); return { ventanaDias: b.windowDays, embudo: b.funnel, pipeline: b.pipeline, inversionAnunciosMxn: b.paidMxn, metricas: b.metrics }; },
  calificacion: async () => loadScorecard(),
  // Visibilidad en IA: chequeo técnico de GEO y bitácora de citación (sin textos completos de respuestas).
  visibilidad_ia: async () => { const g = await loadGeoOverview(); return { chequeo: g.latest && { fecha: g.latest.date, plataforma: g.latest.report.platform, chequeos: g.latest.report.checks.map((c) => ({ id: c.id, bien: c.ok, severidad: c.severity, detalle: c.detail })) }, indice: g.index, fuentesQueMasCitan: g.domains, datosErroneos: g.wrongFacts }; },
  // Bitácora de cambios y calificación diaria: para ver si una subida coincide con algo que se hizo.
  cambios: async () => { const [c, h] = await Promise.all([listChanges(180), scoreHistory(180)]); return { cambios: c.map(({ id, date, kind, area, title, detail }) => ({ id, fecha: date, origen: kind, area, titulo: title, detalle: detail })), calificacionSemanal: h.filter((_, i) => (h.length - 1 - i) % 7 === 0).slice(-15).map((x) => ({ fecha: x.date, general: x.overall })) }; },
} as const;


export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as [SectionKey, ...SectionKey[]];

/** Lee una sección como JSON compacto; si falla, un texto corto en vez de romper la conversación. */
export async function readSection(seccion: SectionKey, periodo: "7" | "28" | "90" = "28"): Promise<string> {
  try {
    return toJson(await SECTIONS[seccion](periodo));
  } catch (e) {
    console.error("[assistant] leer_seccion", seccion, e);
    return `No se pudo leer la sección ${seccion}.`;
  }
}
