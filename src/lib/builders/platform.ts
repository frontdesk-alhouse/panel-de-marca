import "server-only";
import { unstable_cache } from "next/cache";
import { latestGeoReport } from "@/lib/geo/store";
import { detectSitePlatform } from "@/lib/geo/check";
import { ws } from "@/lib/workspace/store";

/** Lectura directa de la portada, guardada un día por dominio (no se repite en cada visita). */
const detectCached = unstable_cache(async (domain: string) => detectSitePlatform(domain), ["site-platform"], { revalidate: 86_400 });

/**
 * En qué está hecho el sitio de la marca: lo que eligió la persona; si no eligió, el último
 * chequeo diario de visibilidad en IA; si aún no hay chequeo, una lectura de la portada.
 */
export async function sitePlatform(): Promise<string | null> {
  try {
    const chosen = ws().brand.builder;
    if (chosen) return chosen; // lo que eligió la persona manda
  } catch { /* sin configuración de marca todavía */ }
  const fromCheck = (await latestGeoReport().catch(() => null))?.report.platform;
  if (fromCheck) return fromCheck;
  let domain = "";
  try { domain = ws().brand.domain; } catch { return null; } // sin configuración de marca todavía
  if (!domain) return null;
  return detectCached(domain).catch(() => null);
}

/** Lo detectado (sin contar la elección): para decir «lo detectamos como X» junto a los íconos. */
export async function detectedPlatform(): Promise<string | null> {
  const fromCheck = (await latestGeoReport().catch(() => null))?.report.platform;
  if (fromCheck) return fromCheck;
  let domain = "";
  try { domain = ws().brand.domain; } catch { return null; }
  return domain ? detectCached(domain).catch(() => null) : null;
}

/** Para el selector: lo que eligió la persona y lo que detectamos. */
export async function builderChoice(): Promise<{ chosen: string | null; detected: string | null }> {
  let chosen: string | null = null;
  try { chosen = ws().brand.builder ?? null; } catch { /* sin configuración */ }
  return { chosen, detected: await detectedPlatform().catch(() => null) };
}
