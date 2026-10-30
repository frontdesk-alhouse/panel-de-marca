# Changelog

## v1.0.0 (2026-10-29)

Primera versión pública.

### Incluye
- `SKILL.md` con flujo de 10 pasos: inventario de conversiones, verificación de etiqueta,
  evento de envío por plataforma, evento clave, importación a Google Ads y Meta, UTMs, fricción
  del formulario, velocidad, verificación en DebugView y Realtime, y reporte.
- Modos `--auditoria`, `--medicion`, `--formulario` y `--velocidad`.
- Referencias: `ga4-eventos.md`, `webflow.md`, `framer.md`, `whatsapp-telefono.md`, `utms.md`,
  `formularios.md`, `core-web-vitals.md` y `evidencia.md` (afirmaciones etiquetadas
  [E]/[O]/[S]/[M] con fuente y fecha, y una lista de pendientes por verificar).
- Snippets listos para pegar: `generate_lead` en el éxito de formularios de Webflow,
  `generate_lead` en la página de gracias (con soporte de navegación sin recarga para Framer) y
  listener delegado de clics a WhatsApp, teléfono, correo y agenda.
- Plantillas de plan de medición y de reporte para el dueño del negocio.
- Scripts en Python 3 sin dependencias: `auditar_medicion.py` (HTML crudo) y `velocidad.py`
  (PageSpeed Insights API v5, con `--desde-json` para probar sin red).
- Ejemplos ficticios: página tipo Webflow antes y después, y una respuesta de PageSpeed.
- `install.sh` standalone, `README.md` y `README.en.md`, licencia MIT.

### Origen del caso
- Un formulario multipaso en Framer registró 15 `form_start` y 0 envíos en GA4 mientras los
  leads llegaban por correo. De ahí la regla central: el envío se mide con un evento propio de
  éxito, verificado en DebugView, nunca con la medición mejorada.

### Decisiones de encuadre
- Medir hace visibles los leads; no se vende como crecimiento.
- Sin benchmarks genéricos de tasa de conversión: el sitio se compara contra sí mismo.
- El veredicto de velocidad es de campo (CrUX, p75, móvil); el puntaje de Lighthouse es
  diagnóstico.
