---
name: conversion-medicion
description: "Mide y mejora la conversión de un sitio de negocio pequeño o mediano en Webflow, Framer o HTML (formularios, WhatsApp, teléfono, correo y agenda medidos en GA4, marcados como evento clave e importados a Google Ads y Meta, con UTMs, fricción del formulario y Core Web Vitals); úsalo cuando los leads no se ven en GA4, las campañas no optimizan, el formulario no convierte o el sitio es lento en móvil."
argument-hint: "[URL del sitio] [webflow|framer|html] [--medicion | --velocidad | --formulario | --auditoria]"
---

# Conversión + medición + experiencia técnica

> Hace **visibles** los contactos que el sitio ya genera, los vuelve **señal** para que Google Ads
> y Meta optimicen, quita **fricción** del formulario y saca al sitio del rojo en **velocidad
> móvil**. No es teoría: produce el inventario de conversiones, el snippet que se pega en Webflow
> o Framer, el plan de medición, la verificación en DebugView y un reporte para el dueño.

**Input**: $ARGUMENTS (URL en producción + plataforma + modo)

| Modo | Corre |
|---|---|
| sin bandera | Pasos 1 a 10 completos |
| `--auditoria` | Pasos 1, 2, 7 y 8 en modo lectura: diagnóstico y reporte, sin tocar el sitio |
| `--medicion` | Pasos 1 a 6 y 9 (etiqueta, eventos, evento clave, importación a anuncios, UTMs, verificación) |
| `--formulario` | Paso 7 (fricción) y el evento de envío del paso 3 |
| `--velocidad` | Paso 8 (LCP, INP, CLS) con `scripts/velocidad.py` |

Si tienes un panel de marketing que puntúa al negocio, este skill es el método para subir las
partes de **conversión** y **experiencia técnica**: el panel dice qué falta, aquí está cómo se
arregla y cómo se comprueba.

---

## Verdad de negocio (leer antes de prometerle nada al dueño)

Evidencia con etiqueta y fecha en `references/evidencia.md`. Lo que no se negocia:

- **Medir no crea leads; los hace visibles.** Si el sitio ya recibía 20 contactos al mes y GA4
  marcaba 0, después de este skill marcará ~20. Eso no es crecimiento, es luz. Se dice así.
- **Sin evento de envío no hay optimización.** Google Ads y Meta pujan hacia lo que se les
  reporta. Si solo reciben `form_start` (alguien tocó un campo), optimizan hacia curiosos [O].
- **La medición mejorada de formularios de GA4 no es confiable** en formularios con JS, AJAX o
  multipaso. Caso observado: un formulario multipaso en Framer registró 15 `form_start` y 0
  envíos en GA4; los leads llegaban al correo pero no existían para analítica ni anuncios [E caso,
  n=1]. El envío se mide con un evento propio, verificado en DebugView.
- **La tasa de conversión no tiene "número correcto".** Depende de giro, ticket, tráfico y de
  qué se cuenta. Se compara el sitio **contra sí mismo** antes y después, nunca contra un
  benchmark genérico de internet [S].
- **La velocidad que cuenta es la de campo (CrUX), percentil 75, en móvil.** Lighthouse es
  diagnóstico de laboratorio y varía entre corridas; no se vende un "100 en PageSpeed" [O].
- **Un sitio chico muchas veces no tiene datos de campo.** Entonces se trabaja con laboratorio y
  se declara así en el reporte; no se inventa un dato de CrUX.
- **Velocidad y conversión se correlacionan; la promesa de "+X % de ventas por segundo" no se
  hace.** Los estudios conocidos son de retail grande y patrocinados por Google [E ⚠️].

---

## Cuándo usarlo

- GA4 muestra 0 leads (o solo `form_start`) y el negocio sí recibe contactos.
- Las campañas de Google Ads o Meta "no convierten" o están optimizando a clics.
- Nadie sabe cuántos contactos llegan por WhatsApp o teléfono desde el sitio.
- Los enlaces de Instagram, WhatsApp o el perfil de Google llegan como "Direct" o "Unassigned".
- PageSpeed marca rojo en móvil o Search Console reporta URLs con Core Web Vitals deficientes.
- Antes de lanzar un sitio nuevo: la medición se instala **antes** de la primera campaña.

---

## Flujo (10 pasos)

