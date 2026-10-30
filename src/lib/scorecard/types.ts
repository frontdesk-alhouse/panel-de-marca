export type DimensionId =
  | "visibilidad" | "conversion" | "inversion" | "pipeline" | "adquisicion" | "marca" | "experiencia";

export type Direction = "up" | "down";
/** pct = proporción mostrada como %; delta = cambio relativo con signo; ratio = veces; status = 0 bueno · 1 mejorable · 2 malo */
export type Unit = "pct" | "delta" | "ratio" | "count" | "minutes" | "position" | "score" | "status" | "x";
export type Band = "green" | "yellow" | "red";
/** Facilidad de mover la métrica: 3 fácil · 2 media · 1 difícil */
export type Ease = 1 | 2 | 3;

export interface MetricDefinition {
  id: string;
  dimension: DimensionId;
  label: string;
  unit: Unit;
  direction: Direction;
  /** Umbral para verde: up → valor ≥ green; down → valor ≤ green */
  green: number;
  /** Umbral para amarillo: up → valor ≥ yellow; down → valor ≤ yellow */
  yellow: number;
  /** De dónde sale la banda. `own: true` = juicio propio, se revisa con la línea base. */
  source: string;
  asOf: string;
  own: boolean;
  /** Muestra mínima para calificar (sesiones, clics, leads… según la métrica) */
  minSample?: number;
  ease: Ease;
  lever: string;
}

export interface DimensionDefinition {
  id: DimensionId;
  label: string;
  weight: number;
  question: string;
}

export type MetricStatus = "scored" | "no_data" | "insufficient" | "no_reference" | "not_tracked";

export interface MetricInput {
  value: number | null;
  /** Tamaño de la muestra que respalda el valor */
  sample?: number;
  /** Forzar estado cuando no se puede calcular (p. ej. falta el objetivo propio) */
  status?: Exclude<MetricStatus, "scored">;
}

export interface MetricResult {
  definition: MetricDefinition;
  value: number | null;
  sample?: number;
  status: MetricStatus;
  band?: Band;
  score?: number;
}

export interface DimensionResult {
  definition: DimensionDefinition;
  /** Nota del área. Sin base suficiente vale 0 (ver `rated`). */
  score: number;
  /** true si la nota sale de métricas medidas; false si es 0 por falta de datos. */
  rated: boolean;
  /** Promedio de lo poco que sí se midió cuando no alcanza para calificar. Solo informativo. */
  partial: number | null;
  scored: number;
  total: number;
}

export interface Scorecard {
  overall: number | null;
  /** Proporción de métricas calificadas sobre el total */
  coverage: number;
  /** Proporción del peso total (0 a 1) cuyas áreas tienen base suficiente; el resto vale 0 */
  weightCoverage: number;
  dimensions: DimensionResult[];
  metrics: MetricResult[];
}
