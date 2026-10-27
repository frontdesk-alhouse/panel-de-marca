import type { MetricDefinition } from "./types";

/**
 * Bandas por métrica. Fuentes investigadas el 2026-10-23; casi todas son de
 * EE. UU. y de blogs que se citan entre sí: ubican el orden de magnitud, no son
 * metas exactas. `own: true` marca umbrales de juicio propio que se revisan con
 * la línea base. Revisión anual (WordStream publica en primavera; Rival IQ y
 * BrightLocal una vez al año).
 */
const AS_OF = "2026-10";

export const METRICS: MetricDefinition[] = [
  // 1 · Visibilidad orgánica
  {
    id: "brand_ctr", dimension: "visibilidad", label: "CTR en búsquedas de marca", unit: "pct",
    direction: "up", green: 0.5, yellow: 0.3, minSample: 30,
    source: "Visionary Marketing 2026: CTR de marca en posición 1 ≈ 56 % vs 25 % no-marca", asOf: AS_OF, own: false,
    ease: 3, lever: "Ajustar título y descripción de la Home para búsquedas de marca y confirmar sitelinks",
  },
  {
    id: "brand_position", dimension: "visibilidad", label: "Posición media en búsquedas de marca", unit: "position",
    direction: "down", green: 1.5, yellow: 3, minSample: 30,
    source: "Una marca debe ser el primer resultado de su propio nombre", asOf: AS_OF, own: true,
    ease: 2, lever: "Reforzar la entidad de marca: schema Organization, Google Business Profile enlazado y perfiles sociales",
  },
  {
    id: "nonbrand_ctr_vs_expected", dimension: "visibilidad", label: "CTR no-marca vs el esperado por posición", unit: "ratio",
    direction: "up", green: 0.8, yellow: 0.5, minSample: 100,
    source: "First Page Sage 2026 y otros: pos. 1 25-40 %, pos. 2 12-19 %, pos. 3 7-10 %, pos. 4-10 2-6 %", asOf: AS_OF, own: false,
    ease: 3, lever: "Reescribir títulos y descripciones de las páginas con CTR bajo para su posición",
  },
  {
    id: "nonbrand_top10_queries", dimension: "visibilidad", label: "Búsquedas no-marca en el top 10", unit: "count",
    direction: "up", green: 10, yellow: 3,
    source: "Umbral propio; ajustar al cerrar la línea base", asOf: AS_OF, own: true,
    ease: 1, lever: "Crear o reforzar páginas por servicio y por nicho (Fase 2 de SEO)",
  },
  {
    id: "nonbrand_impressions_delta", dimension: "visibilidad", label: "Impresiones no-marca vs 28 días previos", unit: "delta",
    direction: "up", green: 0.1, yellow: -0.1, minSample: 100,
    source: "Umbral propio: crecer ≥ 10 % por periodo", asOf: AS_OF, own: true,
    ease: 1, lever: "Publicar contenido para búsquedas de servicio y enlazarlo desde páginas fuertes",
  },
  {
    id: "gbp_action_rate", dimension: "visibilidad", label: "Acciones en Google Business Profile por vista", unit: "pct",
    direction: "up", green: 0.05, yellow: 0.03, minSample: 100,
    source: "BrightLocal GBP Insights 2026 (vía Searchlab): ~5 % de las vistas termina en llamada, clic o ruta", asOf: AS_OF, own: false,
    ease: 2, lever: "Completar el perfil: fotos, servicios, publicaciones y reseñas recientes",
  },

  // 2 · Conversión del sitio
  {
    id: "site_conversion", dimension: "conversion", label: "Visitas que se vuelven lead", unit: "pct",
    direction: "up", green: 0.04, yellow: 0.02, minSample: 200,
    source: "Servicios profesionales B2B 2-6 %, mediana ~3-4 %, top 8-12 % (Ruler Analytics 2026, Unbounce)", asOf: AS_OF, own: false,
    ease: 1, lever: "Revisar propuesta y CTA de la Home y /services; probar un formulario más corto",
  },
  {
    id: "organic_conversion", dimension: "conversion", label: "Conversión del tráfico orgánico", unit: "pct",
    direction: "up", green: 0.05, yellow: 0.03, minSample: 100,
    source: "Ruler Analytics 2026: el orgánico convierte 8.1 % en servicios profesionales", asOf: AS_OF, own: false,
    ease: 2, lever: "Agregar CTA contextual en las páginas que más tráfico orgánico reciben",
  },
  {
    id: "paid_conversion", dimension: "conversion", label: "Conversión del tráfico pagado", unit: "pct",
    direction: "up", green: 0.05, yellow: 0.03, minSample: 100,
    source: "WordStream 2026: Business Services 4.85 % de clic a lead", asOf: AS_OF, own: false,
    ease: 2, lever: "Alinear la landing con el anuncio: mismo mensaje, CTA arriba y teléfono visible",
  },

  // 3 · Eficiencia de inversión
  {
    id: "ads_ctr", dimension: "inversion", label: "CTR de Google Ads (Search)", unit: "pct",
    direction: "up", green: 0.06, yellow: 0.03, minSample: 500,
    source: "WordStream 2026 (vía ALM): Business Services 6.10 %, promedio 6.64 %", asOf: AS_OF, own: false,
    ease: 3, lever: "Reescribir anuncios con la intención de cada búsqueda y agregar negativas",
  },
  {
    id: "ads_cvr", dimension: "inversion", label: "Clics de Google Ads que se vuelven lead", unit: "pct",
    direction: "up", green: 0.05, yellow: 0.03, minSample: 30,
    source: "WordStream 2026: Business Services 4.85 %, promedio 8.18 %", asOf: AS_OF, own: false,
    ease: 2, lever: "Quitar términos sin conversión y mejorar la landing del grupo",
  },
  {
    id: "ads_quality_score", dimension: "inversion", label: "Quality Score promedio", unit: "score",
    direction: "up", green: 7, yellow: 5, minSample: 500,
    source: "WebFX/Stacker 2026: promedio 5-7; 8+ abarata el clic", asOf: AS_OF, own: false,
    ease: 2, lever: "Subir la relevancia entre palabra clave, anuncio y landing en cada grupo",
  },
  {
    id: "ads_brand_impression_share", dimension: "inversion", label: "Cuota de impresiones en búsquedas de marca", unit: "pct",
    direction: "up", green: 0.85, yellow: 0.6,
    source: "WebFX/Stacker 2026: 85 %+ en marca evita que la competencia se quede con tu nombre", asOf: AS_OF, own: false,
    ease: 3, lever: "Subir puja o presupuesto del grupo de marca",
  },
  {
    id: "cpl_vs_target", dimension: "inversion", label: "Costo por lead vs objetivo", unit: "x",
    direction: "down", green: 1, yellow: 1.3, minSample: 3,
    source: "Objetivo propio en la moneda de la cuenta; referencia externa solo orientativa (Business Services US$94 en EE. UU.)", asOf: AS_OF, own: true,
    ease: 2, lever: "Mover presupuesto al canal con menor costo por lead y pausar lo que esté en rojo",
  },
  {
    id: "meta_ctr", dimension: "inversion", label: "CTR de Meta Ads", unit: "pct",
    direction: "up", green: 0.02, yellow: 0.01, minSample: 1000,
    source: "WordStream/Ryze 2026: mediana lead-gen 2.59 %, B2B 0.8-2 %", asOf: AS_OF, own: false,
    ease: 3, lever: "Probar creativos nuevos con el gancho en el primer segundo",
  },
  {
    id: "meta_frequency", dimension: "inversion", label: "Frecuencia de Meta Ads (28 días)", unit: "x",
    direction: "down", green: 3, yellow: 4,
    source: "Arriba de 3-4 impactos por persona el creativo se satura", asOf: AS_OF, own: true,
    ease: 3, lever: "Rotar creativos o ampliar la audiencia",
  },
  {
    id: "cac_vs_ticket", dimension: "inversion", label: "Costo por cliente vs ticket del paquete", unit: "pct",
    direction: "down", green: 0.15, yellow: 0.3, minSample: 1,
    source: "Criterio propio: CAC ≤ 15 % del primer proyecto; LTV:CAC ≥ 3:1 (regla común de agencias)", asOf: AS_OF, own: true,
    ease: 1, lever: "Concentrar inversión en el canal que sí cierra y cortar el que solo trae leads",
  },

  // 4 · Pipeline y respuesta
  {
    id: "speed_to_lead", dimension: "pipeline", label: "Tiempo de primera respuesta (mediana)", unit: "minutes",
    direction: "down", green: 5, yellow: 60, minSample: 3,
    source: "Responder en 5 min multiplica ×21 la calificación; firmas pequeñas promedian 48 min (CRO Club 2026)", asOf: AS_OF, own: false,
    ease: 2, lever: "Automatizar el primer contacto por WhatsApp al llegar el formulario",
  },
  {
    id: "lead_qualified_rate", dimension: "pipeline", label: "Leads que califican", unit: "pct",
    direction: "up", green: 0.4, yellow: 0.25, minSample: 5,
    source: "Regla de agencias: «CPL de calidad ≥ 40 %»", asOf: AS_OF, own: true,
    ease: 2, lever: "Filtrar mejor en anuncios y formulario: presupuesto, giro y urgencia",
  },
  {
    id: "proposal_close_rate", dimension: "pipeline", label: "Propuestas que cierran", unit: "pct",
    direction: "up", green: 0.3, yellow: 0.2, minSample: 3,
    source: "Win rate de pitch de agencias 22 % (R3); B2B mediana 24 %, top 32 %+", asOf: AS_OF, own: false,
    ease: 1, lever: "Revisar por qué se pierden: precio, alcance o seguimiento",
  },

  // 5 · Adquisición y tráfico
  {
    id: "sessions_delta", dimension: "adquisicion", label: "Sesiones vs 28 días previos", unit: "delta",
    direction: "up", green: 0.1, yellow: -0.1, minSample: 100,
    source: "Umbral propio: crecer ≥ 10 % por periodo", asOf: AS_OF, own: true,
    ease: 1, lever: "Activar el canal con mejor conversión antes que el de más volumen",
  },
  {
    id: "engagement_rate", dimension: "adquisicion", label: "Tasa de interacción (GA4)", unit: "pct",
    direction: "up", green: 0.55, yellow: 0.45, minSample: 200,
    source: "GA4 promedio entre industrias 52.6 % (Webtonic 2026)", asOf: AS_OF, own: false,
    ease: 2, lever: "Revisar las landings con más bounce rate: velocidad, mensaje y coherencia con el anuncio",
  },
  {
    id: "non_paid_share", dimension: "adquisicion", label: "Tráfico que no depende del pago", unit: "pct",
    direction: "up", green: 0.5, yellow: 0.35, minSample: 200,
    source: "Umbral propio: una agencia que vive de anuncios no demuestra su propio posicionamiento", asOf: AS_OF, own: true,
    ease: 1, lever: "Invertir en contenido y SEO para bajar la dependencia de anuncios",
  },

  // 6 · Marca y social
  {
    id: "ig_engagement_rate", dimension: "marca", label: "Interacción por publicación en Instagram", unit: "pct",
    direction: "up", green: 0.03, yellow: 0.01, minSample: 4,
    source: "Cuentas de 1-10k seguidores 2.5-4.8 %; mediana global 0.5 % (Rival IQ/Socialinsider 2026)", asOf: AS_OF, own: false,
    ease: 2, lever: "Subir la proporción de Reels y carruseles con opinión de marca",
  },
  {
    id: "ig_reach_rate", dimension: "marca", label: "Alcance por publicación vs seguidores", unit: "pct",
    direction: "up", green: 0.3, yellow: 0.15, minSample: 4,
    source: "Umbral propio; no hay benchmark sólido de alcance", asOf: AS_OF, own: true,
    ease: 2, lever: "Publicar Reels con gancho temprano y colaborar con cuentas afines",
  },
  {
    id: "ig_follower_growth", dimension: "marca", label: "Crecimiento de seguidores (28 días)", unit: "delta",
    direction: "up", green: 0.02, yellow: 0, minSample: 100,
    source: "Umbral propio", asOf: AS_OF, own: true,
    ease: 1, lever: "Constancia de publicación y contenido que se guarda y comparte",
  },
  {
    id: "brand_impressions_delta", dimension: "marca", label: "Búsquedas de marca vs 28 días previos", unit: "delta",
    direction: "up", green: 0.1, yellow: -0.1, minSample: 30,
    source: "Umbral propio: la notoriedad se ve en búsquedas del nombre", asOf: AS_OF, own: true,
    ease: 1, lever: "Acciones de notoriedad: casos publicados, prensa local y colaboraciones",
  },

  // 7 · Experiencia y técnica
  {
    id: "cwv_status", dimension: "experiencia", label: "Core Web Vitals móvil (peor de LCP, INP, CLS)", unit: "status",
    direction: "down", green: 0, yellow: 1,
    source: "Umbrales oficiales de Google: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1", asOf: AS_OF, own: false,
    ease: 2, lever: "Optimizar la imagen del hero y los scripts de terceros en móvil",
  },
  {
    id: "lighthouse_seo", dimension: "experiencia", label: "Lighthouse SEO", unit: "score",
    direction: "up", green: 90, yellow: 80,
    source: "Google Lighthouse", asOf: AS_OF, own: false,
    ease: 3, lever: "Corregir los hallazgos SEO de Lighthouse en las páginas clave",
  },
  {
    id: "lighthouse_a11y", dimension: "experiencia", label: "Lighthouse Accesibilidad", unit: "score",
    direction: "up", green: 90, yellow: 80,
    source: "Google Lighthouse", asOf: AS_OF, own: false,
    ease: 3, lever: "Corregir contraste, etiquetas y alt en las páginas clave",
  },
  {
    id: "clarity_rage_vs_benchmark", dimension: "experiencia", label: "Rage clicks vs benchmark de Clarity", unit: "x",
    direction: "down", green: 1, yellow: 1.5, minSample: 100,
    source: "Clarity benchmark, categoría Business & Consumer Services", asOf: AS_OF, own: false,
    ease: 2, lever: "Ver grabaciones con rage clicks y arreglar lo que parece clicable y no lo es",
  },
  {
    id: "clarity_dead_vs_benchmark", dimension: "experiencia", label: "Dead clicks vs benchmark de Clarity", unit: "x",
    direction: "down", green: 1, yellow: 1.5, minSample: 100,
    source: "Clarity benchmark, categoría Business & Consumer Services", asOf: AS_OF, own: false,
    ease: 2, lever: "Revisar elementos que invitan al clic sin acción",
  },
  {
    id: "clarity_quickback_vs_benchmark", dimension: "experiencia", label: "Quick backs vs benchmark de Clarity", unit: "x",
    direction: "down", green: 1, yellow: 1.5, minSample: 100,
    source: "Clarity benchmark, categoría Business & Consumer Services", asOf: AS_OF, own: false,
    ease: 2, lever: "Revisar las páginas de las que la gente regresa al instante",
  },
  {
    id: "scroll_depth", dimension: "experiencia", label: "Profundidad de scroll promedio", unit: "pct",
    direction: "up", green: 0.5, yellow: 0.35, minSample: 100,
    source: "Umbral propio", asOf: AS_OF, own: true,
    ease: 2, lever: "Subir el CTA y la prueba social en las landings",
  },
];

export const METRICS_BY_ID = new Map(METRICS.map((m) => [m.id, m]));
