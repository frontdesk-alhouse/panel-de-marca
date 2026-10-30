# Framer: medir el envío del formulario

> Framer genera un sitio React que navega sin recargar la página. Eso cambia cómo se detecta el
> éxito de un formulario. Recomendación de base: **redirigir a una página de gracias y medir
> ahí**. Lo marcado **por verificar** depende de la versión de Framer o del plan.

---

## 1. Por qué la medición automática falla en Framer

- El formulario de Framer envía con JavaScript. El evento `form_submit` de la medición mejorada
  de GA4 puede no dispararse, o dispararse sin que el envío haya terminado [S, comportamiento
  por verificar en cada sitio].
- Caso observado: formulario multipaso nativo, **15 `form_start` y 0 envíos** en GA4 durante el
  periodo; los leads sí llegaban por correo. Las campañas no tenían evento al cual optimizar
  [E caso propio, n=1].
- Un formulario multipaso muestra y oculta pasos dentro del mismo `<form>`; cada paso puede
  parecer una "interacción" nueva.

## 2. Tres caminos, en orden de robustez

| # | Camino | Ventajas | Contras |
|---|---|---|---|
| 1 | **Redirección a `/gracias`** tras el envío y evento en esa página | No depende de cómo envía Framer; la URL sirve para GA4 ("Crear evento"), Ads y pruebas | Requiere diseñar la página de gracias |
| 2 | **Code component** propio que envía el formulario (a un webhook o servicio) y dispara el evento en la respuesta exitosa | Control total, mensaje en la misma página | Hay que mantener código; el envío ya no es el nativo |
| 3 | Observar el DOM buscando el mensaje de éxito | Sin cambiar el formulario | Frágil: las clases de Framer son generadas y cambian al publicar [S] |

### Camino 1, paso a paso

1. Crea la página `/gracias` (mensaje, siguiente paso, botón de WhatsApp). Exclúyela de buscadores
   en la configuración SEO de la página [por verificar ubicación del ajuste].
2. En el formulario, en la acción de éxito, elige **redirigir** a `/gracias` [O, nombre exacto
   de la opción por verificar en la versión de Framer].
3. Mide con una de dos:
   - **Sin código:** en GA4, Administrar → Eventos → Crear evento: `event_name = page_view` y
     `page_location` contiene `/gracias` → `generate_lead`. GA4 cuenta las navegaciones sin
     recarga como `page_view` si la medición mejorada tiene activo "cambios en el historial del
     navegador" [O].
   - **Con código:** `templates/gracias-generate-lead.js` en el Custom Code del sitio (no solo de
     la página): escucha cambios de ruta y dispara una vez por sesión al llegar a `/gracias`.
4. Varios formularios: redirige a `/gracias-contacto`, `/gracias-cotizacion` o usa un parámetro
   si el formulario lo permite; ajusta `RUTAS_GRACIAS` en el snippet.

### Por qué el snippet va en el código del sitio

Framer cambia de página sin recargar. Un script de `<head>` corre en la **primera** carga; si el
visitante llega a `/gracias` navegando dentro del sitio, el script de página puede no volver a
ejecutarse [por verificar según cómo inyecte Framer el código por página]. El snippet de
gracias resuelve esto escuchando `pushState`, `replaceState` y `popstate`, así que funciona en
ambos casos.

## 3. Dónde va el código

| Lugar | Para qué |
|---|---|
| Site Settings → General → Custom Code → Start of `<head>` | gtag o GTM, píxel de Meta, Clarity |
| Site Settings → Custom Code → End of `<body>` | `gracias-generate-lead.js`, `clics-contacto.js` |
| Page Settings → Custom Code | Opcional; ver la nota de navegación sin recarga |

- Algunas opciones de Custom Code dependen del plan [por verificar].
- Framer tiene analítica propia; es útil para visitas, pero no reemplaza a GA4 como fuente para
  Google Ads ni al píxel para Meta.
- El custom code no corre en la vista previa del editor; prueba en el sitio publicado.

## 4. Trampas conocidas

- **Doble `page_view`:** si además de la medición mejorada agregas un `page_view` manual en
  cada cambio de ruta, cuentas doble.
- **Botones de WhatsApp como componente:** si el componente usa un `<a href="https://wa.me/...">`
  real, `clics-contacto.js` lo detecta. Si abre el enlace con JavaScript sin `<a>`, no hay
  `href` que leer: cambia el componente a un enlace.
- **Enlaces con `target=_blank`:** el clic se mide antes de abrir la pestaña; no hay problema.
- **Varias versiones por breakpoint:** Framer puede renderizar el mismo bloque para escritorio,
  tablet y móvil y ocultar los que no aplican. Si el formulario existe tres veces en el HTML,
  `auditar_medicion.py` lo contará tres veces; no es un error del sitio.
- **Dominio de staging (`.framer.app` o similar):** filtra ese hostname en GA4 igual que en Webflow.
