import type { CompetitorInput, Workspace } from "./schema";

/**
 * Marca ficticia para pruebas y para «Ver con datos de ejemplo». No describe a
 * ninguna empresa real.
 */
export const EXAMPLE_WORKSPACE: Workspace = {
  brand: {
    name: "Estudio Ejemplo",
    domain: "ejemplo.mx",
    city: "Guadalajara",
    localCities: ["Guadalajara", "Zapopan"],
    mapsQuery: "Estudio Ejemplo Guadalajara",
    instagram: "estudio.ejemplo",
    brandTerms: ["estudio ejemplo", "estudioejemplo"],
    keyPaths: ["/", "/servicios", "/contacto", "/proyectos"],
    team: "el equipo",
    owner: "la dirección",
  },
  locale: { language: "es", locale: "es-MX", currency: "MXN", timeZone: "America/Mexico_City" },
  assistant: {
    about: "Estudio de branding y diseño web. Clientes típicos: negocios de servicios profesionales. Paquetes: Básico $40,000 MXN, Completo $90,000; Premium a la medida.",
    brief: "## Posicionamiento\nEstudio de branding y diseño web para negocios de servicios profesionales.\n\n## Oferta\nBásico $40,000, Completo $90,000, Premium a la medida.",
    marketContext: "un estudio pequeño en Guadalajara",
  },
  packages: [
    { id: "basico", name: "Básico", firstProject: 40_000 },
    { id: "completo", name: "Completo", firstProject: 90_000 },
    { id: "premium", name: "Premium", firstProject: null },
  ],
  services: ["Estrategia de marca", "Branding e identidad", "Sitio web", "Redes sociales", "Paid ads", "Blogs y SEO"],
  targets: { cpl: 500, clarity: { rageClicks: null, deadClicks: null, quickBacks: null } },
  targetQueries: ["agencia de branding guadalajara", "diseño web guadalajara", "estudio de branding"],
  content: {
    topics: ["agencia de branding", "página web", "identidad de marca"],
    redditSearches: [
      { sub: "smallbusiness", q: "branding worth it", topic: "negocio" },
      { sub: "web_design", q: "client", topic: "web" },
    ],
    relevantPatterns: ["brand", "marca", "logo", "p[aá]gina web", "sitio web", "dise[ñn]o web", "website", "agencia", "identidad"],
    excludePatterns: ["madrid", "espa[ñn]a", "per[uú]", "colombia", "argentina", "chile"],
    // Vacíos: se derivan de la ciudad, los servicios y los temas.
    localPatterns: [],
    serviceTitlePatterns: [],
    servicePagePatterns: [],
  },
  platforms: {},
};

export const EXAMPLE_COMPETITORS: CompetitorInput[] = [
  { name: "Rival Uno", domain: "rival-uno.mx", city: "Guadalajara", mapsQuery: "Rival Uno agencia Guadalajara", instagram: "rival.uno" },
  { name: "Rival Dos", domain: "rival-dos.com", city: "CDMX", mapsQuery: "Rival Dos agencia Ciudad de México" },
];
