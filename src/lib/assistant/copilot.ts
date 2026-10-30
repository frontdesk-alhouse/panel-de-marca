import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { AI_ASSISTANTS, CHANGE_AREAS, CHANGE_KINDS, copilotActions } from "@/db/schema";
import { competitors, ws } from "@/lib/workspace/store";
import { saveWorkspace } from "@/lib/workspace/load";
import { addChange } from "@/lib/changes/store";
import { saveCitations } from "@/lib/geo/store";
import { RunSchema } from "@/lib/geo/runs";
import { defaultRange, ranOkToday, runSync } from "@/lib/sync";
import { getSource } from "@/sources/registry";
import { JOBS } from "@/lib/local/schedule";
import { COMPETITION_SOURCES, ONCE_A_DAY_SOURCES } from "@/lib/sync-plan";
import { todayIso } from "@/lib/dates";

/**
 * Copiloto: el chat puede PROPONER cambios al panel, nunca aplicarlos. Cada herramienta
 * valida y describe el cambio, lo guarda como propuesta pendiente y la pantalla muestra un
 * botón «Aplicar». Solo ese botón (POST /api/copilot/apply, con sesión) lo ejecuta. Así,
 * un texto malicioso en datos que el modelo lee (sitios de la competencia, Reddit, URLs
 * citadas) no puede cambiar nada sin que una persona lo apruebe.
 * Todo es reversible: cambios y corridas se borran; la competencia se desactiva (conserva historial).
 */
export interface Proposal { id: number; summary: string }
export interface CopilotContext {
  viewer: string;
  /** Avisa a la pantalla que hay una propuesta para aprobar. */
  onProposal: (p: Proposal) => void;
}

/** Una propuesta caduca: aprobar algo de hace horas ya no refleja lo que la persona vio. */
export const PROPOSAL_TTL_MS = 30 * 60_000;

const normDomain = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
const stripSelf = <T extends { self?: boolean }>(c: T): Omit<T, "self"> => { const { self: _omit, ...rest } = c; void _omit; return rest; };
const httpUrl = z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)");

/** Fuentes que el chat puede sincronizar: las propias configuradas (la competencia gasta créditos). */
function ownSources(): string[] {
  return JOBS.filter((j) => j.kind === "sync" && !COMPETITION_SOURCES.has(j.id)).map((j) => j.id).filter((id) => getSource(id)?.isConfigured());
}
const SYNC_BUDGET_MS = 200_000;

/** `plan` valida y describe (o devuelve un error); `apply` ejecuta y devuelve el resultado. */
interface Action<S extends z.ZodTypeAny> {
  name: string;
  /** Si al aplicarse se anota solo en la bitácora (cambios de configuración, no lecturas). */
  log?: { area: (typeof CHANGE_AREAS)[number] };
  description: string;
  schema: S;
  plan: (i: z.infer<S>) => { summary: string } | { error: string };
  apply: (i: z.infer<S>, viewer: string) => Promise<string>;
}
const action = <S extends z.ZodTypeAny>(a: Action<S>) => a;

function listDiff(i: { lista: "busquedas_objetivo" | "servicios"; agregar: string[]; quitar: string[] }) {
  const key = i.lista === "servicios" ? ("services" as const) : ("targetQueries" as const);
  const current = ws()[key];
  const lower = (s: string) => s.trim().toLowerCase();
  const removeSet = new Set(i.quitar.map(lower));
  const removing = current.filter((c) => removeSet.has(lower(c)));
  const adding = [...new Set(i.agregar.map((s) => s.trim()))].filter((s) => !current.some((c) => lower(c) === lower(s)));
  return { key, adding, removing, next: [...current.filter((c) => !removeSet.has(lower(c))), ...adding] };
}

interface RunArgs { consulta: string; idConsulta?: string; asistente: string; corrida: number; fecha?: string; menciona: boolean; lugar: number | null; buscoEnWeb: boolean; urlsCitadas: string[]; datoErroneo: string | null }
function toRun(i: RunArgs) {
  return RunSchema.safeParse({
    date: i.fecha ?? todayIso(), assistant: i.asistente, queryId: i.idConsulta ?? i.consulta.slice(0, 40), query: i.consulta, run: i.corrida,
    searched: i.buscoEnWeb, appears: i.menciona, position: i.menciona ? i.lugar : null, citedUrls: i.urlsCitadas, wrongFact: i.datoErroneo, notes: null,
  });
}

