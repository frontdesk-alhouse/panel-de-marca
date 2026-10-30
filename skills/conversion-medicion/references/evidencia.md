# Conversión, medición y velocidad: base de evidencia (corte 2026-10-29)

> Qué está documentado, qué es criterio y qué es mito. El resto del skill apunta aquí cuando
> necesita justificar una afirmación ante el dueño del negocio.

**Etiquetas.** [E] evidenciado por estudio o caso medido (casi siempre correlacional) · [O]
oficial de la plataforma · [S] especulativo, criterio propio o reporte de comunidad sin estudio ·
[M] mito o promesa que no se sostiene · ⚠️ estudio patrocinado por una parte interesada o
conocido por cobertura secundaria · **por verificar**: la fuente o el detalle exacto no se
confirmó al corte; se revisa antes de citarlo hacia fuera.

Regla del archivo: solo se pone URL cuando la fuente se conoce con certeza. Si no, se nombra el
documento y se marca **por verificar**. Una URL inventada es peor que ninguna.

---

## 1. Core Web Vitals y velocidad

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| Umbrales: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 como "bueno", evaluados en el percentil 75 por dispositivo | [O] | web.dev, "Web Vitals". https://web.dev/articles/vitals |
| Cómo se eligieron los umbrales y por qué el percentil 75 | [O] | web.dev, "Defining the Core Web Vitals metrics thresholds". https://web.dev/articles/defining-core-web-vitals-thresholds |
| INP reemplazó a FID como Core Web Vital el 2024-03-12 | [O] | web.dev, anuncio de INP como Core Web Vital (marzo 2024). https://web.dev/articles/inp (artículo de la métrica; URL del anuncio por verificar) |
| Lighthouse no mide INP; TBT es la aproximación de laboratorio | [O] | web.dev, artículos de INP y TBT; documentación de Lighthouse |
| PageSpeed Insights combina datos de campo (CrUX, 28 días) y de laboratorio (Lighthouse) | [O] | Google for Developers, "About PageSpeed Insights". https://developers.google.com/speed/docs/insights/v5/about |
| API v5 de PageSpeed Insights: endpoint `runPagespeed`, parámetro `strategy`, clave opcional con cuota baja sin ella | [O] | Google for Developers, "Get Started with the PageSpeed Insights API". https://developers.google.com/speed/docs/insights/v5/get-started |
| Sitios con poco tráfico no tienen datos de CrUX | [O] | Documentación de CrUX (Chrome for Developers), criterios de elegibilidad, por verificar URL |
| Core Web Vitals son parte de los sistemas de experiencia de página, no compensan relevancia | [O] | Google Search Central, documentación de experiencia de página, por verificar URL vigente |
| Mejorar 0.1 s la carga móvil se asoció a +8.4 % de conversiones en retail y +10.1 % en viajes | [E] ⚠️ | Deloitte para Google, "Milliseconds Make Millions" (2020). Encargado por Google, marcas grandes, Europa y EE. UU. Sirve para decir "la velocidad importa", no para prometer cifras a un negocio local |
| "53 % de las visitas móviles abandona si la página tarda más de 3 s" | [M como promesa] | Cifra de Google/SOASTA (2016-2017) muy repetida; metodología pública limitada. No se cita al cliente como dato duro |
| Elementos que arrancan con `opacity: 0` y entran con animación retrasan el LCP | [S] | Mecanismo conocido de cómo el navegador elige el candidato LCP; el efecto se mide caso por caso |

## 2. GA4 y eventos

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| `generate_lead` es evento recomendado para generación de leads, con `value` y `currency` | [O] | Google Analytics, referencia de eventos recomendados. https://developers.google.com/analytics/devguides/collection/ga4/reference/events |
| Existen eventos recomendados de ciclo de lead (`qualify_lead`, `working_lead`, `close_convert_lead`, etc.) | [O] | Google Analytics Help, eventos recomendados de generación de leads, por verificar lista y URL |
| La medición mejorada incluye `form_start` y `form_submit` | [O] | Google Analytics Help, "Enhanced measurement events". https://support.google.com/analytics/answer/9216061 |
| `form_submit` automático no es confiable en formularios AJAX, de JS o multipaso | [S] | Reportes recurrentes de la comunidad de analítica; comportamiento por verificar sitio por sitio |
| Formulario multipaso en Framer: 15 `form_start`, 0 envíos en GA4, leads llegando por correo | [E] caso propio, n=1 | Observado en un sitio de negocio local en 2026; anonimizado |
| "Conversiones" de GA4 pasaron a llamarse "eventos clave" en 2024 | [O] | Google Analytics Help, artículo sobre eventos clave, por verificar URL |
| DebugView muestra eventos en tiempo real con modo debug activo | [O] | Google Analytics Help, "DebugView". https://support.google.com/analytics/answer/7201382 |
| Se pueden crear eventos nuevos desde eventos existentes con condiciones en la interfaz | [O] | Google Analytics Help, "Create or modify events", por verificar URL |
| No se envía información de identificación personal a Google Analytics | [O] | Términos y políticas de Google Analytics, por verificar URL |
| Canales predeterminados: "Organic Social" por fuente en lista social o medio `social` y variantes | [O] | Google Analytics Help, "Default channel group", por verificar reglas exactas vigentes |

