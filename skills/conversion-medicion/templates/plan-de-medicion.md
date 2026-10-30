# Plan de medición: {{NEGOCIO}}

- Sitio: {{URL}}
- Plataforma: {{webflow | framer | html}}
- Propiedad GA4: {{G-XXXXXXXXXX}} · GTM: {{GTM-XXXXXXX o "no"}} · Google Ads: {{AW-XXXXXXXXX o "no"}} · Píxel de Meta: {{ID o "no"}}
- Fecha del plan: {{AAAA-MM-DD}} · Responsable: {{nombre}}

> Una fila por **forma de contacto** que existe en el sitio. Lo que no está en esta tabla no se
> mide. "Primaria" = la conversión que más vale para el negocio y hacia la que optimizan los anuncios.

## 1. Conversiones

| # | Conversión | Dónde está (páginas, botones) | Evento GA4 | Cómo se dispara | ¿Evento clave? | Google Ads | Meta | Prioridad | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Formulario de contacto enviado | {{/contacto, home}} | `generate_lead` (`form_name: contacto`) | {{.w-form-done / página /gracias / fetch OK}} | Sí | {{Importado de GA4 · Primaria}} | `Lead` | Primaria | {{Pendiente / Instalado / Verificado AAAA-MM-DD}} |
| 2 | Clic a WhatsApp | {{hero, botón flotante, footer}} | `contact_whatsapp` | Listener delegado | {{Sí si cierran por WhatsApp}} | {{Secundaria}} | `Contact` | {{Primaria o secundaria}} | |
| 3 | Clic a teléfono | {{header, contacto}} | `contact_phone` | Listener delegado | {{Sí / No}} | {{Secundaria}} | `Contact` | Secundaria | |
| 4 | Clic a correo | {{footer}} | `contact_email` | Listener delegado | No | — | — | Observación | |
| 5 | Agenda externa | {{botón "Agenda tu cita"}} | `contact_agenda` | Listener delegado (dominio de agenda) | {{Sí / No}} | {{Secundaria}} | `Schedule` | {{...}} | |

Reglas:

- **Una sola acción primaria por conversión real** en Google Ads (GA4 importado **o** etiqueta
  `AW-`, no ambas como primarias).
- Eventos clave: 2 a 4. `form_start`, `scroll` y `page_view` no son eventos clave.
- Ningún parámetro con nombre, teléfono, correo o mensaje.

## 2. Valor por conversión (opcional)

| Conversión | Ticket promedio | Tasa de cierre estimada | Valor por lead | Fuente del dato |
|---|---|---|---|---|
| Formulario | {{$}} | {{%}} | {{ticket × cierre}} | {{dueño, CRM, estimado}} |

Si no hay datos razonables, no se asigna valor.

## 3. UTMs de los enlaces de entrada

| Origen | URL con UTM | Publicado en | Fecha |
|---|---|---|---|
| Bio de Instagram | `{{URL}}?utm_source=instagram&utm_medium=social&utm_campaign=bio` | | |
| Perfil de Google | `{{URL}}?utm_source=google&utm_medium=organic&utm_campaign=perfil-negocio` | | |
| WhatsApp (difusión) | `{{URL}}?utm_source=whatsapp&utm_medium=social&utm_campaign=difusion` | | |

Convención completa en `references/utms.md`.

## 4. Verificación

| Prueba | Resultado esperado | Hora | Resultado |
|---|---|---|---|
| Envío válido del formulario | 1 `generate_lead` en DebugView | | |
| Envío con error de validación | 0 `generate_lead` | | |
| Recargar la página de gracias | Sin segundo `generate_lead` | | |
| Clic en cada botón de WhatsApp | 1 `contact_whatsapp` por clic, con `ubicacion` | | |
| Clic en teléfono desde móvil | 1 `contact_phone` | | |
| Meta: Probar eventos | `Lead` y `Contact` recibidos | | |
| Google Ads: estado de la acción | Registrando conversiones (puede tardar horas) | | |
| Lead de prueba borrado del CRM o correo | Sí | | |

## 5. Exclusiones

- Hostnames de staging filtrados: {{.webflow.io / .framer.app / otro}}
- Tráfico interno filtrado: {{IP de oficina o "no aplica"}}
