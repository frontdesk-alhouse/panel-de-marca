/** Pasos de la configuración inicial (compartido entre la página del servidor y el asistente). */
export const STEPS = ["bienvenida", "sitio", "briefing", "marca", "mercado", "conexiones", "actualizar"] as const;
export type StepId = (typeof STEPS)[number];
export const isStep = (s: string | undefined): s is StepId => (STEPS as readonly string[]).includes(s ?? "");
