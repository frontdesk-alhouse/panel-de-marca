/**
 * Glosario de métricas: nombre de la industria (en inglés), qué es, en qué impacta
 * y en qué fijarse. Se muestra al pasar el cursor o tocar el nombre de la métrica.
 */
export interface GlossaryEntry {
  term: string;
  what: string;
  impact: string;
  watch: string;
}

export const GLOSSARY = {
  sessions: {
    term: "Sessions",
    what: "Cada vez que alguien entra al sitio cuenta como una visita (sesión). Si la misma persona vuelve otro día, cuenta otra.",
    impact: "Es la base de todo lo demás: sin visitas no hay leads. Pero más visitas no significa más clientes si no son las personas correctas.",
    watch: "La tendencia y de dónde vienen (canal), no el número suelto. Que crezca lo orgánico es mejor señal que crecer solo con anuncios.",
  },
  new_visitors: {
    term: "New visitors",
    what: "De cada 100 visitas, cuántas son de gente que entra por primera vez.",
    impact: "Muchas visitas nuevas = estás llegando a gente nueva. Muy pocas que regresan = la marca aún no genera recordación.",
    watch: "En un sitio recién lanzado es normal que casi todo sea nuevo. Con el tiempo conviene que suban las que regresan (casos, contenido, Instagram).",
  },
  engagement_rate: {
    term: "Engagement rate",
    what: "Porcentaje de visitas que de verdad interactúan: se quedan más de 10 segundos, ven 2 páginas o hacen una acción (clic, formulario).",
    impact: "Mide si el sitio engancha. Es lo contrario del bounce rate.",
    watch: "Promedio de la industria 53 %; bueno desde 55 %. Compáralo por canal: si los anuncios tienen mucho menos, el anuncio atrae a la gente equivocada.",
  },
  bounce_rate: {
    term: "Bounce rate",
    what: "Porcentaje de visitas que se van sin interactuar: menos de 10 segundos, una sola página y ninguna acción.",
    impact: "Quien rebota no llega al contacto. Con anuncios, cada rebote es dinero que no regresa.",
    watch: "Bueno por debajo de 45 %. Revisa la página de entrada: arriba de 60 % en una landing, algo falla (mensaje, velocidad o que no responde a lo que prometió el anuncio).",
  },
  avg_engagement_time: {
    term: "Avg. engagement time",
    what: "Tiempo promedio que la gente tiene el sitio activo en pantalla por visita.",
    impact: "Más tiempo suele significar que están leyendo casos y servicios, que es lo que convence a contratar.",
    watch: "Servicios profesionales rondan 2.5 min por sesión. Un tiempo alto con pocos contactos indica que el camino al formulario no es claro.",
  },
  scroll_depth: {
    term: "Scroll depth (90 %)",
    what: "En qué porcentaje de las páginas vistas la persona baja hasta el 90 % de la página.",
    impact: "Lo que pongas abajo (casos, llamados a contactar) solo lo ve ese porcentaje.",
    watch: "No hay estándar universal. Si una página importante tiene muy poco, sube lo esencial o acórtala.",
  },
  qualified_rate: {
    term: "Lead qualification rate (MQL → SQL)",
    what: "De cada 100 contactos, cuántos sí tienen el perfil, la necesidad y el presupuesto para trabajar con nosotros.",
    impact: "Separa el ruido de los prospectos reales. Un CPL barato con pocos calificados sale caro.",
    watch: "Referencia de agencias: 13-40 % según cómo se define. Meta propia: 35 % o más. Si baja, revisar segmentación y mensaje de los anuncios.",
  },
  cost_per_qualified_lead: {
    term: "Cost per qualified lead",
    what: "Inversión en anuncios entre los leads de anuncios que sí calificaron.",
    impact: "Es el número para decidir cuánto invertir, mejor que el CPL: si 1 de cada 3 califica, un CPL de $500 equivale a ~$1,500 por lead calificado.",
    watch: "Meta: $1,500 o menos. Compáralo contra el ticket promedio; con proyectos de $30-150k puede ser más alto y seguir siendo rentable.",
  },
  win_rate: {
    term: "Win rate",
    what: "De los prospectos que se resolvieron (ganados + perdidos), qué parte ganamos.",
    impact: "Dice si el problema está en los leads o en la venta. Win rate bajo con buenos leads = revisar propuesta, precio o seguimiento.",
    watch: "Agencias en general: ~18-22 % (EE. UU.). Una boutique que solo propone tras calificar debería estar en 30-40 %.",
  },
  proposal_win_rate: {
    term: "Proposal win rate",
    what: "De las propuestas enviadas que ya tienen respuesta, cuántas se ganaron.",
    impact: "Mide la calidad de la propuesta y del proceso de venta, aparte de la calidad de los leads.",
    watch: "Meta: 35 % o más. Si muchas se pierden por precio, revisar a quién se le propone y cómo se presenta el valor.",
  },
  avg_deal: {
    term: "Average deal size",
    what: "Cuánto vale en promedio cada cliente que cerramos.",
    impact: "Con pocos cierres al mes, subir el ticket mueve más el ingreso que conseguir más leads.",
    watch: "Meta: acercarlo al paquete medio (~$60-90k). Si baja, se están vendiendo proyectos chicos que ocupan el mismo tiempo.",
  },
  sales_cycle: {
    term: "Sales cycle length",
    what: "Días entre el primer contacto y la firma, en los clientes ganados (mediana).",
    impact: "Dice con cuánta anticipación hay que generar leads para tener ingreso: un ciclo de 60 días significa que lo de hoy paga dentro de dos meses.",
    watch: "Servicios profesionales: 60-120 días. Meta propia: 60 o menos. Seguimientos con fecha lo acortan.",
  },
  weighted_pipeline: {
    term: "Weighted pipeline",
    what: "Dinero en juego en los prospectos abiertos, multiplicado por la probabilidad de cierre de su etapa (nuevo 10 %, calificado 25 %, propuesta 50 %).",
    impact: "Es el número que anticipa un mes flojo con 60-90 días de margen.",
    watch: "Lo sano es tener 3 a 4 veces la meta de ingreso del periodo. Si no alcanza, toca generar leads ya.",
  },
  cac: {
    term: "Customer acquisition cost (CAC)",
    what: "Inversión en anuncios entre los clientes que llegaron por anuncios.",
    impact: "Dice cuánto cuesta conseguir un cliente con pauta. Con tickets altos, un CAC de varios miles es sano.",
    watch: "Regla de la industria: que el cliente deje al menos 3 veces lo que costó conseguirlo (LTV:CAC ≥ 3:1). Aquí usamos un tercio del ticket como tope.",
  },
  roas: {
    term: "Return on ad spend (ROAS)",
    what: "Valor de los clientes cerrados desde anuncios entre lo invertido en anuncios.",
    impact: "Responde «¿la pauta se paga sola?». 5× = cada peso invertido trajo cinco en proyectos.",
    watch: "Meta: 5× o más en 12 meses. Al inicio sale bajo porque el ciclo de venta tarda; júzgalo por trimestre, no por semana.",
  },
  referral_rate: {
    term: "Referral rate",
    what: "Qué parte de los clientes llega por recomendación.",
    impact: "Es el canal más barato y el que mejor cierra; dice si los clientes quedan contentos.",
    watch: "En agencias ronda un tercio de los clientes. Pedir referidos al entregar cada proyecto lo sube.",
  },
  client_concentration: {
    term: "Client concentration",
    what: "Qué parte del ingreso de los últimos 12 meses viene del cliente más grande.",
    impact: "Si un cliente pesa mucho, perderlo pone en riesgo al negocio.",
    watch: "Riesgo desde 25 %. Meta: que ningún cliente pase de una cuarta parte del ingreso.",
  },
  recurring_share: {
    term: "Recurring revenue share",
    what: "Qué parte del ingreso mensual viene de igualas (retainers) contra proyectos únicos.",
    impact: "El ingreso recurrente da estabilidad para planear, contratar e invertir en marketing.",
    watch: "Meta práctica: 40-60 %. Se mide con el fee mensual de los clientes con iguala en el CRM.",
  },
  leads: {
    term: "Leads",
    what: "Contactos reales: formularios enviados más clics en WhatsApp y en agendar llamada.",
    impact: "Es el resultado que importa: de aquí salen las propuestas y los clientes.",
    watch: "Míralos contra las visitas (conversion rate) y por canal, para saber qué inversión trae clientes.",
  },
  conversion_rate: {
    term: "Conversion rate",
    what: "De cada 100 visitas (o clics), cuántas terminan en lead.",
    impact: "Define cuánto cuesta cada cliente: con la misma inversión, el doble de conversión es la mitad del costo.",
    watch: "Servicios B2B convierten 2–6 % de las visitas; bueno desde 4 %.",
  },
  clicks: {
    term: "Organic clicks",
    what: "Clics que recibes desde los resultados normales de Google, sin pagar.",
    impact: "Es tráfico que no cuesta y que sigue llegando aunque apagues los anuncios.",
    watch: "Que crezcan los clics de búsquedas que no son tu nombre: esos son clientes nuevos que te encuentran por el servicio.",
  },
  impressions: {
    term: "Impressions",
    what: "Cuántas veces apareciste en los resultados de Google, aunque no te dieran clic.",
    impact: "Muestra si Google ya te considera para esas búsquedas. Suben antes que los clics.",
    watch: "Que suban en búsquedas de servicio. Muchas impressions con pocos clics = título o descripción poco atractivos.",
  },
  ctr: {
    term: "CTR (click-through rate)",
    what: "De cada 100 veces que apareces, cuántas te dan clic.",
    impact: "Con la misma posición, un CTR más alto trae más visitas gratis.",
    watch: "Mediana de sitios 0.9 %; cuartil alto 1.8 %. Depende mucho de la posición: en el lugar 1 se espera 25–40 %.",
  },
  avg_position: {
    term: "Avg. position",
    what: "Lugar promedio en el que apareces en Google. 1 es el primer resultado.",
    impact: "Casi nadie pasa de la primera página: del 11 en adelante prácticamente no llegan clics.",
    watch: "10 o mejor = primera página. Las búsquedas entre 8 y 20 son las más fáciles de subir.",
  },
  paid_share: {
    term: "Paid traffic share",
    what: "Qué parte de tus visitas llega por anuncios pagados.",
    impact: "Si casi todo es pagado, el día que pausas la campaña el sitio se queda sin tráfico.",
    watch: "Sano por debajo de 35 %. Bajarlo requiere SEO, contenido y redes.",
  },
  lcp: {
    term: "LCP (Largest Contentful Paint)",
    what: "Segundos que tarda en verse lo principal de la página (la imagen o el texto grande de arriba).",
    impact: "Cada segundo de más hace que más gente se vaya antes de ver nada, sobre todo en celular. Google también lo usa para posicionar.",
    watch: "Bueno: menos de 2.5 s. Más de 4 s es lento.",
  },
  performance: {
    term: "Performance score",
    what: "Calificación de 0 a 100 de PageSpeed (Google) sobre qué tan rápido carga y responde la página en celular.",
    impact: "Resume la experiencia de carga; afecta bounce rate y SEO.",
    watch: "90+ es bueno, 50–89 mejorable, menos de 50 lento.",
  },
  page_views: {
    term: "Page views",
    what: "Cuántas veces se vio una página (una visita puede ver varias).",
    impact: "Muestra qué páginas llaman la atención.",
    watch: "Compáralo con el tiempo y el scroll de esa página: muchas vistas con poco tiempo = no engancha.",
  },
  landing_page: {
    term: "Landing page",
    what: "La primera página que ve una visita al llegar al sitio.",
    impact: "Es la primera impresión: decide si la persona se queda o se va.",
    watch: "El bounce rate de cada landing. Las landings de anuncios deben responder exactamente a lo que prometió el anuncio.",
  },
  seo_strength: {
    term: "SEO strength",
    what: "Calificación de 0 a 100 de qué tan bien cumple un sitio los factores que Google usa para ordenar resultados: contenido, autoridad por enlaces, presencia local, técnico, velocidad y confianza.",
    impact: "Es la causa: un sitio con más fuerza tiene más posibilidades de subir en Google. Se mueve con lo que tú haces (publicar, conseguir enlaces, reseñas).",
    watch: "La brecha contra el líder y en qué factor está. Subir el factor que más pesa (contenido 30, autoridad 25) mueve más la calificación.",
  },
  visibility: {
    term: "Search visibility",
    what: "Qué tan arriba sale el sitio en Google en tus 10 búsquedas objetivo. Lugar 1 en todas = 100; fuera del top 30 = 0.",
    impact: "Es el resultado: aparecer arriba es lo que trae visitas orgánicas y prospectos sin pagar anuncios.",
    watch: "Que suba después de que sube la fuerza SEO. Google tarda semanas en reflejar los cambios.",
  },
  rage_clicks: {
    term: "Rage clicks",
    what: "Varios clics rápidos en el mismo lugar. Es la señal más clara de frustración: algo no respondió como la persona esperaba.",
    impact: "Quien se frustra se va. Si pasa en el formulario o en un botón de contacto, estás perdiendo leads.",
    watch: "Arriba de 3 % de las visitas de una página hay que revisar las grabaciones de esa página en Clarity.",
  },
  dead_clicks: {
    term: "Dead clicks",
    what: "Clics en algo que no hace nada: una imagen, una tarjeta o un texto que parece link y no lo es.",
    impact: "Confunde y distrae. También te dice qué quiere ver la gente (le dan clic porque les interesa).",
    watch: "Qué elemento reciben los clics. Si es algo que interesa, hazlo link; si no, quítale apariencia de botón.",
  },
  quickbacks: {
    term: "Quick backs",
    what: "La persona entra a una página y se regresa en segundos.",
    impact: "La página no era lo que esperaba del link o del anuncio. Cuesta dinero si viene de anuncios.",
    watch: "Más de 8 % en una página de llegada: alinea su título y primer bloque con lo que prometió el anuncio o el link.",
  },
  scroll_depth_clarity: {
    term: "Scroll depth",
    what: "Qué porcentaje de la página baja la gente en promedio.",
    impact: "Lo que queda abajo del promedio casi nadie lo ve: casos, precios o el botón de contacto.",
    watch: "Menos de 40 % en páginas largas: sube lo importante o divide la página.",
  },
  active_time: {
    term: "Active time",
    what: "Tiempo que la persona está realmente moviendo, leyendo o haciendo clic (no solo con la pestaña abierta).",
    impact: "Mide atención real. Más tiempo activo en páginas de servicios suele ir con más contactos.",
    watch: "Compáralo entre páginas: si una página clave tiene poco tiempo activo, no engancha.",
  },
  reach: {
    term: "Reach",
    what: "Cuántas cuentas distintas vieron tu contenido al menos una vez.",
    impact: "Es el tamaño de tu audiencia real en el periodo. Sin alcance no hay interacción ni visitas al perfil.",
    watch: "Que crezca semana a semana. Si cae, revisa la constancia y los formatos que publicas.",
  },
  ig_engagement: {
    term: "Engagement rate",
    what: "Interacciones (likes, comentarios, guardados, compartidos) entre el alcance.",
    impact: "Mide si el contenido le importa a quien lo ve. Instagram muestra más lo que genera interacción.",
    watch: "Compáralo entre formatos y contra tu propio promedio. Los guardados y compartidos valen más que los likes.",
  },
  frequency: {
    term: "Frequency",
    what: "Cuántas veces vio tu anuncio, en promedio, cada persona alcanzada (últimos 28 días).",
    impact: "Muy alta cansa a la audiencia: baja el CTR y sube el costo por lead.",
    watch: "Arriba de 3: cambia la creatividad o amplía la audiencia.",
  },
  cpl: {
    term: "Cost per lead (CPL)",
    what: "Inversión entre leads (formularios y conversaciones iniciadas).",
    impact: "Dice cuánto te cuesta cada prospecto. Junto con la tasa de cierre del CRM dice si el canal es rentable.",
    watch: "Compáralo con tu objetivo (en la configuración) y entre Meta y Google.",
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
