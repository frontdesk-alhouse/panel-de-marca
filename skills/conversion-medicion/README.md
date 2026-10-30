# conversion-medicion

Skill de Claude (Claude Code o la app de Claude) para **medir y mejorar la conversión** de sitios
de negocios pequeños y medianos hechos con Webflow, Framer o HTML propio, con foco en México y
LatAm: que cada formulario, clic a WhatsApp o llamada llegue a GA4 como evento clave, se importe
a Google Ads y Meta, tenga UTMs coherentes, que el formulario no espante a nadie y que el sitio
no esté en rojo en velocidad móvil.

[English version](README.en.md)

## Para quién

- Estudios y freelancers que entregan sitios en Webflow o Framer y quieren dejar la medición
  bien puesta antes de la primera campaña.
- Dueños de negocio o equipos de marketing que ven "0 conversiones" en GA4 mientras sí les llegan
  contactos.
- Cualquiera con un panel de marketing que puntúa **conversión** y **experiencia técnica** y
  necesita el método para subir esas dos partes.

## El caso que lo originó

Un formulario multipaso en Framer registró **15 `form_start` y 0 envíos** en GA4. Los leads sí
llegaban por correo, pero para GA4 y para las campañas no existían: los anuncios no tenían a qué
optimizar. Además: eventos clave en sus valores por defecto, LCP móvil en rojo, clics a WhatsApp
y teléfono sin medir y enlaces de redes sin UTMs. El skill es el procedimiento para que eso no
vuelva a pasar.

## Qué NO promete

- **Medir no crea leads; los hace visibles.** El "aumento" del primer mes es luz, no crecimiento.
- **No hay tasa de conversión "correcta".** Se compara el sitio contra sí mismo, antes y después.
- **No hay "100 en PageSpeed".** El veredicto es de campo (CrUX, p75, móvil).
- **Ninguna cifra de "+X % de ventas por segundo".** Los estudios conocidos son de retail grande
  y patrocinados.
- **Un clic a WhatsApp no es un lead confirmado.** Es intención de contacto, y así se reporta.

## Instalación

```bash
git clone <url-del-repo> conversion-medicion
cd conversion-medicion
bash install.sh
```

`install.sh` copia la carpeta a `~/.claude/skills/conversion-medicion/`, verifica `python3` e
imprime cómo invocarlo. Es idempotente y no descarga nada. Alternativa manual: copia la carpeta
tal cual a `~/.claude/skills/conversion-medicion/`. En la app de Claude, sube la carpeta como
skill según las instrucciones de tu plan.

## Uso

```text
/conversion-medicion https://ejemplo.com webflow                flujo completo (pasos 1 a 10)
/conversion-medicion https://ejemplo.com framer --auditoria     diagnóstico y reporte, sin tocar el sitio
/conversion-medicion https://ejemplo.com framer --medicion      etiqueta, eventos, evento clave, anuncios, UTMs
/conversion-medicion https://ejemplo.com webflow --formulario   fricción del formulario y evento de envío
/conversion-medicion https://ejemplo.com --velocidad            Core Web Vitals
```

## Mapa de archivos

| Ruta | Contenido |
|---|---|
| `SKILL.md` | Flujo de 10 pasos, modos y reglas |
| `references/ga4-eventos.md` | Nombres de evento, eventos clave, DebugView, Google Ads y Meta |
| `references/webflow.md` · `framer.md` | Cómo detectar el envío exitoso en cada plataforma y dónde va el código |
| `references/whatsapp-telefono.md` | Medir clics a WhatsApp, `tel:` y `mailto:` |
| `references/utms.md` | Convención de UTMs por canal |
| `references/formularios.md` | Checklist de fricción |
| `references/core-web-vitals.md` | Umbrales, campo vs laboratorio, arreglos en Webflow y Framer |
| `references/evidencia.md` | Afirmaciones etiquetadas y fechadas, y pendientes por verificar |
| `templates/*.js` | Snippets listos para pegar |
| `templates/plan-de-medicion.md` · `reporte-conversion.md` | Plan y reporte |
| `scripts/` | Utilidades en Python |
| `examples/` | Páginas y respuesta de PageSpeed ficticias |

## Scripts

Python 3, **solo biblioteca estándar** (sin `pip install`). Todos traen `--help`.

| Script | Qué hace |
|---|---|
| `auditar_medicion.py` | Lee el HTML crudo (sin JS) y reporta GA4, GTM, Google Ads, píxel de Meta, Clarity, Hotjar, formularios y sus campos, WhatsApp/tel/mailto, UTMs y página de gracias. Sale con 1 si hay contactos sin analítica |
| `velocidad.py` | Llama a la API gratuita de PageSpeed Insights v5 y reporta LCP, INP y CLS de campo, LCP, CLS y TBT de laboratorio, elemento LCP y oportunidades. Clave opcional en `PSI_API_KEY` |

## Método en corto

1. Inventario de todas las formas de contacto.
2. Una sola etiqueta GA4 (directa o vía GTM, no las dos).
3. Evento `generate_lead` **en el éxito** del envío, no en el clic.
4. Marcarlo como evento clave; 2 a 4 eventos clave en total.
5. Importarlo a Google Ads como acción primaria y mandarlo a Meta como `Lead`.
6. UTMs solo en enlaces que entran desde fuera, con convención fija.
7. Formulario con los campos mínimos, probado en un teléfono.
8. Velocidad: arreglar primero el elemento LCP de la página que recibe anuncios.
9. Verificar en DebugView, Realtime, Probar eventos de Meta y estado de conversión en Ads.
10. Reportar desde la fecha de instalación; lo anterior es "no medido", no cero.

## Evidencia

`references/evidencia.md` etiqueta cada afirmación como [E] estudio o caso medido, [O] oficial,
[S] criterio o especulativo, [M] mito, con fuente y fecha. Las fuentes cuya URL o detalle no se
confirmó al corte están marcadas **por verificar** en vez de inventar un enlace.

## Licencia

MIT. Ver [LICENSE](LICENSE).

## Cómo contribuir

- **Evidencia:** PR a `references/evidencia.md` con fuente, URL, fecha y etiqueta. Resolver un
  "por verificar" con la fuente oficial es la contribución más útil.
- **Plataformas:** notas para otras plataformas (Wix, Squarespace, WordPress) siguiendo la forma
  de `webflow.md` y `framer.md`.
- **Ejemplos:** solo material ficticio; nunca IDs, URLs ni datos de un cliente.
- Los scripts siguen sin dependencias externas.
