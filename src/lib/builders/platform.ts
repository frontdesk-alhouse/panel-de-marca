import "server-only";
import { unstable_cache } from "next/cache";
import { latestGeoReport } from "@/lib/geo/store";
import { detectSitePlatform } from "@/lib/geo/check";
import { ws } from "@/lib/workspace/store";

/** Lectura directa de la portada, guardada un día por dominio (no se repite en cada visita). */
const detectCached = unstable_cache(async (domain: string) => detectSitePlatform(domain), ["site-platform"], { revalidate: 86_400 });

/**
 * En qué está hecho el sitio de la marca: primero el último chequeo diario de visibilidad en IA;
 * si aún no hay chequeo (configuración inicial), una lectura de la portada.
 */
export async function sitePlatform(): Promise<string | null> {
  const fromCheck = (await latestGeoReport().catch(() => null))?.report.platform;
  if (fromCheck) return fromCheck;
  let domain = "";
  try { domain = ws().brand.domain; } catch { return null; } // sin configuración de marca todavía
  if (!domain) return null;
  return detectCached(domain).catch(() => null);
}