const ACTIONS = [
  action({
    name: "registrar_cambio",
    description: "Propone registrar en la bitácora un cambio que hizo la marca (propio) o algo externo que pudo mover los números (actualización de Google, campaña de un competidor). Aparece en la gráfica de la calificación.",
    schema: z.object({
      titulo: z.string().min(3).max(200), detalle: z.string().max(2000).optional(), url: httpUrl.optional(),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("AAAA-MM-DD; por defecto hoy"),
      origen: z.enum(CHANGE_KINDS).default("propio"), area: z.enum(CHANGE_AREAS).default("general"),
    }),
    plan: (i) => ({ summary: `Registrar en la bitácora: «${i.titulo}» (${i.origen}, ${i.area}, ${i.fecha ?? todayIso()})` }),
    apply: async (i, viewer) => {
      const row = await addChange({ date: i.fecha ?? todayIso(), kind: i.origen, area: i.area, title: i.titulo, detail: i.detalle ?? null, url: i.url ?? null }, `chat · ${viewer}`);
      return `Cambio #${row.id} registrado. Se borra en Calificación → Bitácora de cambios.`;
    },
  }),
  action({
    name: "agregar_competidor",
    log: { area: "general" },
    description: "Propone agregar un competidor a la lista que el panel mide (sitio, Google, Maps, Instagram).",
    schema: z.object({
      nombre: z.string().min(1).max(120), dominio: z.string().min(3).max(200).describe("Dominio sin https://, p. ej. estudio.com"),
      ciudad: z.string().max(120).optional(), instagram: z.string().max(60).optional().describe("Usuario sin @"),
    }),
    plan: (i) => {
      const domain = normDomain(i.dominio);
      if (competitors().some((c) => !c.self && c.domain === domain)) return { error: `${domain} ya está en la competencia.` };
      return { summary: `Agregar a la competencia: ${i.nombre} (${domain}, ${i.ciudad ?? ws().brand.city}${i.instagram ? `, @${i.instagram.replace(/^@/, "")}` : ""})` };
    },
    apply: async (i) => {
      const domain = normDomain(i.dominio);
      const list = competitors().filter((c) => !c.self);
      if (list.some((c) => c.domain === domain)) return `${domain} ya estaba en la competencia.`;
      const city = i.ciudad ?? ws().brand.city;
      await saveWorkspace(ws(), [...list.map(stripSelf), { name: i.nombre, domain, city, mapsQuery: `${i.nombre} ${city}`, instagram: i.instagram?.replace(/^@/, "") }]);
      return `${i.nombre} agregado. Sus datos aparecen tras sincronizar la competencia.`;
    },
  }),
  action({
    name: "quitar_competidor",
    log: { area: "general" },
    description: "Propone dejar de medir a un competidor (su historial se conserva).",
    schema: z.object({ dominio: z.string().min(3).max(200) }),
    plan: (i) => {
      const domain = normDomain(i.dominio);
      const found = competitors().find((c) => !c.self && c.domain === domain);
      if (!found) return { error: `${domain} no está en la competencia. Actuales: ${competitors().filter((c) => !c.self).map((c) => c.domain).join(", ") || "ninguno"}.` };
      return { summary: `Dejar de medir a ${found.name} (${domain})` };
    },
    apply: async (i) => {
      const domain = normDomain(i.dominio);
      const list = competitors().filter((c) => !c.self);
      await saveWorkspace(ws(), list.filter((c) => c.domain !== domain).map(stripSelf));
      return `Listo: ya no se mide ${domain}.`;
    },
  }),
  action({
    name: "editar_lista",
    log: { area: "visibilidad" },
    description: "Propone agregar o quitar elementos de «busquedas_objetivo» (búsquedas de Google donde la marca quiere aparecer) o «servicios» (lo que vende la marca).",
    schema: z.object({
      lista: z.enum(["busquedas_objetivo", "servicios"]),
      agregar: z.array(z.string().min(1).max(200)).max(20).default([]),
      quitar: z.array(z.string().min(1).max(200)).max(20).default([]),
    }),
    plan: (i) => {
      const { adding, removing } = listDiff(i);
      if (!adding.length && !removing.length) return { error: "No hay nada que cambiar: lo pedido ya está así." };
      const parts = [adding.length ? `agregar ${adding.join("; ")}` : "", removing.length ? `quitar ${removing.join("; ")}` : ""].filter(Boolean);
      return { summary: `${i.lista === "servicios" ? "Servicios" : "Búsquedas objetivo"}: ${parts.join(" y ")}` };
    },
    apply: async (i) => {
      const { key, next } = listDiff(i);
      await saveWorkspace({ ...ws(), [key]: next });
      return `Lista actualizada: ${next.join("; ")}.`;
    },
  }),
  action({
    name: "fijar_costo_por_lead_objetivo",
    log: { area: "inversion" },
    description: "Propone fijar el costo por lead objetivo (en la moneda de la marca) con el que se califican los anuncios. null = quitarlo.",
    schema: z.object({ monto: z.number().positive().max(1_000_000).nullable() }),
    plan: (i) => ({ summary: `${i.monto === null ? "Quitar el costo por lead objetivo" : `Costo por lead objetivo: ${i.monto} ${ws().locale.currency}`} (hoy: ${ws().targets.cpl ?? "sin objetivo"})` }),
    apply: async (i) => {
      const w = ws();
      await saveWorkspace({ ...w, targets: { ...w.targets, cpl: i.monto } });
      return "Objetivo actualizado; la calificación lo usa desde el próximo cálculo.";
    },
  }),
  action({
    name: "sincronizar",
    description: "Propone traer ahora los datos de fuentes propias del panel (no la competencia). PageSpeed tarda ~90 s.",
    schema: z.object({ fuentes: z.array(z.string().max(20)).max(12).default([]).describe("Ids de fuente; vacío = todas las propias") }),
    plan: (i) => {
      const available = ownSources();
      const wanted = i.fuentes.length ? i.fuentes.filter((f) => available.includes(f)) : available;
      if (!wanted.length) return { error: `No hay fuentes que sincronizar. Disponibles: ${available.join(", ") || "ninguna conectada"}.` };
      return { summary: `Sincronizar ahora: ${wanted.join(", ")}` };
    },
    apply: async (i) => {
      const available = ownSources();
      const wanted = i.fuentes.length ? i.fuentes.filter((f) => available.includes(f)) : available;
      const started = Date.now();
      const out: string[] = [];
      for (const id of wanted) {
        if (Date.now() - started > SYNC_BUDGET_MS) { out.push(`${id}: no alcanzó el tiempo`); continue; }
        // Misma regla que el botón: Clarity tiene cuota diaria.
        if (ONCE_A_DAY_SOURCES.has(id) && (await ranOkToday(id))) { out.push(`${id}: ya corrió hoy (cuota)`); continue; }
        const r = await runSync(id, defaultRange(), "manual");
        out.push(`${id}: ${r.status === "ok" ? `ok (${r.rows} filas)` : r.error ?? "error"}`);
      }
      return out.join(" · ");
    },
  }),
  action({
    name: "registrar_corrida_ia",
    description: "Propone registrar una corrida de citación en un asistente de IA (Visibilidad en IA): qué consulta, en qué asistente, si mencionó a la marca y en qué lugar.",
    schema: z.object({
      consulta: z.string().min(1).max(500), idConsulta: z.string().max(40).optional(), asistente: z.enum(AI_ASSISTANTS),
      corrida: z.number().int().min(1).max(50).default(1), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      menciona: z.boolean(), lugar: z.number().int().min(1).max(50).nullable().default(null), buscoEnWeb: z.boolean().default(false),
      urlsCitadas: z.array(httpUrl).max(50).default([]), datoErroneo: z.string().max(500).nullable().default(null),
    }),
    plan: (i) => {
      const r = toRun(i);
      if (!r.success) return { error: r.error.issues.map((x) => x.message).join("; ") };
      const d = r.data;
      return { summary: `Registrar corrida ${d.run} de «${d.query}» en ${d.assistant}: ${d.appears ? `te menciona${d.position ? ` en lugar ${d.position}` : ""}` : "no te menciona"}` };
    },
    apply: async (i) => {
      const r = toRun(i);
      if (!r.success) return "Datos inválidos.";
      await saveCitations([r.data]);
      return "Corrida registrada en Visibilidad en IA.";
    },
  }),
];

