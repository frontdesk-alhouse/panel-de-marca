import { z } from "zod";
import { BUILDER_IDS } from "../builders/catalog";

/**
 * Configuración de la marca que usa el panel: quién es, dónde está, qué vende,
 * a quién compite y con qué cuentas mide. Vive en la base (tabla `workspace`),
 * no en el código, para que cada instalación tenga la suya.
 */
const text = z.string().trim();
const optionalText = text.optional();

export const CompetitorSchema = z.object({
  name: text.min(1).max(120),
  domain: text.min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Dominio sin https:// ni rutas, p. ej. estudio.com"),
  city: text,
  mapsQuery: text,
  instagram: optionalText,
});
export type CompetitorInput = z.infer<typeof CompetitorSchema>;

/** Forma que usan las fuentes: el sitio propio va primero, con `self`. */
export interface Competitor extends CompetitorInput { self?: boolean }

export const PackageSchema = z.object({
  id: text.min(1).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: text.min(1),
  /** Valor del primer proyecto, en la moneda de la cuenta; null = a la medida. */
  firstProject: z.number().nonnegative().nullable(),
});
export type Package = z.infer<typeof PackageSchema>;

/** Fragmento de expresión regular que debe compilar (los filtros de ideas se arman con ellos). */
const pattern = text.min(1).refine((p) => {
  try {
    new RegExp(p, "i");
    return true;
  } catch {
    return false;
  }
}, "Patrón inválido");

export const RedditSearchSchema = z.object({
  /** Subreddit sin «r/». */
  sub: text.min(1).regex(/^[A-Za-z0-9_]+$/, "Solo el nombre del subreddit, sin r/"),
  q: text.min(1),
  /** Tema libre para agrupar (p. ej. «negocio», «web»). */
  topic: text.min(1),
});
export type RedditSearch = z.infer<typeof RedditSearchSchema>;

export const ContentSchema = z.object({
  /** Temas para el autocompletado de Google («agencia de branding», «página web»). */
  topics: z.array(text.min(1)).default([]),
  redditSearches: z.array(RedditSearchSchema).default([]),
  /** Una idea cuenta si coincide con alguno (sin distinguir mayúsculas). Vacío = todas. */
  relevantPatterns: z.array(pattern).default([]),
  /** Se descarta si menciona alguno; sirve para quitar otros países o ciudades. */
  excludePatterns: z.array(pattern).default([]),
  /** Intención «local» de una búsqueda. Vacío = ciudad + ciudades locales + «cerca de mí». */
  localPatterns: z.array(pattern).default([]),
  /** Palabras de servicio que debe tener el título de la página de inicio. Vacío = de los servicios y temas. */
  serviceTitlePatterns: z.array(pattern).default([]),
  /** Rutas que cuentan como página de servicio (/branding, /diseno-web…). Vacío = de los servicios y temas. */
  servicePagePatterns: z.array(pattern).default([]),
});
export type Content = z.infer<typeof ContentSchema>;

/** Lo que pidió la marca en el briefing: guía qué secciones importan y qué ideas buscar. */
export const COMPETITOR_INTERESTS = ["precios", "contenido", "anuncios", "resenas", "seo", "redes", "servicios"] as const;
export const BriefingSchema = z.object({
  /** «¿Qué te gustaría saber de tu competencia?» */
  wantToKnow: z.array(z.enum(COMPETITOR_INTERESTS)).default([]),
  wantToKnowOther: text.default(""),
  /** «¿Qué ideas de contenido quieres que saquemos?» */
  contentIdeas: text.default(""),
  /** «¿A quién le vendes?» */
  audience: text.default(""),
  /** «¿Qué quieres lograr en los próximos meses?» */
  goals: text.default(""),
});
export type Briefing = z.infer<typeof BriefingSchema>;

export const LANGUAGES = ["es", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const WorkspaceSchema = z.object({
  brand: z.object({
    name: text.min(1),
    /** Dominio del sitio, sin https:// (p. ej. tumarca.mx). */
    domain: CompetitorSchema.shape.domain,
    city: text,
    /** Municipios del área local tal como los nombra Google Analytics (vacío = solo `city`). */
    localCities: z.array(text.min(1)).default([]),
    /** Cómo se busca el negocio en Google Maps. */
    mapsQuery: text,
    instagram: optionalText,
    /** Una búsqueda es «de marca» si contiene alguno de estos términos (minúsculas). */
    brandTerms: z.array(text.min(1)).min(1),
    /** Páginas que mide PageSpeed; la primera debe ser «/». */
    keyPaths: z.array(text.regex(/^\//)).min(1),
    /** Quiénes usan el panel, como se nombran en el chat («Ana y Luis»). */
    team: text.min(1),
    /** Quién fija prioridades en la estrategia («Ana»). */
    owner: text.min(1),
    /** En qué está montado el sitio (lo elige la persona): manda sobre lo que detecta el chequeo. */
    builder: z.enum(BUILDER_IDS).optional(),
  }),
  locale: z.object({
    language: z.enum(LANGUAGES),
    /** Formato de números y moneda (BCP 47), p. ej. es-MX. */
    locale: text.regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Formato como es-MX o en-US"),
    /** Moneda de las cuentas de anuncios (ISO 4217), p. ej. MXN. */
    currency: text.length(3),
    /** Zona horaria IANA, p. ej. America/Mexico_City. */
    timeZone: text.min(3).refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Zona horaria IANA, p. ej. America/Mexico_City"),
  }),
  assistant: z.object({
    /** «Qué es la marca» para el analista del chat: un párrafo. */
    about: text.min(1),
    /** Contexto largo de marca para el plan de medios (posicionamiento, oferta, historia). */
    brief: text.min(1),
    /** Cómo describir el negocio en una línea, p. ej. «una pastelería artesanal en Monterrey». */
    marketContext: text.min(1),
  }),
  packages: z.array(PackageSchema),
  services: z.array(text.min(1)),
  targets: z.object({
    /** Costo por lead objetivo; null = sin objetivo (la métrica no puntúa). */
    cpl: z.number().positive().nullable(),
    clarity: z.object({
      rageClicks: z.number().nullable(),
      deadClicks: z.number().nullable(),
      quickBacks: z.number().nullable(),
    }),
  }),
  /** Búsquedas de Google donde la marca quiere aparecer. */
  targetQueries: z.array(text.min(1)),
  /** Respuestas del briefing de la configuración inicial. */
  briefing: BriefingSchema.optional(),
  /** De dónde salen las ideas de contenido. */
  content: ContentSchema.default({ topics: [], redditSearches: [], relevantPatterns: [], excludePatterns: [], localPatterns: [], serviceTitlePatterns: [], servicePagePatterns: [] }),
  /** IDs de cuentas: solo arman links directos, no dan acceso. */
  platforms: z.object({
    googleAdsCustomerId: optionalText,
    ga4PropertyId: optionalText,
    metaAdAccountId: optionalText,
    clarityProjectId: optionalText,
    /** Propiedad de Search Console, p. ej. sc-domain:tumarca.mx */
    gscProperty: optionalText,
    /** Nombre del Perfil de Google Business. */
    gbpName: optionalText,
    siteEditor: z.object({ name: text.min(1), url: z.url() }).optional(),
  }),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

/** Lo que el navegador puede ver: sin el brief ni el contexto del analista. */
export type PublicWorkspace = Omit<Workspace, "assistant">;
export function toPublic(ws: Workspace): PublicWorkspace {
  const { assistant: _omit, ...rest } = ws;
  void _omit;
  return rest;
}