### 1. Inventario de conversiones
Lista **todas** las formas en que alguien se vuelve contacto desde el sitio: formulario(s),
botón de WhatsApp, `tel:`, `mailto:`, agenda externa (Calendly, Cal.com, Google Forms) y
cualquier embed. `scripts/auditar_medicion.py URL` encuentra lo que está en el HTML crudo; lo
que se inyecta con JS se confirma a mano en el navegador. Cada conversión va a una fila de
`templates/plan-de-medicion.md`. Define con el dueño cuál es la **principal** (la que más vale) y
cuáles son secundarias.

### 2. Verificar la etiqueta
- `auditar_medicion.py` reporta IDs de GA4 (`G-`), contenedores de GTM (`GTM-`), Google Ads
  (`AW-`), píxel de Meta, Clarity y Hotjar en el HTML crudo.
- **Una sola vía por herramienta:** GA4 directo **o** vía GTM, nunca los dos con el mismo ID
  (duplica páginas vistas y eventos).
- Si hay GTM y no aparece `G-`, GA4 probablemente va dentro del contenedor: se confirma con
  Tag Assistant o la vista Realtime.
- `UA-` (Universal Analytics) ya no recoge datos: se quita.
- Dónde se instala en cada plataforma: `references/webflow.md` y `references/framer.md`.

### 3. Evento de envío por plataforma
El evento se dispara **cuando el envío tuvo éxito**, no al hacer clic en el botón:

| Plataforma | Método recomendado | Referencia y snippet |
|---|---|---|
| Webflow, formulario nativo con mensaje de éxito | Observar `.w-form-done` con `MutationObserver` | `references/webflow.md`, `templates/webflow-generate-lead.js` |
| Webflow con Redirect URL | Página de gracias | `templates/gracias-generate-lead.js` |
| Framer | **Página de gracias** (la vía más robusta) | `references/framer.md`, `templates/gracias-generate-lead.js` |
| HTML propio | En el `then` del `fetch` que confirma el envío | `references/ga4-eventos.md` |
| WhatsApp, teléfono, correo | Listener delegado de clic | `references/whatsapp-telefono.md`, `templates/clics-contacto.js` |

Nombres de evento en `references/ga4-eventos.md`: `generate_lead` para el formulario; nombres
propios y estables para clics de contacto. Sin datos personales en los parámetros.

### 4. Marcar como evento clave
En GA4 → Administrar → Eventos (o Eventos clave), marca `generate_lead` y, si el negocio cierra
por WhatsApp, también el clic de WhatsApp. Pocos eventos clave y con sentido; `form_start`,
`scroll` o `page_view` **no** son eventos clave. Sin código: GA4 permite **crear un evento** a
partir de `page_view` de la página de gracias.

### 5. Importar a Google Ads y Meta
- **Google Ads:** vincula GA4 con Ads e importa el evento clave, o usa la etiqueta de conversión
  de Ads (`AW-`). **Una sola acción primaria** por conversión real: si importas de GA4 y además
  tienes la etiqueta de Ads como primaria, cuentas doble.
- **Meta:** píxel con evento estándar `Lead` (formulario) y `Contact` (WhatsApp, teléfono). La
  API de Conversiones (CAPI) se agrega cuando la inversión lo justifica, por integración de socio
  o servidor, con `event_id` compartido para deduplicar. Detalle en `references/ga4-eventos.md`.

### 6. UTMs
Cada enlace que **entra** al sitio desde fuera lleva UTMs con la convención de
`references/utms.md` (bio de Instagram, historias, estados y mensajes de WhatsApp, perfil de
Google). **Nunca** UTMs en enlaces internos. `auditar_medicion.py` marca enlaces internos con UTM
y enlaces a agendas o formularios externos sin UTM.

### 7. Fricción del formulario
Checklist en `references/formularios.md`: campos mínimos, tipos de input correctos para el
teclado del móvil, `autocomplete`, etiquetas visibles, errores en línea, multipaso solo cuando
ayuda, aviso de privacidad, alternativa por WhatsApp y qué pasa después de enviar. El script
cuenta campos y requeridos; la prueba real es **llenarlo en un teléfono**.

### 8. Velocidad (LCP, INP, CLS)
`scripts/velocidad.py URL --estrategia mobile`: datos de campo (CrUX) y de laboratorio con
pasa/no pasa y las oportunidades principales. Umbrales y arreglos típicos en Webflow y Framer en
`references/core-web-vitals.md`. Se arregla primero lo que pesa en la página que recibe el
tráfico de anuncios.

### 9. Verificación
Nada se da por hecho sin verlo llegar:
1. **DebugView** de GA4 (con Tag Assistant o `debug_mode`): haz un envío real y un clic en
   WhatsApp; el evento aparece con sus parámetros y una sola vez.