type AnyAction = Action<z.ZodTypeAny>;
const BY_NAME = new Map<string, AnyAction>(ACTIONS.map((a) => [a.name, a as unknown as AnyAction]));

export function copilotTools(ctx: CopilotContext) {
  return [...BY_NAME.values()].map((a) =>
    betaZodTool({
      name: a.name,
      description: `${a.description} No aplica nada: la persona verá un botón «Aplicar».`,
      inputSchema: a.schema as z.ZodObject<z.ZodRawShape>,
      run: async (input: unknown) => {
        const i = a.schema.parse(input);
        const plan = a.plan(i);
        if ("error" in plan) return plan.error;
        const db = await getDb();
        const [row] = await db.insert(copilotActions).values({ tool: a.name, args: i, summary: plan.summary, viewer: ctx.viewer }).returning({ id: copilotActions.id });
        ctx.onProposal({ id: row.id, summary: plan.summary });
        return `Propuesta #${row.id} mostrada a la persona con un botón «Aplicar»: ${plan.summary}. NO está aplicada. No repitas la llamada; dile en una línea qué hará y que toque «Aplicar» si está de acuerdo.`;
      },
    }),
  );
}

export type DecideResult = { ok: true; result: string } | { ok: false; error: string; status: number };

/** Aplica o descarta una propuesta pendiente. Solo lo llama el botón de la pantalla (con sesión). */
export async function decideProposal(id: number, decision: "apply" | "discard", viewer: string): Promise<DecideResult> {
  const db = await getDb();
  // Tomarla en una sola sentencia: dos clics no la aplican dos veces.
  const [row] = await db.update(copilotActions)
    .set({ status: decision === "apply" ? "applied" : "discarded", decidedAt: new Date() })
    .where(and(eq(copilotActions.id, id), eq(copilotActions.status, "pending"), gte(copilotActions.createdAt, new Date(Date.now() - PROPOSAL_TTL_MS))))
    .returning();
  if (!row) return { ok: false, error: "La propuesta ya se aplicó, se descartó o caducó (30 min). Pídela de nuevo en el chat.", status: 409 };
  if (decision === "discard") return { ok: true, result: "Descartada." };
  const a = BY_NAME.get(row.tool);
  const parsed = a?.schema.safeParse(row.args);
  if (!a || !parsed?.success) {
    await db.update(copilotActions).set({ status: "error", result: "Propuesta inválida" }).where(eq(copilotActions.id, id));
    return { ok: false, error: "La propuesta ya no es válida.", status: 422 };
  }
  try {
    const result = await a.apply(parsed.data, viewer);
    await db.update(copilotActions).set({ result }).where(eq(copilotActions.id, id));
    // Lo que el copiloto cambia en el panel queda en la bitácora, igual que un cambio hecho a mano.
    if (a.log) await addChange({ date: todayIso(), kind: "propio", area: a.log.area, title: `Panel: ${row.summary}`.slice(0, 200), detail: null, url: null }, `copiloto · ${viewer}`);
    return { ok: true, result };
  } catch (err) {
    console.error("[copiloto]", row.tool, err);
    await db.update(copilotActions).set({ status: "error", result: err instanceof Error ? err.message.slice(0, 500) : "error" }).where(eq(copilotActions.id, id));
    return { ok: false, error: "No se pudo aplicar. Revisa los datos o inténtalo desde Ajustes.", status: 500 };
  }
}

/** Etiqueta mientras el copiloto prepara una propuesta. */
export const COPILOT_LABELS: Record<string, string> = Object.fromEntries([...BY_NAME.keys()].map((n) => [n, "Preparando una propuesta"]));
