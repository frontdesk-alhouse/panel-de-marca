import { timingSafeEqual } from "node:crypto";
import { getViewer } from "@/auth";
import { loadWorkspace } from "@/lib/workspace/load";
import { isLocalMode } from "@/lib/mode";
import { localRequestProblem, requestInfo } from "@/lib/local/guard";

/**
 * Vercel Cron manda `Authorization: Bearer $CRON_SECRET` si la variable se
 * llama exactamente así. Comparación de tiempo constante.
 */
export function hasValidCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAuthorized(req: Request): Promise<boolean> {
  // Local: el proxy ya filtra, pero cada API lo vuelve a revisar por si cambia el matcher.
  if (isLocalMode()) return localRequestProblem(requestInfo(req)) === null && Boolean(await getViewer());
  return hasValidCronSecret(req) || Boolean(await getViewer());
}

/** Solo una persona con sesión (no el cron). En local, además, solo desde esta computadora. */
export async function isViewerRequest(req: Request): Promise<boolean> {
  if (isLocalMode() && localRequestProblem(requestInfo(req)) !== null) return false;
  return Boolean(await getViewer());
}

export function unauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

/**
 * Refresca la configuración de la marca antes de atender una API. Sin configuración
 * responde 503 con un mensaje claro (nunca trabaja con una marca vacía).
 */
export async function requireWorkspace(): Promise<Response | null> {
  try {
    if (await loadWorkspace()) return null;
  } catch (err) {
    console.error("[workspace]", err);
    return Response.json({ error: "No se pudo leer la configuración de la marca" }, { status: 503 });
  }
  return Response.json({ error: "Falta la configuración de la marca" }, { status: 503 });
}
