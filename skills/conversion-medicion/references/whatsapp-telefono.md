# WhatsApp, teléfono y correo: medir el clic

> En México y buena parte de LatAm, muchos negocios cierran por WhatsApp y no por formulario.
> Si ese clic no se mide, el canal que más vende es invisible para GA4 y para los anuncios.

---

## 1. Qué se mide y qué no

- Se mide el **clic** que abre WhatsApp, el marcador o el correo. No se mide si la persona
  escribió, llamó o envió: eso pasa fuera del sitio.
- Por eso el clic es un **micro-evento clave**: buen indicador, no lead confirmado. En el reporte
  se nombra "intención de contacto por WhatsApp", no "lead".
- Para cerrar el ciclo: mensaje prellenado con un código corto (ver §4) y conteo manual o por
  etiqueta en WhatsApp Business de cuántos chats llegaron con ese código.

## 2. Enlaces que se detectan

| Tipo | Formas de `href` |
|---|---|
| WhatsApp | `https://wa.me/52XXXXXXXXXX`, `https://api.whatsapp.com/send?phone=...`, `whatsapp://send?...`, `https://wa.link/...` (acortador) |
| Teléfono | `tel:+52XXXXXXXXXX` |
| Correo | `mailto:hola@ejemplo.com` |

- Formato de número para México en `wa.me`: código de país `52` + 10 dígitos, sin `+`, espacios
  ni guiones [O].
- Un botón que abre WhatsApp con JavaScript sin `<a href>` no se puede medir con el listener
  delegado: conviértelo en enlace.

## 3. Listener delegado

`templates/clics-contacto.js` escucha **un** clic en el `document` (fase de captura) y sube con
`closest('a')` hasta el enlace. Ventajas:

- Cubre botones que se agregan después (modales, CMS, componentes de Framer) sin volver a
  enganchar nada.
- Un solo script para todo el sitio.
- Lee `data-ubicacion` del enlace o de un contenedor (`hero`, `footer`, `flotante`) para saber
  qué botón funciona mejor. Si no existe, intenta deducirlo del `<header>`, `<footer>` o
  `<section id>` más cercano.

Eventos que dispara (ver `ga4-eventos.md`): `contact_whatsapp`, `contact_phone`,
`contact_email`, y en Meta `Contact`.

¿Llega el evento antes de que el navegador abra la app? gtag envía con mecanismos pensados para
sobrevivir a la navegación [O, detalle de transporte por verificar]. `tel:` y `mailto:` no
descargan la página. Comprueba en DebugView.

### Alternativa sin código (GTM)

Disparador "Clic: solo enlaces" con condición `Click URL` contiene `wa.me` o empieza con `tel:`
→ etiqueta "Evento GA4". Equivale al listener; usa uno u otro, no los dos.

## 4. Mensaje prellenado

`https://wa.me/52XXXXXXXXXX?text=Hola%2C%20vengo%20del%20sitio%20(WEB)`

- El texto ayuda a quien responde a saber de dónde viene el chat y deja una huella contable.
- Códigos distintos por origen: `(WEB)`, `(WEB-ADS)` si la página es de campaña.
- Codifica el texto en URL (`%20` para espacios). El auditor marca enlaces de WhatsApp sin
  `text=` como INFO.

## 5. Teléfono en móvil y escritorio

- En escritorio, `tel:` puede abrir una app que el usuario no usa. Muestra el número como texto
  legible además del enlace.
- Si el negocio usa un número de seguimiento de llamadas (call tracking), el número del sitio
  cambia por fuente; se mide en esa herramienta y el clic sigue midiéndose aquí.

## 6. Verificación

1. DebugView: un clic en cada botón (hero, flotante, footer) → un evento con `ubicacion`.
2. En móvil real: el clic abre WhatsApp y el evento aparece en Realtime.
3. Meta Events Manager → Probar eventos: llega `Contact`.
