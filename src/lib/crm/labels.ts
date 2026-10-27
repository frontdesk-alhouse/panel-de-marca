import type { ACTIVITY_TYPES, COMPANY_SIZES, INDUSTRIES, LEAD_CHANNELS, LEAD_OUTCOMES, LEAD_STAGES } from "@/db/schema";

export const STAGE_LABELS: Record<(typeof LEAD_STAGES)[number], string> = {
  nuevo: "Nuevo", calificado: "Calificado", propuesta: "Propuesta", cerrado: "Cerrado", perdido: "Perdido",
};
export const CHANNEL_LABELS: Record<(typeof LEAD_CHANNELS)[number], string> = {
  organico: "Google orgánico", ads: "Google Ads", meta: "Meta / Instagram", directo: "Directo", referido: "Referido", otro: "Otro",
};
export const INDUSTRY_LABELS: Record<(typeof INDUSTRIES)[number], string> = {
  salud: "Salud y médicos", "arquitectura-construccion": "Arquitectura y construcción", industrial: "Industrial",
  "servicios-b2b": "Servicios B2B", "retail-consumo": "Retail y consumo", hospitalidad: "Restaurantes y hospitalidad",
  educacion: "Educación", tecnologia: "Tecnología", otro: "Otra",
};
export const ACTIVITY_LABELS: Record<(typeof ACTIVITY_TYPES)[number], string> = {
  llamada: "Llamada", reunion: "Reunión", whatsapp: "WhatsApp", correo: "Correo", propuesta: "Propuesta enviada", nota: "Nota",
};
export const OUTCOME_LABELS: Record<(typeof LEAD_OUTCOMES)[number], string> = { ganado: "Ganado", perdido: "Perdido", pausado: "En pausa" };

export const COMPANY_SIZE_LABELS: Record<(typeof COMPANY_SIZES)[number], string> = { chica: "Chica (1-10)", mediana: "Mediana (11-35)", grande: "Grande (36+)" };
export const COMPANY_SIZE_HELP = "Tamaño por número de empleados: chica 1 a 10, mediana 11 a 35, grande 36 o más.";
