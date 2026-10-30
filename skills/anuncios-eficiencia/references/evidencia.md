# Anuncios: base de evidencia (corte 2026-10-29)

> Qué sostiene cada afirmación del skill, separado por fuerza de evidencia. Las plataformas cambian
> nombres de menús, umbrales y requisitos varias veces al año: lo marcado **por verificar** se
> confirma en la ayuda oficial o en la cuenta antes de decírselo al dueño.

**Etiquetas.** [E] estudio o dato publicado con método (casi siempre de otro mercado; se dice
cuál) · [O] oficial de la plataforma (Ayuda de Google Ads, Centro de ayuda para empresas de Meta,
documentación de la API) · [S] señal: regla práctica, observación de campo o inferencia nuestra,
sin estudio detrás · [M] mito o contradicho por la documentación.

Las fuentes oficiales se citan por **título del artículo y sitio**, sin número de artículo, porque
las URLs de ayuda cambian. Los títulos van en español como referencia aproximada; el título exacto
puede variar por idioma y versión. Búscalas por título en `support.google.com/google-ads`,
`developers.google.com/google-ads/api` y `facebook.com/business/help`.

---

## 1. Encuadre honesto

| Afirmación | Etiqueta | Fuente |
|---|---|---|
| Ninguna plataforma garantiza resultados; las estrategias automáticas optimizan hacia el objetivo y los datos que reciben | [O] | Ayuda de Google Ads, "Acerca de Smart Bidding"; Meta, "Acerca de la fase de aprendizaje" |
| Los benchmarks de CPC, CTR y CPL publicados por herramientas de anuncios son mayormente de cuentas de Estados Unidos y mezclan industrias y tamaños | [E] | WordStream / LocaliQ, informes anuales de benchmarks de Google Ads y Facebook Ads (datos de cuentas de EE. UU.) |
| El CPL útil sale del margen y la tasa de cierre del negocio, no de un promedio | [S] aritmética | `costo-objetivo.md` |
| "Un ROAS de 4× es bueno" en general | [M] | Depende del margen: con margen de 20 % el equilibrio es 5× (1 ÷ 0.20) |
| La atribución de la plataforma no es igual a ventas reales; se cruza con CRM | [O] + [S] | Ayuda de Google Ads, "Acerca de los modelos de atribución"; Meta, "Acerca de la configuración de atribución" |

## 2. Google Ads

| Afirmación | Etiqueta | Fuente y fecha |
|---|---|---|
| Acceso a la API vía proyecto de Google Cloud; el requisito de developer token se retiró el 2026-09-09 | [O] **por verificar** | Comunicado de Google Ads API (2026); confirmar en `developers.google.com/google-ads/api` antes de dar instrucciones |
| Hay un servidor MCP de Google Ads de código abierto publicado por Google | [O] **por verificar** alcance (lectura) | Repositorio oficial de Google Ads en GitHub |
| Tres concordancias: amplia, frase y exacta; la amplia modificada se retiró en 2021 | [O] 2021 | Ayuda de Google Ads, "Acerca de las opciones de concordancia de palabras clave" |
| Google recomienda usar concordancia amplia junto con Smart Bidding | [O] | Ayuda de Google Ads, "Acerca de la concordancia amplia" |
| El informe de términos de búsqueda muestra las búsquedas reales que activaron anuncios | [O] | Ayuda de Google Ads, "Acerca del informe de términos de búsqueda" |
| Las palabras clave negativas no coinciden con variantes cercanas; hay que agregar plurales y variantes | [O] | Ayuda de Google Ads, "Acerca de las palabras clave negativas" |
| Acciones de conversión principales vs secundarias: solo las principales entran a la puja | [O] | Ayuda de Google Ads, "Acerca de las acciones de conversión principales y secundarias" |
| Conversiones mejoradas mejoran la medición con datos de primera parte cifrados | [O] | Ayuda de Google Ads, "Acerca de las conversiones mejoradas" |
| CPA objetivo funciona mejor con historial; Google ha sugerido del orden de 30 conversiones en 30 días | [O] **por verificar** umbral vigente | Ayuda de Google Ads, "Acerca del CPA objetivo" y materiales de Smart Bidding |
| Cambios de estrategia o de presupuesto grandes abren un periodo de aprendizaje de la estrategia | [O] | Ayuda de Google Ads, "Estado de la estrategia de oferta: aprendizaje" |
| PMax necesita objetivos de conversión y reparte entre todo el inventario de Google | [O] | Ayuda de Google Ads, "Acerca de las campañas de máximo rendimiento" |
| Negativas a nivel campaña disponibles en PMax desde 2025 | [O] **por verificar** disponibilidad | Anuncio de Google Ads (2025) |
| PMax captura búsquedas de marca que ya eran del negocio si no se excluyen | [S] observación de campo, ampliamente reportada | Ayuda de Google Ads, "Exclusiones de marca en máximo rendimiento" (la existencia de la función es [O]) |
| Ubicación "Presencia" vs "Presencia o interés" | [O] | Ayuda de Google Ads, "Acerca de las opciones de segmentación por ubicación avanzadas" |
| Amplia + CPC manual sin negativas quema presupuesto en cuentas chicas | [S] | Observación de auditorías; la mecánica (amplia = búsquedas relacionadas) es [O] |