2. **Realtime**: el evento aparece en la tarjeta de eventos y, una vez marcado, en eventos clave.
3. **Meta Events Manager → Probar eventos**: llega `Lead` y, si hay CAPI, deduplicado.
4. **Google Ads → Conversiones**: el estado pasa a registrando conversiones (puede tardar horas;
   la importación desde GA4 también).
5. Se borra el lead de prueba del CRM o del correo y se anota la hora de la prueba.

### 10. Reporte
`templates/reporte-conversion.md`: qué se medía antes, qué se mide ahora, qué se verificó y
cómo, velocidad antes y después, y lo pendiente. Las cifras de conversión se reportan a partir de
la fecha de instalación; lo anterior se declara como **no medido**, no como cero.

---

## Cómo aplicarlo

### Webflow
- GA4 en Site Settings → Apps & Integrations, **o** gtag/GTM en Custom Code del sitio (head).
  Una sola vía.
- Snippet de envío en Custom Code del sitio (antes de `</body>`) o de la página del formulario.
- El Custom Code requiere plan de sitio pagado y **solo corre en el sitio publicado**, no en el
  Designer.
- Detalle y trampas de `webflow.js`: `references/webflow.md`.

### Framer
- Etiqueta en Site Settings → Custom Code (inicio de `<head>`).
- Formulario: configura la redirección a una página `/gracias` y mide ahí.
- Framer navega sin recargar: el snippet de gracias escucha cambios de ruta. Detalle en
  `references/framer.md`.

### HTML propio
Etiqueta en el `<head>`; evento en la respuesta exitosa del `fetch`, nunca en el `submit`.

---

## Referencias

| Archivo | Para qué |
|---|---|
| `references/ga4-eventos.md` | Nombres de evento, eventos clave, DebugView, medición mejorada, Google Ads y Meta |
| `references/webflow.md` | Formulario nativo, estado de éxito, `MutationObserver`, `webflow.js`, dónde va el código |
| `references/framer.md` | Formularios de Framer, detección de éxito, página de gracias, navegación sin recarga |
| `references/whatsapp-telefono.md` | Medir clics a `wa.me`, `api.whatsapp.com`, `tel:` y `mailto:` |
| `references/utms.md` | Convención de UTMs por canal y cómo caen en los canales de GA4 |
| `references/formularios.md` | Checklist de fricción del formulario |
| `references/core-web-vitals.md` | Umbrales, campo vs laboratorio, arreglos en Webflow y Framer |
| `references/evidencia.md` | Afirmaciones con etiqueta [E]/[O]/[S]/[M], fuente y fecha |
| `templates/` | Snippets JS, plan de medición y reporte |
| `examples/` | Página ficticia con formulario tipo Webflow y respuesta de PageSpeed ficticia |

## Scripts

Python 3, solo biblioteca estándar; cada uno trae `--help`.

| Script | Qué hace |
|---|---|
| `scripts/auditar_medicion.py` | HTML crudo (sin JS): etiquetas GA4/GTM/Ads/Meta/Clarity/Hotjar, formularios y sus campos, WhatsApp/tel/mailto, UTMs, página de gracias. Sale con 1 si hay ERROR |
| `scripts/velocidad.py` | PageSpeed Insights API v5: LCP, INP, CLS de campo y LCP, CLS, TBT de laboratorio con pasa/no pasa y oportunidades |

---

## Anti-patrones

| Anti-patrón | Fix |
|---|---|
| Confiar en `form_start` / `form_submit` automáticos | Evento propio de envío exitoso, verificado en DebugView |
| Disparar el evento en el clic del botón | Dispararlo en el estado de éxito o en la página de gracias |
| Marcar `form_start` o `page_view` como evento clave | Solo acciones que valen dinero |
| GA4 directo y además dentro de GTM | Una sola vía; si no, todo cuenta doble |
| Importar de GA4 y dejar la etiqueta de Ads también como primaria | Una acción primaria por conversión real |
| Nombre, teléfono o correo en parámetros del evento | Nunca datos personales en GA4 |
| UTMs en enlaces internos | Solo en enlaces que entran desde fuera |
| Reportar "0 leads" del periodo anterior | Se declara "no medido" |
| Prometer "100 en PageSpeed" o "+X % de ventas" | Campo, p75, móvil; antes y después del mismo sitio |
| Formulario de 9 campos "por si acaso" | Los campos que el negocio usa para responder; lo demás se pregunta en la llamada |
| Video de fondo pesado en el hero móvil | Imagen o póster; el video se carga después |
| Instalar todo y no probar | Paso 9 completo, con hora de la prueba anotada |
