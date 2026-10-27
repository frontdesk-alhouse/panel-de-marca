import { formatDuration, formatNumber, formatPct, formatSignedPct } from "@/lib/format";
import type { History } from "./query";

/** Una referencia contra la que se lee una cifra. */
export interface Ref {
  text: string;
  tone?: "good" | "watch" | "bad" | "neutral";
  source?: string;
}

export interface KpiRefs {
  industry: Ref | null;
  own: Ref;
}

type Kind = "count" | "pct" | "seconds" | "position";

function band(v: number | null, green: number, yellow: number, dir: "up" | "down"): Ref["tone"] {
  if (v === null) return "neutral";
  if (dir === "up") return v >= green ? "good" : v >= yellow ? "watch" : "bad";
  return v <= green ? "good" : v <= yellow ? "watch" : "bad";
}

/**
 * Estándar de la industria por indicador (investigado 2026-10). Donde no hay un
 * estándar confiable se dice y solo cuenta tu propia referencia.
 */
export const INDUSTRY = {
  sessions: (_v: number | null, days: number): Ref => ({
    text: `Mediana de sitios B2B ≈ ${formatNumber((3600 * days) / 30)} en ${days} días`, tone: "neutral",
    source: "Databox, 2,000+ empresas B2B: 3.6k sesiones al mes. Un negocio local estará debajo y no es malo.",
  }),
  engagement: (v: number | null): Ref => ({
    text: "Promedio 53 % · bueno desde 55 %", tone: band(v, 0.55, 0.45, "up"),
    source: "GA4 entre industrias 52.6 % (Webtonic 2026); B2B 60 % (Portent 2023).",
  }),
  bounce: (v: number | null): Ref => ({
    text: "Promedio 47 % · bueno por debajo de 45 %", tone: band(v, 0.45, 0.55, "down"),
    source: "Inverso de la tasa de interacción de GA4 (Webtonic 2026).",
  }),
  avgTime: (): Ref => ({
    text: "Servicios profesionales ≈ 2 min 33 s por sesión", tone: "neutral",
    source: "Databox 2024. Orientativo: mide duración de sesión y GA4 aquí mide tiempo activo, que suele ser menor.",
  }),
  scroll: (): Ref => ({
    text: "Sin estándar universal; páginas de aterrizaje recorren 30–50 %", tone: "neutral",
    source: "Varía por tipo y largo de página (MonkeyVision, Usermaven). Lo útil es tu propia tendencia.",
  }),
  contactRate: (v: number | null): Ref => ({
    text: `Servicios B2B convierten 2–6 % de visitas · bueno desde 4 %${v === null ? "" : ` (tú: ${formatPct(v, 1)})`}`,
    tone: band(v, 0.04, 0.02, "up"), source: "Ruler Analytics 2026, Unbounce.",
  }),
  ctr: (v: number | null): Ref => ({
    text: "Mediana de sitios 0.9 % · cuartil alto 1.8 %", tone: band(v, 0.0179, 0.0091, "up"),
    source: "Databox, benchmark de CTR en Search Console (sep 2026).",
  }),
  position: (v: number | null): Ref => ({
    text: "Primera página = posición 10 o mejor", tone: band(v, 10, 20, "down"),
    source: "Google muestra 10 resultados orgánicos por página.",
  }),
  paidShare: (v: number | null): Ref => ({
    text: "Sano: menos de 35 % del tráfico pagado", tone: band(v, 0.35, 0.5, "down"),
    source: "Umbral propio: una agencia que vive de anuncios no demuestra su propio posicionamiento.",
  }),
  adsConversion: (v: number | null): Ref => ({
    text: `Servicios empresariales: 4.85 % de clics a lead${v === null ? "" : ` (tú: ${formatPct(v, 1)})`}`,
    tone: band(v, 0.05, 0.03, "up"), source: "WordStream 2026 vía ALM Corp.",
  }),
};

function fmt(kind: Kind, v: number): string {
  if (kind === "pct") return formatPct(v, v < 0.1 ? 1 : 0);
  if (kind === "seconds") return formatDuration(v);
  if (kind === "position") return formatNumber(v, 1);
  return formatNumber(v);
}

/**
 * Tu referencia: promedio de tu historia anterior al periodo (para conteos, escalado
 * al largo del periodo) y el cambio contra el periodo anterior si es comparable.
 */
export function ownRef(opts: {
  kind: Kind;
  current: number | null;
  hist: History | null;
  /** Cómo sacar el valor de la historia: conteo (métrica) o tasa (num/den) */
  metric?: string;
  /** Suma de varias métricas (p. ej. tipos de contacto) */
  metrics?: string[];
  ratio?: [string, string];
  /** Usar 1 - tasa (rebote a partir de interacción) */
  invert?: boolean;
  periodDays: number;
  previous?: number | null;
  comparable: boolean;
  higherIsBetter?: boolean;
}): Ref {
  const { kind, current, hist, metric, metrics, ratio, invert, periodDays, previous, comparable, higherIsBetter = true } = opts;
  const parts: string[] = [];
  let tone: Ref["tone"] = "neutral";
  if (comparable && current !== null && previous != null && previous > 0) {
    const ch = (current - previous) / previous;
    parts.push(`${formatSignedPct(ch)} vs periodo anterior`);
    tone = Math.abs(ch) < 0.05 ? "neutral" : (ch > 0) === higherIsBetter ? "good" : "bad";
  }
  if (!hist || hist.days < periodDays) {
    const have = hist?.days ?? 0;
    parts.push(`tu referencia se forma con el tiempo (${have} de ${periodDays} días de historia)`);
    return { text: parts.join(" · "), tone };
  }
  let base: number | null = null;
  if (metric !== undefined && hist.values[metric] !== undefined) base = (hist.values[metric] * periodDays) / hist.days;
  if (metrics) base = (metrics.reduce((a, m) => a + (hist.values[m] ?? 0), 0) * periodDays) / hist.days;
  if (ratio) {
    const [n, d] = ratio;
    base = hist.values[d] ? (hist.values[n] ?? 0) / hist.values[d] : null;
    if (base !== null && invert) base = 1 - base;
  }
  if (base !== null) parts.unshift(`tu promedio histórico: ${fmt(kind, base)}`);
  return { text: parts.join(" · ") || "Sin historia todavía", tone, source: `Calculado con tus ${hist.days} días anteriores a este periodo.` };
}
