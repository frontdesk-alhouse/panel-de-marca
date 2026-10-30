import { z } from "zod";
import { AI_ASSISTANTS } from "@/db/schema";

/**
 * Corridas de citación en el formato del skill seo-geo (Markdown con frontmatter YAML).
 * Se lee solo el subconjunto de YAML que usa la plantilla: `clave: valor`, listas
 * `[a, b]` en línea y listas con guiones.
 */
export const RunSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assistant: z.enum(AI_ASSISTANTS),
  queryId: z.string().min(1).max(40),
  query: z.string().min(1).max(500),
  run: z.number().int().min(1).max(50),
  searched: z.boolean(),
  appears: z.boolean(),
  position: z.number().int().min(1).max(50).nullable(),
  citedUrls: z.array(z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)")).max(50),
  wrongFact: z.string().max(500).nullable(),
  notes: z.string().max(1000).nullable(),
});
export type CitationRun = z.infer<typeof RunSchema>;

type Scalar = string | number | boolean | null;

function scalar(raw: string): Scalar {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(md: string): Record<string, Scalar | Scalar[]> {
  const m = md.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error("Sin frontmatter (--- … ---)");
  const out: Record<string, Scalar | Scalar[]> = {};
  let listKey: string | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { (out[listKey] as Scalar[]).push(scalar(item[1])); continue; }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    listKey = null;
    if (value.trim() === "") { out[key] = []; listKey = key; continue; }
    const inline = value.trim().match(/^\[(.*)\]$/);
    out[key] = inline ? (inline[1].trim() ? inline[1].split(",").map(scalar) : []) : scalar(value);
  }
  return out;
}

/** Texto de la consulta: la sección «## Consulta» del cuerpo, si existe. */
function queryText(md: string): string | null {
  const m = md.match(/##\s*Consulta\s*\r?\n+([^\n#][^\n]*)/i);
  return m ? m[1].trim() : null;
}

export function parseRun(md: string): CitationRun {
  const f = parseFrontmatter(md);
  const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const appears = f.aparece === true;
  return RunSchema.parse({
    date: str(f.fecha),
    assistant: str(f.asistente)?.toLowerCase(),
    queryId: str(f.consulta),
    query: queryText(md) ?? str(f.consulta),
    run: typeof f.corrida === "number" ? f.corrida : 1,
    searched: f.busco === true,
    appears,
    position: appears && typeof f.posicion === "number" ? f.posicion : null,
    citedUrls: Array.isArray(f.urls_citadas) ? f.urls_citadas.filter((u): u is string => typeof u === "string") : [],
    wrongFact: str(f.cifra_pegada),
    notes: str(f.notas),
  });
}

export interface AssistantIndex {
  assistant: string;
  k: number;
  n: number;
  firstPlace: number;
  searched: number;
}

/** k/n por asistente (y total con «all»): en cuántas corridas aparece la marca. */
export function citationIndex(runs: readonly Pick<CitationRun, "assistant" | "appears" | "position" | "searched">[]): AssistantIndex[] {
  const by = new Map<string, AssistantIndex>();
  const bump = (key: string, r: (typeof runs)[number]) => {
    const cur = by.get(key) ?? { assistant: key, k: 0, n: 0, firstPlace: 0, searched: 0 };
    by.set(key, { ...cur, n: cur.n + 1, k: cur.k + (r.appears ? 1 : 0), firstPlace: cur.firstPlace + (r.position === 1 ? 1 : 0), searched: cur.searched + (r.searched ? 1 : 0) });
  };
  for (const r of runs) { bump(r.assistant, r); bump("all", r); }
  return [...by.values()].sort((a, b) => (a.assistant === "all" ? -1 : b.assistant === "all" ? 1 : b.n - a.n));
}

/** Dominios más citados en las respuestas (quién se lleva la cita cuando no eres tú). */
export function citedDomains(runs: readonly { citedUrls: readonly string[] }[], limit = 10): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of runs) for (const u of new Set(r.citedUrls.map((x) => { try { return new URL(x).hostname.replace(/^www\./, ""); } catch { return null; } }))) {
    if (u) counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  return [...counts.entries()].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