## 3. Google Ads y Meta

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| Los eventos clave de GA4 se pueden importar como conversiones de Google Ads | [O] | Google Ads Help, importar conversiones de GA4, por verificar URL |
| Las campañas pujan hacia las acciones de conversión primarias del objetivo | [O] | Google Ads Help, conversiones primarias y secundarias, por verificar URL |
| Eventos estándar del píxel de Meta: `Lead`, `Contact`, `Schedule` y otros | [O] | Meta for Developers, referencia del píxel. https://developers.facebook.com/docs/meta-pixel/reference |
| Píxel y API de Conversiones se deduplican con el mismo `event_name` y `event_id` | [O] | Meta for Developers, deduplicación de eventos del píxel y del servidor, por verificar URL vigente |
| Para un negocio chico, CAPI se justifica con inversión sostenida en Meta | [S] | Criterio; depende de volumen y presupuesto |

## 4. Webflow y Framer

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| Formulario nativo de Webflow muestra `.w-form-done` en éxito y `.w-form-fail` en error | [O] | Comportamiento del HTML publicado; Webflow University / Help Center, formularios, por verificar URL |
| Webflow permite Redirect URL tras el envío | [O] | Webflow Help Center, configuración del formulario, por verificar URL |
| Custom Code de Webflow requiere plan de sitio y corre solo en el sitio publicado | [O] | Webflow Help Center, custom code, por verificar URL |
| Imágenes de Webflow: variantes responsivas y opción Eager/Lazy por imagen | [O] | Webflow Help Center, imágenes responsivas y carga diferida, por verificar URL |
| Framer permite redirigir a una página tras enviar un formulario | [O] | Documentación de Framer, formularios, por verificar nombre de la opción y URL |
| Framer navega sin recargar; GA4 cuenta esas vistas si "cambios en el historial" está activo | [O] / [S] | GA4 medición mejorada [O]; comportamiento de Framer observado [S] |

## 5. Formularios y conversión

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| Menos campos tienden a más envíos | [S] | Consenso de práctica; los casos públicos famosos son anecdóticos y sin control. Se verifica con antes/después del propio sitio |
| Formularios de checkout promedio tienen más campos de los necesarios | [E] ⚠️ | Baymard Institute, investigación de usabilidad de checkout (ecommerce, no leads), por verificar cifras vigentes |
| Texto de input menor a 16 px provoca zoom automático en iOS al enfocar | [S] | Comportamiento conocido de Safari en iOS, por verificar versión vigente |
| Tamaño mínimo de objetivo táctil: 24×24 CSS px (WCAG 2.2 AA); recomendaciones de plataforma 44 a 48 px | [O] | W3C WCAG 2.2, criterio 2.5.8. https://www.w3.org/TR/WCAG22/ |
| En México, quien recaba datos personales debe dar aviso de privacidad (ley federal de protección de datos en posesión de particulares, nueva ley publicada en 2025) | [O] | Diario Oficial de la Federación, por verificar fecha exacta y requisitos con asesoría legal |

## 6. Mitos y ventas que no se hacen

| Afirmación | Etiqueta | Por qué |
|---|---|---|
| "Con esto vas a tener más leads" | [M] | Medir hace visibles los leads que ya había; el crecimiento viene después, de optimizar sobre señal correcta |
| "Tu tasa de conversión debería ser 3 %" | [M] | No hay número universal; depende de giro, ticket, tráfico y qué se cuenta |
| "100 en PageSpeed" | [M] | Laboratorio, inestable y sin relación directa con ventas |
| "Cada segundo menos = +X % de ventas" para un negocio local | [M] | Los estudios son de retail grande y patrocinados |
| "GA4 ya mide los formularios solo" | [M] | La medición mejorada no distingue éxito y falla en formularios con JS |
| "Más eventos clave = más datos para Ads" | [M] | Ads optimiza hacia lo primario; eventos clave triviales diluyen la señal |
| "WhatsApp no se puede medir" | [M] | El clic sí; el chat se cierra con mensaje prellenado y conteo |

## 7. Pendientes de verificación

Antes de usar este skill de cara a un cliente, revisa en la documentación vigente:

1. Ruta de menú exacta de eventos clave y creación de eventos en GA4.
2. Límite de eventos clave por propiedad.
3. Lista vigente de fuentes sociales en los canales predeterminados de GA4 (¿incluye WhatsApp?).
4. Nombre de la opción de redirección en formularios de Framer.
5. Límite de caracteres del Custom Code en Webflow según plan.
6. Requisitos de conversiones mejoradas para leads en Google Ads.
