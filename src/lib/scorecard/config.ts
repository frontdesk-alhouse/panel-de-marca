import { competitors, ws } from "@/lib/workspace/store";
import type { DimensionDefinition } from "./types";

/**
 * Pesos de la calificación general. Suman 100. Sesgados a leads porque ese es
 * el objetivo declarado; se pueden mover aquí.
 */
export const DIMENSIONS: DimensionDefinition[] = [
  { id: "visibilidad", label: "Visibilidad orgánica", weight: 20, question: "¿Nos encuentran cuando buscan lo que hacemos?" },
  { id: "conversion", label: "Conversión del sitio", weight: 20, question: "¿El sitio convierte visitas en leads?" },
  { id: "inversion", label: "Eficiencia de inversión", weight: 20, question: "¿Cada peso en anuncios regresa como cliente?" },
  { id: "pipeline", label: "Pipeline y respuesta", weight: 10, question: "¿Los leads se atienden y se cierran?" },
  { id: "adquisicion", label: "Adquisición y tráfico", weight: 10, question: "¿Crece el tráfico y depende poco del pago?" },
  { id: "marca", label: "Marca y social", weight: 10, question: "¿La marca gana notoriedad y comunidad?" },
  { id: "experiencia", label: "Experiencia y técnica", weight: 10, question: "¿El sitio carga, se entiende y no frustra?" },
];

/**
 * Objetivos propios, desde la configuración de la marca. `null` = aún sin fijar:
 * la métrica que lo usa queda «sin referencia» y no puntúa. Ningún costo se
 * califica contra benchmarks de EE. UU. Los costos van en la moneda de la cuenta
 * (las llaves dicen «Mxn» por historia).
 */
export function ownTargets() {
  const w = ws();
  return {
    cplTargetMxn: w.targets.cpl,
    /** Valor del primer proyecto por paquete, para costo por cliente vs ticket. */
    ticketByPackageMxn: Object.fromEntries(w.packages.map((p) => [p.id, p.firstProject])) as Record<string, number | null>,
    /** Valores de «Business & Consumer Services» en clarity.microsoft.com/benchmark (proporción de sesiones) */
    clarityBenchmark: w.targets.clarity,
  };
}

/** Una búsqueda es de marca si contiene alguno de estos términos */
export const brandTerms = () => ws().brand.brandTerms;

export const siteOrigin = () => `https://${ws().brand.domain}`;

/** URLs que mide PageSpeed Insights */
export const keyPaths = () => ws().brand.keyPaths;

/** Ventanas de comparación */
export const WINDOW_DAYS = 28;
export const PIPELINE_WINDOW_DAYS = 90;

/** Sitio propio primero (con `self`) y la competencia activa; se edita en /competencia o /ajustes. */
export { competitors };

/** Búsquedas donde la marca quiere aparecer; el panel muestra la posición actual. */
export const targetQueries = () => ws().targetQueries;
