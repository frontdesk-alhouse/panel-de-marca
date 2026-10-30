# Core Web Vitals: umbrales, campo vs laboratorio y arreglos en Webflow y Framer

> Qué se mide, cuál dato manda y qué se arregla primero en un sitio hecho con constructor.

---

## 1. Umbrales [O]

| Métrica | Mide | Bueno | Necesita mejora | Malo |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Cuándo se pinta el elemento grande del primer pantallazo | ≤ 2.5 s | 2.5 a 4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | Qué tan rápido responde la página a toques y clics | ≤ 200 ms | 200 a 500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | Cuánto brinca el contenido mientras carga | ≤ 0.1 | 0.1 a 0.25 | > 0.25 |

- Se evalúan en el **percentil 75** de las visitas reales, separado móvil y escritorio. Una
  página "pasa" si las tres están en bueno [O].
- **INP reemplazó a FID** como Core Web Vital el 2024-03-12 [O].
- Métricas de apoyo (no son Core Web Vitals): FCP, TTFB, TBT, Speed Index.

## 2. Campo contra laboratorio

| | Campo (CrUX) | Laboratorio (Lighthouse) |
|---|---|---|
| De dónde sale | Visitas reales de Chrome, ventana móvil de 28 días [O] | Una carga simulada en un servidor de Google |
| Qué dice | Lo que vivieron tus usuarios | Por qué es lento y qué arreglar |
| INP | Sí | **No**; usa TBT como aproximación [O] |
| Estabilidad | Cambia despacio | Varía entre corridas |
| Cuándo falta | Sitios con poco tráfico: "datos insuficientes" [O] | Siempre hay |

Reglas del skill:

- **El veredicto es de campo.** Si hay CrUX de la URL, manda la URL; si no, el del origen; si
  tampoco, se declara "sin datos de campo" y se trabaja con laboratorio.
- **El puntaje de Lighthouse (0-100) no es Core Web Vitals.** Sirve para priorizar, no para
  prometer. Dos corridas seguidas pueden diferir varios puntos.
- Los arreglos tardan hasta 28 días en reflejarse completos en CrUX y en Search Console.
- Search Console → Experiencia → Core Web Vitals agrupa URLs parecidas; es la vista para el dueño.

`scripts/velocidad.py URL --estrategia mobile` trae los dos lados en una corrida.

## 3. Qué suele romper cada métrica en un sitio de constructor

### LCP (casi siempre el hero)

| Causa | Webflow | Framer |
|---|---|---|
| Imagen del hero pesada o en PNG | Sube WebP o AVIF del tamaño real; Webflow genera variantes responsivas para imágenes de `<img>` [O]; los fondos CSS no tienen `srcset` | Framer sirve imágenes redimensionadas; aun así sube el archivo al tamaño máximo en que se muestra [S] |
| Imagen del hero con carga diferida | En el elemento de imagen, `Load: Eager` para el hero; el resto `Lazy` [O] | Revisa que la imagen del primer pantallazo no esté marcada como diferida [por verificar ajuste] |
| Hero como fondo CSS | El navegador la descubre tarde; usa `<img>` con `object-fit` | Igual: preferir imagen a fondo |
| Video de fondo en el hero | Sustituir en móvil por póster; el video no debe ser el LCP | Igual |
| Animación de entrada en el hero | Interacciones que arrancan en `opacity: 0` retrasan el pintado del elemento [S, mecanismo; medir caso por caso] | Los efectos "Appear" en el título o imagen del hero retrasan el LCP; quítalos del primer pantallazo [S] |
| Fuentes | Pocas familias y pesos; `font-display: swap` en fuentes subidas [por verificar opción en el panel] | Pocas familias; fuentes del sistema en textos largos |
| Scripts de terceros en `<head>` | Chat, widgets, mapas, píxeles síncronos: muévelos al footer o cárgalos con `defer` | Igual en Custom Code |

### INP

- Widgets de chat, mapas embebidos, carruseles con mucho JS, y en Framer componentes con muchos
  efectos de scroll o cursor.
- Etiquetas de terceros acumuladas en GTM. Revisa el contenedor y quita las muertas.
- Menús móviles con animaciones largas antes de responder.

### CLS

- Imágenes y embeds sin dimensiones (`width`/`height` o `aspect-ratio`).
- Banners de cookies, barras de aviso o chats que empujan el contenido al aparecer: que se
  superpongan, no que empujen.
- Fuentes web que cambian el tamaño del texto al cargar.
- Contenido inyectado arriba (testimonios, contadores) después del primer pintado.

## 4. Orden de trabajo

1. Corre `velocidad.py` en móvil sobre la página que recibe tráfico de anuncios y la home.
2. Identifica el elemento LCP (la salida lo dice cuando Lighthouse lo reporta) y arréglalo
   primero: tamaño, formato, `eager`, sin animación de entrada.
3. Quita o difiere terceros que no venden (widgets duplicados, píxeles de herramientas que ya
   no se usan, chats que nadie contesta).
4. Ajusta CLS con dimensiones explícitas.
5. Vuelve a correr el script y anota antes/después en el reporte. Repite a 28 días para ver el
   dato de campo.

## 5. Lo que no se promete

- "100 en PageSpeed": irrelevante para el negocio y no estable.
- "Subir en Google por velocidad": Core Web Vitals son una señal más dentro de experiencia de
  página; no compensan contenido ni relevancia [O].
- Porcentajes de ventas por segundo: ver `evidencia.md`.