## 3. Meta Ads

| Afirmación | Etiqueta | Fuente y fecha |
|---|---|---|
| Seis objetivos: Reconocimiento, Tráfico, Interacción, Clientes potenciales, Promoción de la app, Ventas | [O] 2022 | Centro de ayuda para empresas de Meta, "Acerca de los objetivos del Administrador de anuncios" |
| La entrega se optimiza hacia el evento elegido (clics, mensajes, leads, compras) | [O] | Meta, "Acerca de la optimización de la entrega de anuncios" |
| Fase de aprendizaje: ~50 eventos de optimización por conjunto en 7 días tras el último cambio significativo | [O] | Meta, "Acerca de la fase de aprendizaje" |
| Cambios significativos (presupuesto, puja, segmentación, creatividad, pausa de 7+ días) reinician el aprendizaje | [O] | Meta, "Acerca de la fase de aprendizaje" |
| "Aprendizaje limitado" cuando el conjunto no junta suficientes eventos | [O] | Meta, "Acerca del aprendizaje limitado" |
| API de Conversiones complementa al píxel y recupera eventos perdidos por el navegador; deduplicar con `event_id` | [O] | Meta, "Acerca de la API de Conversiones"; documentación de deduplicación |
| Advantage+ (audiencia, ubicaciones, presupuesto de campaña) automatiza la distribución | [O] | Meta, "Acerca de Advantage+" |
| Formularios instantáneos, opción de "mayor intención" con pantalla de revisión | [O] | Meta, "Acerca de los formularios instantáneos" |
| Anuncios que dirigen a WhatsApp (clic a mensaje), resultado = conversaciones iniciadas | [O] | Meta, "Acerca de los anuncios que dirigen a WhatsApp" |
| MCP oficial de Meta Ads en `https://mcp.facebook.com/ads` | [O] **por verificar** disponibilidad y permisos por cuenta | Anuncio de Meta (2026) |
| Publicaciones promocionadas con "visitas" dan clics baratos (~$0.40-$1.00 MXN) y casi 0 leads | [S] observación de campo en cuentas mexicanas | La mecánica (optimiza a clics) es [O] |
| Subir presupuesto 15-20 % por paso para no reiniciar el aprendizaje | [S] regla práctica | Meta solo dice que los cambios "significativos" reinician; el porcentaje exacto no está publicado |

## 4. Mitos

| Mito | Etiqueta | Por qué |
|---|---|---|
| "Más clics = más ventas" | [M] | Meta y Google optimizan a lo que pides; pedir clics trae gente que da clic |
| "Smart Bidding funciona sin conversiones" | [M] | Sin conversiones no hay señal que optimizar [O] |
| "Promocionar el post es lo mismo que una campaña de leads" | [M] | Objetivo y evento de optimización distintos [O] |
| "Hay que tocar las campañas todos los días" | [M] | Los cambios reinician aprendizaje [O] |
| "El CPL promedio de mi industria es X, así que voy bien" | [M] | El promedio es de otro mercado y otro margen |
| "PMax es lo mejor para cualquier negocio" | [M] | Requiere conversión y presupuesto; con poco, Búsqueda controla mejor [S] |

## Cómo agregar evidencia

Fila nueva con: afirmación, etiqueta, fuente (título exacto y sitio, o estudio con autor, fecha,
muestra y mercado). Si no se puede confirmar que la fuente existe, va como **por verificar** y no
se usa para prometer nada.
