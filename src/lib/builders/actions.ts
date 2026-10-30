"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace/load";
import { ws } from "@/lib/workspace/store";
import { BUILDER_IDS, type BuilderId } from "./catalog";

/** Guarda en qué está montado el sitio: los textos para la IA usan ese constructor. */
export async function setSiteBuilder(id: string): Promise<{ ok: boolean }> {
  if (!(await getViewer())) return { ok: false };
  if (!(BUILDER_IDS as readonly string[]).includes(id)) return { ok: false };
  try {
    if (!(await loadWorkspace())) return { ok: false };
    const current = ws();
    await saveWorkspace({ ...current, brand: { ...current.brand, builder: id as BuilderId } });
  } catch (e) {
    console.error("[builders] no se pudo guardar la plataforma", e);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
