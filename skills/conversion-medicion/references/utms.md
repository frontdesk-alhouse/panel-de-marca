# UTMs: convención por canal

> Sin UTMs, el clic desde la bio de Instagram o desde WhatsApp llega a GA4 como "Direct",
> "Referral" o "Unassigned", y nadie sabe qué canal trae contactos. Con una convención fija, el
> informe de adquisición contesta solo.

---

## 1. Reglas

- **Minúsculas siempre.** GA4 distingue `Instagram` de `instagram` y los cuenta como fuentes
  distintas.
- **Guiones medios, sin espacios ni acentos:** `promo-noviembre`, no `Promo Noviembre`.
- **Solo en enlaces que entran desde fuera.** Nunca en enlaces internos del sitio: sobrescriben
  la fuente real de la sesión.
- **`utm_source` = dónde estaba el enlace; `utm_medium` = tipo de canal; `utm_campaign` = para
  qué.** `utm_content` distingue piezas o botones; `utm_term` se reserva para búsqueda pagada.
- **Google Ads con auto-etiquetado (`gclid`)** no necesita UTMs manuales; si los agregas,
  revisa que no contradigan al `gclid` [O, comportamiento de prioridad por verificar].
- Anota cada enlace nuevo en una hoja con fecha; los enlaces viejos ya publicados no se cambian
  a medias.

## 2. Convención

| Origen | utm_source | utm_medium | utm_campaign | utm_content (opcional) | Canal esperado en GA4 |
|---|---|---|---|---|---|
| Bio de Instagram | `instagram` | `social` | `bio` | — | Organic Social |
| Historia de Instagram | `instagram` | `social` | `historias` | `aaaa-mm-dd` o tema | Organic Social |
| Post o reel (enlace en comentario o DM) | `instagram` | `social` | `post` | tema | Organic Social |
| Bio de TikTok | `tiktok` | `social` | `bio` | — | Organic Social |
| Página de Facebook | `facebook` | `social` | `perfil` | — | Organic Social |
| Perfil de LinkedIn | `linkedin` | `social` | `perfil` | — | Organic Social |
| Estado de WhatsApp | `whatsapp` | `social` | `estados` | tema | Organic Social [por verificar] |
| Mensaje o lista de difusión de WhatsApp | `whatsapp` | `social` | `difusion` | `aaaa-mm-dd` | Organic Social [por verificar] |
| Respuesta rápida o catálogo de WhatsApp Business | `whatsapp` | `social` | `respuesta-rapida` | — | Organic Social [por verificar] |
| Perfil de Google (botón Sitio web) | `google` | `organic` | `perfil-negocio` | — | Organic Search |
| Perfil de Google (botón de citas, si aplica) | `google` | `organic` | `perfil-negocio` | `citas` | Organic Search |
| Boletín por correo | `newsletter` | `email` | nombre del envío | botón | Email |
| Firma de correo | `firma` | `email` | `firma` | — | Email |
| Código QR impreso | `qr` | `offline` | pieza (`tarjeta`, `volante`) | — | Unassigned (aceptable; se filtra por source) |
| Anuncio de Meta | `facebook` o `instagram` | `paid-social` | nombre de campaña | anuncio | Paid Social |

Por qué así:

- GA4 asigna "Organic Social" cuando la fuente está en su lista de sitios sociales **o** el
  medio coincide con `social` y variantes; `whatsapp` como fuente puede no estar en esa lista, por
  eso el medio `social` hace el trabajo [O, lista de reglas por verificar en la doc de "canales
  predeterminados"].
- Para el perfil de Google se usa `utm_medium=organic` para que siga contando como búsqueda
  orgánica, y `utm_campaign=perfil-negocio` para separarlo del resto de Google [O, regla de
  canal; práctica común, no requisito].
- En Meta, los parámetros de URL del anuncio pueden usar variables dinámicas
  (`{{campaign.name}}`, `{{ad.name}}`) [O, sintaxis por verificar en el administrador de
  anuncios].

## 3. Ejemplos listos

```text
https://www.ejemplo.mx/?utm_source=instagram&utm_medium=social&utm_campaign=bio
https://www.ejemplo.mx/contacto?utm_source=google&utm_medium=organic&utm_campaign=perfil-negocio
https://www.ejemplo.mx/promo?utm_source=whatsapp&utm_medium=social&utm_campaign=difusion&utm_content=2026-11-04
```

- Instagram permite varios enlaces en la bio; cada uno con su `utm_content`.
- Para enlaces largos en historias usa el enlace completo; un acortador que redirige con 301
  conserva los parámetros, pero compruébalo.

## 4. Enlaces a agendas o formularios externos

Si el sitio manda a Calendly, Cal.com, Google Forms, Typeform o similar, el contacto ocurre
**fuera** de tu GA4. Dos opciones:

1. Medir el clic de salida (`contact_agenda`) con el listener de `clics-contacto.js`
   (agrega el dominio a la lista del snippet).
2. Pasar UTMs al destino cuando la herramienta los registra (varias agendas guardan los
   parámetros de la URL con la cita [por verificar por herramienta]).

`auditar_medicion.py` marca como AVISO los enlaces a esas herramientas sin UTM.

## 5. Verificación

- Abre cada enlace en una ventana privada y en GA4 → Tiempo real mira la fuente y el medio.
- A la semana: Adquisición → Adquisición de tráfico, dimensión "Fuente / medio de la sesión".
