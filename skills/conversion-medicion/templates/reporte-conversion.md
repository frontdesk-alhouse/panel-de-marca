# Conversión y experiencia técnica: {{NEGOCIO}}

**Sitio:** {{URL}} · **Plataforma:** {{webflow | framer | html}} · **Fecha:** {{AAAA-MM-DD}} · **Modo:** {{completo | --auditoria | --medicion | --formulario | --velocidad}}

---

## Resumen para el dueño (5 líneas máximo)

1. {{Qué no se veía: "Los contactos por formulario no aparecían en Google Analytics ni en Google Ads."}}
2. {{Qué se hizo: "Ahora cada envío exitoso y cada clic a WhatsApp se registra y se verificó en vivo."}}
3. {{Qué significa: "Las campañas pueden optimizar hacia contactos reales, no hacia clics."}}
4. {{Velocidad: "En celular la página principal carga su imagen principal en X s; la meta es 2.5 s."}}
5. {{Lo que sigue y quién lo hace.}}

> Las cifras de contactos cuentan **desde {{fecha de instalación}}**. Antes de esa fecha los
> contactos existían pero **no se medían**; no se reportan como cero.

## 1. Inventario de conversiones

| Conversión | Antes | Ahora | Evento | Evento clave | Ads | Meta | Verificado |
|---|---|---|---|---|---|---|---|
| Formulario | {{No medido / solo form_start}} | Medido | `generate_lead` | Sí | {{Primaria}} | `Lead` | {{DebugView AAAA-MM-DD HH:MM}} |
| WhatsApp | {{No medido}} | Medido | `contact_whatsapp` | {{Sí/No}} | {{Secundaria}} | `Contact` | {{...}} |
| Teléfono | | | `contact_phone` | | | | |

## 2. Etiquetas encontradas

Salida resumida de `auditar_medicion.py`:

| Herramienta | ID | Vía | Observación |
|---|---|---|---|
| GA4 | {{G-...}} | {{directo / GTM / integración de la plataforma}} | {{duplicado, falta, OK}} |
| GTM | {{GTM-...}} | | |
| Google Ads | {{AW-...}} | | |
| Píxel de Meta | {{ID}} | | |
| Clarity / Hotjar | {{ID}} | | |

Hallazgos ERROR / AVISO:

- {{...}}

## 3. UTMs

| Enlace | Antes | Ahora |
|---|---|---|
| Bio de Instagram | {{sin UTM → llegaba como Direct/Referral}} | `utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Perfil de Google | | |
| WhatsApp | | |

## 4. Formulario

Campos: {{N}} ({{N}} requeridos) · Pasos: {{N}} · Probado en: {{modelo de teléfono}}

| Punto del checklist | Estado | Cambio concreto | Responsable |
|---|---|---|---|
| {{Teléfono con type="tel"}} | {{Arreglar}} | {{...}} | {{...}} |

## 5. Velocidad (móvil)

Salida de `velocidad.py --estrategia mobile`:

| Métrica | Campo p75 (antes) | Campo p75 (después, a 28 días) | Laboratorio (antes) | Laboratorio (después) | Meta |
|---|---|---|---|---|---|
| LCP | {{s o "sin datos de campo"}} | | {{s}} | | ≤ 2.5 s |
| INP | {{ms}} | | no aplica (TBT {{ms}}) | | ≤ 200 ms |
| CLS | {{}} | | {{}} | | ≤ 0.1 |

Elemento LCP: {{descripción}} · Cambios aplicados: {{lista}}

> Los datos de campo tardan hasta 28 días en reflejar un cambio. El puntaje de laboratorio
> varía entre corridas; se reporta como referencia, no como meta.

## 6. Pendientes

| Pendiente | Por qué importa | Responsable | Fecha |
|---|---|---|---|
| {{Importar generate_lead a Google Ads como primaria}} | {{Las campañas aún optimizan a clics}} | | |

## 7. Lo que este reporte no dice

- No dice cuántos contactos se convirtieron en venta: eso vive en el CRM o en WhatsApp.
- Un clic a WhatsApp es intención de contacto, no conversación confirmada.
- La tasa de conversión se compara contra este mismo sitio antes y después, no contra otros.
