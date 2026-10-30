/** Agregados de metric_daily por (fuente, métrica, dimensión) dentro de una ventana. */
export interface AggRow {
  source: string;
  metric: string;
  dimKey: string;
  value: number;
}

export interface RawWindows {
  current: AggRow[];
  previous: AggRow[];
  /** Ventana larga para costo por cliente */
  pipeline: AggRow[];
  /** Último valor por clave hasta el fin de la ventana actual */
  latest: AggRow[];
  /** Último valor por clave hasta el fin de la ventana previa (para crecimiento) */
  latestAtPreviousEnd: AggRow[];
}

export interface LeadLite {
  createdAt: Date;
  firstContactAt: Date | null;
  proposalAt: Date | null;
  stage: "nuevo" | "calificado" | "propuesta" | "cerrado" | "perdido";
  qualified: boolean | null;
  value: number | null;
  package: string | null;
}

type DimMatch = string | ((dimKey: string) => boolean);

export function pick(rows: AggRow[], source: string, metric: string, dim: DimMatch = ""): AggRow[] {
  return rows.filter(
    (r) => r.source === source && r.metric === metric && (typeof dim === "string" ? r.dimKey === dim : dim(r.dimKey)),
  );
}

/** Suma, o null si no hay ninguna fila (para distinguir «sin datos» de «cero»). */
export function sum(rows: AggRow[], source: string, metric: string, dim: DimMatch = ""): number | null {
  const found = pick(rows, source, metric, dim);
  return found.length ? found.reduce((a, r) => a + r.value, 0) : null;
}

export function ratio(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

/** Totales que, en una fuente que sí está midiendo, «sin filas» significa cero y no «sin datos». */
export const VOLUME_METRICS: Record<string, string[]> = {
  ga4: ["sessions", "engaged_sessions", "key_events"],
  gsc: ["impressions", "clicks"],
  gads: ["impressions", "clicks", "conversions"],
};

/**
 * Una fuente conectada que no registró nada en la ventana no está «sin datos»: tuvo cero.
 * Sin esto, un sitio sin tráfico no calificaba en rojo, simplemente desaparecía de la nota.
 * `active` son las fuentes con filas hasta la fecha evaluada (no se inventan ceros antes de
 * que la fuente existiera).
 */
export function withZeroVolume(rows: AggRow[], active: ReadonlySet<string>): AggRow[] {
  const extra: AggRow[] = [];
  for (const source of active) {
    for (const metric of VOLUME_METRICS[source] ?? []) {
      if (!rows.some((r) => r.source === source && r.metric === metric && r.dimKey === "")) {
        extra.push({ source, metric, dimKey: "", value: 0 });
      }
    }
  }
  return extra.length ? [...rows, ...extra] : rows;
}
