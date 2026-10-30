# GA4: eventos, eventos clave, verificación e importación a anuncios

> Qué evento se dispara, cuándo, con qué nombre, cómo se vuelve evento clave y cómo llega a
> Google Ads y Meta. Las afirmaciones marcadas **por verificar** dependen de la interfaz o de la
> documentación vigente y se confirman en la cuenta antes de prometerlas.

---

## 1. Nombres de evento

| Conversión | Evento GA4 | Tipo | Parámetros sugeridos |
|---|---|---|---|
| Formulario enviado con éxito | `generate_lead` | Recomendado por Google (generación de leads) [O] | `form_name`, `form_id`, `value`, `currency` (`MXN`), `lead_source` (por verificar en la doc vigente) |
| Clic a WhatsApp | `contact_whatsapp` | Propio | `link_url`, `ubicacion` (hero, footer, flotante) |
| Clic a teléfono | `contact_phone` | Propio | `ubicacion` |
| Clic a correo | `contact_email` | Propio | `ubicacion` |
| Clic a agenda externa | `contact_agenda` | Propio | `link_url` |
| Cita agendada confirmada (si la agenda lo permite) | `generate_lead` con `form_name: "agenda"` | Recomendado | igual que formulario |

Reglas:

- **snake_case, minúsculas, en inglés o en español, pero estable.** Cambiar el nombre parte la
  serie histórica.
- `generate_lead` es el nombre que GA4 sugiere para leads y el que reconocen las plantillas de
  informes [O]. Google documenta además eventos de ciclo de lead (`qualify_lead`,
  `working_lead`, `close_convert_lead` y similares) para cuando el CRM los regresa [O, por
  verificar la lista exacta vigente].
- `form_submit` es el nombre que usa la **medición mejorada** automática. Si usas tu propio
  evento con ese mismo nombre, se mezcla con el automático. Usa `generate_lead`.
- **Nunca** datos personales en parámetros (nombre, correo, teléfono, mensaje). Lo prohíben las
  políticas de Google Analytics [O].
- `value` solo si el negocio tiene un valor razonable por lead (ticket × tasa de cierre). Si no,
  se omite; un valor inventado contamina las pujas.

### Llamada mínima

```js
// gtag directo
gtag('event', 'generate_lead', { form_name: 'contacto', currency: 'MXN', value: 0 });

// GTM: empuja a la capa de datos y crea en GTM una etiqueta "Evento GA4" con disparador
// "Evento personalizado = generate_lead"
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: 'generate_lead', form_name: 'contacto' });
```

Los snippets de `templates/` detectan cuál de las dos vías existe y usan esa.

---

## 2. Medición mejorada: por qué no basta para formularios

GA4 trae "medición mejorada" con interacciones de formulario: `form_start` (primera
interacción con un formulario en la sesión) y `form_submit` (envío) [O]. En la práctica:

- `form_submit` depende del evento `submit` nativo del `<form>`. Formularios que envían por JS
  (AJAX, componentes de React, multipaso, embeds en iframe) pueden **no** disparar ese evento,
  dispararlo aunque la validación falle o dispararlo en cada paso [S, reportado por la comunidad;
  comportamiento exacto por verificar en cada sitio].
- No distingue envío **exitoso** de intento.
- Caso observado: formulario multipaso en Framer, 15 `form_start` y 0 envíos en GA4 mientras los
  leads sí llegaban al correo [E caso propio, n=1].

**Regla:** la medición mejorada se puede dejar encendida para `form_start` (sirve como
indicador de fricción: inicios contra envíos), pero el envío se mide con `generate_lead` propio.
Si su `form_submit` ensucia los informes, apaga solo "Interacciones de formulario" en el flujo
de datos.

---

## 3. Eventos clave

- Desde marzo de 2024 GA4 llama **eventos clave** a lo que antes eran "conversiones"; en Google
  Ads se siguen llamando conversiones [O].
- Se marcan en Administrar → Visualización de datos → Eventos (o Eventos clave). Un evento
  aparece en la lista cuando ya llegó al menos una vez; también se puede crear el evento clave
  anticipando el nombre exacto [O, ruta de menú por verificar].
- Hay un tope de eventos clave por propiedad [O, número por verificar]. No se acerca nunca a él:
  2 a 4 eventos clave en un negocio chico.
