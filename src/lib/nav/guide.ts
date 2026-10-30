/**
 * Nivel de cada sección: «basico» la entiende cualquiera que lleva el negocio; «tecnico»
 * pide saber de marketing digital (SEO, anuncios, analítica). La vista simple esconde lo técnico.
 * Los textos de «qué vas a ver» y «para qué te sirve» viven en i18n (guide.items).
 */
export type GuideLevel = "basico" | "tecnico";

export const SECTION_LEVEL: Record<string, GuideLevel> = {
  "/": "basico",
  "/resumen": "basico",
  "/negocio": "basico",
  "/crm": "basico",
  "/estrategia": "basico",
  "/calificacion": "basico",
  "/trafico": "basico",
  "/seo": "tecnico",
  "/seo/ia": "tecnico",
  "/ideas": "basico",
  "/anuncios": "tecnico",
  "/comportamiento": "tecnico",
  "/sitio": "tecnico",
  "/competencia": "basico",
  "/social": "basico",
  "/social/instagram": "basico",
  "/social/paid": "tecnico",
  "/social/competencia": "basico",
  "/skills": "tecnico",
};

export const isTechnical = (href: string): boolean => SECTION_LEVEL[href] === "tecnico";
