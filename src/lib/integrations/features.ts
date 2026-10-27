import { getSource } from "@/sources/registry";
import type { IntegrationId } from "./catalog";

/**
 * Qué conexión necesita cada sección. Una sección está disponible si al menos una
 * de sus fuentes tiene credenciales; si no, el modo local muestra «Conectar».
 * En la nube no se oculta nada (la instancia original sigue igual).
 */
export interface Feature {
  href: string;
  /** Fuentes que la alimentan (basta una). */
  sources: string[];
  /** Llave en lugar de fuente (chat, análisis, estrategia). */
  needsAnthropic?: boolean;
  /** Qué conectar para encenderla. */
  connect: IntegrationId;
  /** Se oculta del menú hasta conectarla (funciones avanzadas). */
  hideUntilConnected?: boolean;
}

export const FEATURES: readonly Feature[] = [
  { href: "/trafico", sources: ["ga4"], connect: "google" },
  { href: "/seo", sources: ["gsc"], connect: "google" },
  { href: "/anuncios", sources: ["gads"], connect: "gads", hideUntilConnected: true },
  { href: "/comportamiento", sources: ["clarity"], connect: "clarity" },
  { href: "/sitio", sources: ["psi", "ga4"], connect: "psi" },
  { href: "/competencia", sources: ["comp", "serp", "maps", "links"], connect: "psi" },
  { href: "/social/instagram", sources: ["instagram"], connect: "meta" },
  { href: "/social/paid", sources: ["meta"], connect: "meta" },
  { href: "/social/competencia", sources: ["igcomp"], connect: "apify" },
  { href: "/social", sources: ["meta", "instagram", "igcomp"], connect: "meta" },
  { href: "/estrategia", sources: [], needsAnthropic: true, connect: "anthropic" },
];

export const featureFor = (href: string): Feature | undefined => FEATURES.find((f) => f.href === href);

export function isFeatureAvailable(f: Feature): boolean {
  if (f.needsAnthropic) return Boolean(process.env.ANTHROPIC_API_KEY);
  return f.sources.some((id) => Boolean(getSource(id)?.isConfigured()));
}

/** Rutas a esconder del menú (solo las marcadas, y solo mientras no estén conectadas). */
export function hiddenNavHrefs(): string[] {
  return FEATURES.filter((f) => f.hideUntilConnected && !isFeatureAvailable(f)).map((f) => f.href);
}
