import { ws } from "@/lib/workspace/store";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { compact, period, readSection, SECTION_KEYS } from "./data";
import { latestAnalysis } from "./weekly";
import { latestStrategy } from "./strategy";

/** Herramientas de solo lectura del analista; las descripciones nombran a la marca configurada. */
export function assistantTools(name = ws().brand.name) {
  return [
  betaZodTool({
    name: "leer_seccion",
    description: `Lee los datos actuales de una sección del panel de ${name} (KPIs, tablas y hallazgos ya calculados). Úsala antes de afirmar cualquier cifra. Secciones: resumen (lo más importante de todo), trafico, seo, ideas (temas de blog, Reddit, competencia), google_ads, comportamiento (Clarity: scroll, frustración), sitio (embudo y contactos), competencia (fuerza SEO, Google, Instagram de cada estudio), social (Instagram y Meta Ads), crm (pipeline agregado), negocio (métricas de negocio: win rate, costo por lead calificado, CAC, ROAS, ticket promedio, ciclo de venta, pipeline ponderado, ingreso recurrente, contra sus metas), calificacion (calificación general con dimensiones), visibilidad_ia (si los asistentes de IA pueden leer el sitio y si mencionan a la marca), cambios (bitácora de cambios propios y externos y la calificación día a día).`,
    inputSchema: z.object({
      seccion: z.enum(SECTION_KEYS),
      periodo: period,
    }),
    run: async ({ seccion, periodo }) => readSection(seccion, periodo),
  }),
  betaZodTool({
    name: "ultimo_analisis_semanal",
    description: "Devuelve el análisis semanal más reciente (qué cambió, riesgos y acciones recomendadas) y el anterior, para ver la evolución y qué se aprendió.",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(compact(await latestAnalysis(2))),
  }),
  betaZodTool({
    name: "plan_de_medios",
    description: `Devuelve el plan de medios vigente de ${name} (embudo de reconocimiento a leads, canales, presupuesto, plan de 90 días, KPIs y reglas). Úsalo para preguntas de estrategia de ads, mix de medios o presupuesto.`,
    inputSchema: z.object({}),
    run: async () => { const s = await latestStrategy(); return s ? JSON.stringify(compact(s)) : "Aún no hay plan de medios; se genera en la sección Estrategia."; },
  }),
];
}