- **Crear evento sin código:** Administrar → Eventos → Crear evento, con condición
  `event_name = page_view` y `page_location contiene /gracias` → nuevo evento `generate_lead`.
  Útil cuando no se puede pegar código en la página de gracias [O].
- Un evento clave no es retroactivo: cuenta desde que se marca.

---

## 4. Verificación

| Herramienta | Qué confirma | Cómo |
|---|---|---|
| DebugView | Que el evento llega, una vez, con sus parámetros | Abrir el sitio con Tag Assistant conectado, con la extensión Google Analytics Debugger, o con `debug_mode: true` en el evento; GA4 → Administrar → DebugView [O] |
| Realtime | Que llega en producción, sin modo debug | Informes → Tiempo real, tarjeta "Recuento de eventos" |
| Tag Assistant | Qué etiquetas cargan y en qué orden; GA4 dentro de GTM | tagassistant.google.com [O] |
| Informe de eventos | Que el conteo diario es razonable | Aparece con retraso de horas, no sirve para probar en vivo |

Checklist de prueba (anótala en el reporte con hora):

1. Envío válido del formulario → **un** `generate_lead`.
2. Envío con error de validación → **ningún** `generate_lead`.
3. Clic en cada botón de WhatsApp y teléfono → un evento por clic.
4. Recargar la página de gracias → no debe contar dos veces si el snippet deduplica.
5. Navegar a otra página y volver (Framer) → no debe disparar de nuevo.

---

## 5. Google Ads

Dos caminos; se elige **uno** como primario por cada conversión real:

| Camino | Cuándo | Notas |
|---|---|---|
| Importar el evento clave de GA4 | Negocio chico, una sola fuente de verdad | Vincular GA4 y Ads; Ads → Objetivos → Conversiones → Nueva → Importar → Propiedades de GA4 [O, ruta por verificar]. La importación tiene retraso de horas |
| Etiqueta de conversión de Ads (`AW-XXXXXXXXX/etiqueta`) | Cuando importa la atribución propia de Ads o el retraso de importación estorba | `gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXXXXXX' })` en el mismo punto donde se dispara `generate_lead` |

- Si existen los dos, uno queda como **secundario** (solo observación) para no contar doble.
- **Conversiones mejoradas para leads** envían datos del formulario cifrados (hash) para
  emparejar con usuarios de Google. Requieren aceptar términos y consentimiento adecuado; se
  evalúan cuando ya hay volumen [O, requisitos por verificar].
- La campaña optimiza hacia la acción **primaria** incluida en el objetivo. Revisa que la
  campaña use ese objetivo y no "clics".

---

## 6. Meta (Facebook e Instagram)

| Conversión | Evento estándar del píxel |
|---|---|
| Formulario enviado | `fbq('track', 'Lead')` [O] |
| Clic a WhatsApp, teléfono o correo | `fbq('track', 'Contact')` [O] |
| Cita agendada | `fbq('track', 'Schedule')` [O] |

- El píxel corre en el navegador: bloqueadores y restricciones de navegador le quitan señal.
- **API de Conversiones (CAPI):** envía el mismo evento desde un servidor. Webflow y Framer no
  tienen servidor propio, así que se hace con una integración de socio, con GTM del lado del
  servidor o con un servicio de automatización. Se agrega cuando la inversión en Meta lo
  justifica, no por default [S, criterio].
- **Deduplicación:** si píxel y CAPI mandan el mismo evento, ambos llevan el mismo `event_id` y
  el mismo nombre de evento; Meta descarta el duplicado [O].
  `fbq('track', 'Lead', {}, { eventID: 'lead-<id-unico>' })`.
- Los formularios instantáneos de Meta (lead ads) son otra cosa: el lead se queda en Meta y no
  pasa por el sitio.
- Verificación: Events Manager → Probar eventos.

---

## 7. Consentimiento

En México no hay un esquema de banner equivalente al europeo, pero sí obligación de aviso de
privacidad para datos personales (ver `formularios.md`). Si el sitio recibe tráfico de la Unión
Europea o el cliente ya usa banner, configura Consent Mode de Google y el consentimiento del
píxel antes de disparar eventos [O, alcance legal por verificar con el cliente].
