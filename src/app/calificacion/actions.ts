"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { addChange, ChangeSchema, deleteChange } from "@/lib/changes/store";
import { todayIso } from "@/lib/dates";
import { parseChangeBlock } from "@/lib/changes/paste";

export interface ChangeState { ok?: string; error?: string }

export async function addChangeAction(_: ChangeState, fd: FormData): Promise<ChangeState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Inicia sesión para registrar cambios." };
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const parsed = ChangeSchema.safeParse({
    date: s("date") || todayIso(), kind: s("kind") || "propio", area: s("area") || "general",
    title: s("title"), detail: s("detail") || null, url: s("url") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues.slice(0, 2).map((i) => i.message).join(" · ") };
  await addChange(parsed.data, viewer.email ?? null);
  revalidatePath("/calificacion");
  return { ok: "Cambio registrado. Aparece en la gráfica." };
}

export async function deleteChangeAction(fd: FormData): Promise<void> {
  if (!(await getViewer())) return;
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteChange(id);
  revalidatePath("/calificacion");
}

/** Pega el bloque «panel-cambios» que devolvió la IA: registra todos los cambios de una vez. */
export async function pasteChangesAction(_: ChangeState, fd: FormData): Promise<ChangeState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Inicia sesión para registrar cambios." };
  const text = String(fd.get("block") ?? "").slice(0, 20_000);
  const { changes, problems } = parseChangeBlock(text, todayIso());
  if (!changes.length) return { error: problems[0] ?? "No encontré cambios. Pega el bloque que empieza con ```panel-cambios." };
  for (const c of changes) await addChange(c, `pegado · ${viewer.email ?? "?"}`);
  revalidatePath("/calificacion");
  const note = problems.length ? ` (${problems.length} con avisos: ${problems.slice(0, 2).join("; ")})` : "";
  return { ok: `${changes.length} ${changes.length === 1 ? "cambio registrado" : "cambios registrados"}${note}.` };
}
