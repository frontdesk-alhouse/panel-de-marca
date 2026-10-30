# Webflow: medir el envío del formulario

> Cómo funciona el formulario nativo, cómo detectar el éxito y dónde va el código. Lo marcado
> **por verificar** depende de la versión de `webflow.js` o del plan del sitio.

---

## 1. Anatomía del formulario nativo

El HTML publicado de un formulario nativo se ve así (simplificado):

```html
<div class="w-form">
  <form id="wf-form-Contacto" name="wf-form-Contacto" data-name="Contacto" method="get"
        redirect="/gracias" data-redirect="/gracias">
    <input type="text" name="Nombre" data-name="Nombre" required>
    <input type="submit" value="Enviar" data-wait="Enviando...">
  </form>
  <div class="w-form-done" tabindex="-1" role="region"><div>¡Gracias!</div></div>
  <div class="w-form-fail" tabindex="-1" role="region"><div>Algo salió mal.</div></div>
</div>
```

- `webflow.js` intercepta el `submit`, valida, envía por AJAX a Webflow (o al `action` que
  definiste) y, según la respuesta, **oculta el formulario y muestra `.w-form-done`** o muestra
  `.w-form-fail` [O, comportamiento observado en sitios publicados].
- `redirect` / `data-redirect` aparecen cuando en Form Settings defines un **Redirect URL**: en
  ese caso, tras el éxito, el navegador va a esa página [O].
- `data-name` es el nombre que verás en Webflow → Forms; úsalo como `form_name`.
- Con un `action` externo (Zapier, Make, un backend propio) el manejo de `webflow.js` cambia
  según la configuración [por verificar en tu sitio: prueba si `.w-form-done` se muestra].

## 2. Detectar el éxito: dos caminos

| Camino | Cuándo | Snippet |
|---|---|---|
| **Página de gracias** (Redirect URL) | Siempre que el diseño lo permita. Más robusto, medible sin código con "Crear evento" en GA4, y sirve como URL para Ads | `templates/gracias-generate-lead.js` |
| **Observar `.w-form-done`** | El diseño pide el mensaje en la misma página | `templates/webflow-generate-lead.js` |

### Por qué `MutationObserver` y no el `submit`

- El `submit` ocurre **antes** de saber si el envío funcionó; un error de validación o de red
  también dispara `submit`.
- `webflow.js` cambia el `style` de `.w-form-done` (de `display: none` a `display: block`) solo
  en el éxito. Observar ese cambio es la señal más cercana a "lead recibido" que tienes sin
  servidor.
- El snippet observa todos los `.w-form-done` de la página, dispara una sola vez por bloque y
  toma el nombre del formulario hermano.

### Alternativas que no se recomiendan

- `$(document).ajaxComplete` con jQuery: depende de que `webflow.js` siga usando jQuery para el
  envío [por verificar]; frágil ante actualizaciones.
- Clic en el botón de enviar: cuenta intentos, no envíos.
- Interacciones de Webflow (IX) para disparar eventos: no exponen el éxito del envío.

## 3. Dónde va el código

| Lugar | Para qué | Notas |
|---|---|---|
| Site Settings → Apps & Integrations → Google Analytics | Pegar el ID `G-` | Webflow inserta gtag por ti [O, ubicación del campo por verificar]. No lo combines con gtag manual ni con GA4 en GTM |
| Site Settings → Custom Code → Head | GTM o gtag manual, píxel de Meta, Clarity | Un solo lugar por herramienta |
| Site Settings → Custom Code → Footer (antes de `</body>`) | `webflow-generate-lead.js` y `clics-contacto.js` | Corre en todas las páginas |
| Page Settings → Custom Code (antes de `</body>`) | `gracias-generate-lead.js` en la página de gracias | Solo esa página |
| Embed | Evítalo para scripts de medición | Se pierde fácil al rediseñar |

- El Custom Code requiere **plan de sitio pagado** y solo corre en el sitio **publicado**, no en
  el Designer ni en la vista previa [O].
- Hay un límite de caracteres por campo de Custom Code [O, número por verificar]. Los snippets de
  `templates/` caben de sobra; quita los comentarios si te acercas al límite.
- Webflow carga jQuery y `webflow.js` en todas las páginas; tus scripts en el footer corren
  después del HTML, así que los elementos ya existen.

## 4. Página de gracias en Webflow

1. Crea `/gracias` con mensaje, siguiente paso (tiempo de respuesta, botón de WhatsApp) y
   `noindex` (Page Settings → SEO; excluir del sitemap).
2. Form Settings → Redirect URL → `/gracias`.
3. Pega `gracias-generate-lead.js` en el Custom Code de esa página, **o** en GA4 crea el evento
   `generate_lead` desde `page_view` con `page_location` que contiene `/gracias`.
4. Si hay varios formularios, usa `/gracias?f=contacto`, `/gracias?f=cotizacion`: el snippet lee
   `f` como `form_name`.

## 5. Trampas conocidas

- **Doble GA4:** ID en Apps & Integrations **y** gtag en Custom Code. Todo cuenta doble.
- **Staging:** el sitio `.webflow.io` también corre el código. Filtra ese hostname en GA4
  (Administrar → Flujos de datos → Configurar etiqueta → Lista de referencias no deseadas o
  filtro de datos internos) o carga la etiqueta solo si `location.hostname` es el dominio real.
- **Spam:** los envíos de bots también muestran `.w-form-done`. Activa el filtro de spam de
  Webflow (reCAPTCHA o el honeypot que ofrezca el plan) [por verificar opciones vigentes].
- **Formularios en componentes o CMS:** el snippet usa `querySelectorAll` al cargar; si un
  formulario aparece después (modal, tab), el observador global del snippet también lo cubre.
