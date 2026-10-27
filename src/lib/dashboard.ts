import { getViewer } from "@/auth";
import { isDbConfigured } from "@/db";
import { loadScorecard, type LoadedScorecard } from "@/lib/scorecard/load";
import { loadWorkspace } from "@/lib/workspace/load";

export type DashboardState =
  | { kind: "no_session" }
  | { kind: "no_db" }
  | { kind: "error"; message: string }
  | { kind: "ok"; data: LoadedScorecard };

/** Carga para las páginas sin tumbarlas: sin base o con error devuelve un estado que la UI explica. */
export async function loadDashboardState(): Promise<DashboardState> {
  // Defensa en profundidad: no depender solo del proxy.
  if (!(await getViewer())) return { kind: "no_session" };
  if (!isDbConfigured()) return { kind: "no_db" };
  try {
    if (!(await loadWorkspace())) return { kind: "error", message: "Falta la configuración de la marca." };
    return { kind: "ok", data: await loadScorecard() };
  } catch (err) {
    console.error("[dashboard]", err);
    return { kind: "error", message: "No se pudo leer la base de datos. Revisa DATABASE_URL y que el esquema esté aplicado." };
  }
}
