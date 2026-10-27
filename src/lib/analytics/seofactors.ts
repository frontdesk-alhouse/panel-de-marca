/**
 * Fuerza SEO (0-100): qué tan bien cumple cada sitio los factores que Google
 * dice usar para ordenar resultados. Google no publica pesos; el orden sigue su
 * documentación y los pesos, estudios de la industria:
 *
 * - Contenido y relevancia (30): Google «siempre busca mostrar el contenido más
 *   relevante» (Page experience). Más estudios: publicar contenido útil con
 *   constancia es el factor nº 1 (First Page Sage 2025).
 * - Autoridad por enlaces (25): «link analysis systems and PageRank» siguen
 *   activos (Ranking systems guide).
 * - Prominencia local (15): para búsquedas con ciudad, Google usa relevancia,
 *   distancia y prominencia; reseñas y calificación cuentan (Business Profile).
 * - SEO técnico (15): que Google pueda rastrear, indexar y entender la página.
 * - Experiencia de página (10): Core Web Vitals ayudan cuando hay mucho
 *   contenido similar, pero «no garantizan» el primer lugar.
 * - Confianza (5): señales de E-E-A-T visibles (quién eres, contacto, trabajos).
 */
export const FACTORS = [
  { key: "content", label: "Contenido", weight: 30 },
  { key: "authority", label: "Autoridad", weight: 25 },
  { key: "local", label: "Local", weight: 15 },
  { key: "technical", label: "Técnico", weight: 15 },
  { key: "experience", label: "Velocidad", weight: 10 },
  { key: "trust", label: "Confianza", weight: 5 },
] as const;

export type FactorKey = (typeof FACTORS)[number]["key"];
export type FactorScores = Record<FactorKey, number | null>;

/** Valores crudos de un sitio en una fecha (undefined = sin medir). */
export interface SiteSignals {
  pages?: number; blog?: number; service?: number; freshDays?: number;
  refDomains?: number; domainScore?: number;
  gbpFound?: number; gbpRating?: number; gbpReviews?: number;
  https?: number; sitemap?: number; indexable?: number; canonical?: number; metaDescription?: number; schema?: number; h1?: number; titleKeyword?: number;
  perf?: number;
  trustPages?: number;
}

/** Escala logarítmica 0-1: `full` o más = 1. Diez veces menos que `full` vale la mitad, aprox. */
export function logScale(value: number, full: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.log10(value + 1) / Math.log10(full + 1));
}

const avg = (xs: (number | null)[]) => {
  const ok = xs.filter((x): x is number => x !== null);
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
};
const has = (v?: number) => v !== undefined;

/** Referencias de «lleno»: lo que publica un estudio fuerte en México (de la medición de competencia). */
export const FULL = { pages: 200, blog: 100, service: 15, refDomains: 300, reviews: 100 } as const;

export function freshness(days?: number): number | null {
  if (days === undefined) return null;
  if (days <= 30) return 1;
  if (days <= 90) return 0.6;
  if (days <= 180) return 0.3;
  return 0;
}

export function factorScores(s: SiteSignals): FactorScores {
  const content = has(s.pages) || has(s.blog)
    ? avg([
      has(s.pages) ? logScale(s.pages!, FULL.pages) : null,
      has(s.blog) ? logScale(s.blog!, FULL.blog) : null,
      has(s.service) ? logScale(s.service!, FULL.service) : null,
      freshness(s.freshDays),
    ])
    : null;

  const authority = has(s.refDomains) || has(s.domainScore)
    ? avg([has(s.refDomains) ? logScale(s.refDomains!, FULL.refDomains) : null, has(s.domainScore) ? s.domainScore! / 100 : null])
    : null;

  // Sin perfil en Google Maps = 0: para búsquedas con ciudad es invisible en el mapa.
  const local = has(s.gbpFound)
    ? s.gbpFound
      ? 0.3 + 0.3 * ((s.gbpRating ?? 0) / 5) * Math.min(1, (s.gbpReviews ?? 0) / 5) + 0.4 * logScale(s.gbpReviews ?? 0, FULL.reviews)
      : 0
    : null;

  const checks = [s.https, s.sitemap, s.indexable, s.canonical, s.metaDescription, s.schema, s.titleKeyword, has(s.h1) ? (s.h1 === 1 ? 1 : 0) : undefined];
  const measured = checks.filter(has) as number[];
  const technical = measured.length >= 4 ? measured.reduce((a, b) => a + b, 0) / measured.length : null;

  const experience = has(s.perf) ? s.perf! / 100 : null;
  const trust = has(s.trustPages) ? Math.min(1, s.trustPages! / 3) : null;

  const pct = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 10);
  return { content: pct(content), authority: pct(authority), local: pct(local), technical: pct(technical), experience: pct(experience), trust: pct(trust) };
}

/**
 * Suma ponderada sobre los factores medidos, reescalada a 100. Devuelve también
 * la cobertura (peso medido / peso total) para no comparar calificaciones con
 * huecos como si fueran completas.
 */
export function seoStrength(f: FactorScores): { score: number | null; coverage: number } {
  let sum = 0, weight = 0;
  for (const { key, weight: w } of FACTORS) {
    const v = f[key];
    if (v === null) continue;
    sum += v * w;
    weight += w;
  }
  const total = FACTORS.reduce((a, b) => a + b.weight, 0);
  return { score: weight ? Math.round((sum / weight) * 10) / 10 : null, coverage: weight / total };
}
