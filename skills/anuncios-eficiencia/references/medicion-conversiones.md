# Medición de conversiones: el mínimo para optimizar

> Versión corta. El montaje completo (GA4, gestor de etiquetas, eventos, consentimiento, informes)
> vive en el skill hermano **`conversion-medicion`**; si está instalado, se usa para esa parte. Aquí
> solo lo que debe estar cierto antes de tocar una sola campaña.

## Qué cuenta como conversión

Una acción que **se parece a dinero**: formulario enviado, clic a WhatsApp, llamada, cita agendada,
compra. Nunca: visita de página, tiempo en sitio, scroll, clic en el menú, ver un video.

## Checklist (bloqueante)

### Google Ads
- [ ] Al menos una acción de conversión **principal** del tipo correcto, con estado activo.
- [ ] Probada con un envío o clic real (Tag Assistant o vista previa) y visible en la cuenta en
      las horas siguientes.
- [ ] Formularios: dispara en el envío exitoso (página de gracias o evento), no en el clic al botón.
- [ ] Clic a WhatsApp y clic a llamar como conversiones separadas (con valor menor que formulario
      si el cierre es menor).
- [ ] Sin doble conteo (etiqueta de Ads y GA4 importado como principales a la vez).
- [ ] Conversiones mejoradas activadas para formularios cuando el sitio lo permite.

### Meta
- [ ] Píxel instalado y recibiendo eventos en el Administrador de eventos.
- [ ] Evento correcto por acción (`Lead`, `Contact`, `Schedule`, `Purchase`).
- [ ] API de Conversiones conectada (integración de la plataforma o servidor) y deduplicada.
- [ ] Campañas optimizando a ese evento, no a clics ni visitas.
- [ ] Formularios instantáneos: los leads se descargan o llegan al CRM a diario.

### Fuera de la plataforma
- [ ] Una fuente de verdad de ventas (CRM, hoja, libreta) que registre de dónde vino cada cliente.
- [ ] Pregunta "¿cómo nos conociste?" en el cierre, como respaldo.
- [ ] WhatsApp: etiquetas o una nota por conversación que venga de anuncio.

## Señales de que la medición está rota

- Gasto alto con 0 conversiones en todas las campañas (lo marca `analizar_export.py`).
- Conversiones ≈ clics: se está contando un clic como conversión.
- Conversiones en Google mucho mayores que leads reales: doble conteo o evento mal puesto.
- "Resultados" en Meta a centavos: el indicador de resultado es un clic o una visita.
- Caída a cero en una fecha concreta: cambio de sitio, formulario nuevo o etiqueta borrada.

## Consentimiento y privacidad

En México no hay hoy una obligación equivalente al modo de consentimiento europeo para anuncios,
pero el aviso de privacidad debe mencionar el uso de cookies y herramientas de terceros
(**por verificar** con el asesor legal del negocio). Si el sitio atiende usuarios de la Unión
Europea, aplica el modo de consentimiento de Google.
