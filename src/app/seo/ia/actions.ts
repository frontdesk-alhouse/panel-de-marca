"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { loadWorkspace } from "@/lib/workspace/load";
import { parseRun, RunSchema, type CitationRun } from "@/lib/geo/runs";
import { deleteCitation, saveCitations } from "@/lib/geo/store";
import { todayIso } from "@/lib/dates";

export interface RunsState { ok?: string; error?: string; problems?: string[] }

/** Tope por importación: una batería completa son ~10 consultas × 3 corridas × 4 asistentes. */
const MAX_FILES = 200;
const MAX_FILE_BYTES = 200_000;

/** null si puede seguir; si no, el mensaje para la pantalla. */
async function denied(): Promise<string | null> {
  if (!(await getViewer())) return "Inicia sesión para registrar corridas.";
  if (!(await loadWorkspace())) return "Falta la configuración de la marca.";
  return null;
}

function done(saved: number, problems: string[]): RunsState {
  revalidatePath("/seo/ia");
  revalidatePath("/calificacion");
  return { ok: saved ? `${saved} ${saved === 1 ? "corrida guardada" : "corridas guardadas"}.` : undefined, problems: problems.length ? problems : undefined };
}

/** Importa los .md de corrida del skill seo-geo (uno o muchos). */
export async function importRunsAction(_: RunsState, fd: FormData): Promise<RunsState> {
  const no = await denied();
  if (no) return { error: no };
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Elige uno o más archivos .md de corrida." };
  if (files.length > MAX_FILES) return { error: `Máximo ${MAX_FILES} archivos por vez.` };
  const runs: CitationRun[] = [];
  const problems: string[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) { problems.push(`${f.name}: archivo demasiado grande`); continue; }
    try {
      runs.push(parseRun(await f.text()));
    } catch (err) {
      problems.push(`${f.name}: ${err instanceof Error ? err.message.split("\n")[0].slice(0, 160) : "no se pudo leer"}`);
    }
  }
  const saved = await saveCitations(runs);
  return done(saved, problems);
}

/** Captura a mano de una corrida (sin archivo). */
export async function addRunAction(_: RunsState, fd: FormData): Promise<RunsState> {
  const no = await denied();
  if (no) return { error: no };
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const appears = fd.get("appears") === "on";
  const position = Number(s("position"));
  const parsed = RunSchema.safeParse({
    date: s("date") || todayIso(),
    assistant: s("assistant"),
    queryId: s("queryId") || s("query").slice(0, 40),
    query: s("query"),
    run: Number(s("run") || 1),
    searched: fd.get("searched") === "on",
    appears,
    position: appears && Number.isInteger(position) && position > 0 ? position : null,
    citedUrls: s("citedUrls").split(/\s+/).filter(Boolean),
    wrongFact: s("wrongFact") || null,
    notes: s("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "dato"}: ${i.message}`).join(" · ") };
  }
  return done(await saveCitations([parsed.data]), []);
}

export async function deleteRunAction(fd: FormData): Promise<void> {
  if (await denied()) return;
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteCitation(id);
  revalidatePath("/seo/ia");
  revalidatePath("/calificacion");
}
