# Meta Ads (Facebook e Instagram) para negocio pequeño y mediano (corte 2026-10-29)

> Lo mínimo para auditar y corregir una cuenta de Meta con presupuesto chico. Etiquetas y fuentes
> en `evidencia.md`.

## 1. Acceso a los datos

| Vía | Notas |
|---|---|
| Export del Administrador de anuncios | Nivel campaña, columnas: Nombre de la campaña, Indicador de resultado, Resultados, Importe gastado, Impresiones, Clics en el enlace. Exportar como CSV |
| MCP oficial de Meta Ads (`https://mcp.facebook.com/ads`) | Si está conectado, lee campañas, conjuntos e insights. Disponibilidad y alcance **por verificar** en la cuenta. Ningún cambio sin visto bueno del dueño |
| Promociones hechas desde la app de Instagram o Facebook | Aparecen en el Administrador como campañas propias; revisarlas, son la fuga más común |

## 2. Objetivos

Desde 2022 Meta agrupa las campañas en seis objetivos: Reconocimiento, Tráfico, Interacción,
Clientes potenciales, Promoción de la app y Ventas [O]. Meta optimiza la entrega hacia el evento
que le pides: si pides clics, encuentra gente que da clic.

| Objetivo | Optimiza a | Para negocio que vende |
|---|---|---|
| Tráfico | Clics en el enlace, visitas a la página de destino, visitas al perfil | **Casi nunca.** Clics baratos (en cuentas mexicanas se ven del orden de $0.40 a $1.00 MXN por clic [S]) y 0 leads |
| Interacción | Interacciones, reproducciones, **o conversaciones por mensaje** | Solo con destino Mensajes (WhatsApp, Messenger, Instagram Direct) |
| Clientes potenciales | Formulario instantáneo, conversiones en el sitio, mensajes, llamadas | Servicios, salud, educación, inmobiliario |
| Ventas | Compras o conversiones en el sitio o catálogo | Ecommerce y citas con pago |
| Reconocimiento | Alcance y recuerdo | Solo con presupuesto aparte; nunca se le pide CPL |

**El caso típico:** el negocio "promociona" posts desde Instagram con "Más visitas al perfil" o
"Más visitas al sitio web". El Administrador muestra miles de "Resultados" a centavos cada uno,
pero el indicador de resultado dice *Clics en el enlace* o *Visitas al perfil*. Eso no es un lead.
Se apaga o se rehace con objetivo Clientes potenciales o Mensajes.

## 3. Formulario instantáneo vs WhatsApp vs sitio

| Destino | A favor | En contra | Cuándo |
|---|---|---|---|
| Formulario instantáneo | CPL bajo, sin sitio | Leads de menor intención; hay que llamar rápido | Servicios con seguimiento por teléfono |
| Formulario con "mayor intención" (pantalla de revisión) | Filtra curiosos | CPL más alto | Cuando el equipo se ahoga en leads malos |
| WhatsApp (clic a mensaje) | Conversación directa, natural en México y LatAm | La "conversación iniciada" no es lead calificado; depende de quién contesta y qué tan rápido | Negocios que cierran por chat |
| Sitio con píxel + CAPI | Más control y calificación | Necesita página rápida y medición correcta | Negocios con landing y agenda en línea |

Sea cual sea, el costo se juzga contra el CPL objetivo y contra cuántos de esos leads se vuelven
venta (cruce con CRM o WhatsApp).

## 4. Fase de aprendizaje

- Cada conjunto de anuncios necesita del orden de **50 eventos de optimización en 7 días** después
  del último cambio significativo para salir de aprendizaje [O]. Si no los junta, queda en
  "Aprendizaje limitado".
- Cambios significativos que la reinician: presupuesto grande, puja, segmentación, creatividad
  nueva, pausar más de 7 días [O].
- Con presupuesto chico: menos conjuntos, audiencias más amplias, y, si no se llega a 50 leads por
  semana, optimizar a un evento más frecuente pero todavía de intención (por ejemplo conversación
  iniciada en lugar de cita agendada), nunca a clics.

## 5. Advantage+

- **Advantage+ audiencia, ubicaciones y presupuesto** (presupuesto a nivel campaña) dejan que Meta
  reparta. Funcionan mejor con eventos suficientes y creatividades variadas [O].
- Con datos escasos se prueba Advantage+ contra una configuración manual en el plan de pruebas,
  no se asume.
- Exclusiones que sí se ponen: clientes actuales (si el objetivo es adquisición), zonas sin
  servicio, menores de edad si el giro lo exige.

## 6. Píxel y API de Conversiones (CAPI)

- Píxel en el sitio + CAPI desde el servidor o desde la integración de la plataforma (Shopify,
  WooCommerce, gestor de etiquetas del servidor). CAPI recupera eventos que el navegador pierde [O].
- Evento correcto: `Lead` para formulario, `Contact` para clic a WhatsApp o llamada, `Schedule`
  para cita, `Purchase` con valor para venta. Deduplicar con `event_id` cuando se mandan desde
  píxel y CAPI.
- Revisar en el Administrador de eventos que el evento llega y su calidad de coincidencia.

## 7. Creatividades

- La creatividad es la segmentación con Advantage+: el gancho decide a quién le llega.
- 3 a 5 anuncios por conjunto, distintos de verdad (formato, gancho u oferta), no cinco colores
  del mismo diseño.
- Video vertical corto para Reels e Historias; primeros 2 segundos con la promesa.
- Precio o "desde" cuando existe; zona; qué pasa después del clic.
- Fatiga: frecuencia alta y costo por resultado subiendo semana a semana → rotar creatividad.

## 8. Checklist de auditoría rápida

- [ ] Ninguna campaña activa con objetivo Tráfico o promociones de "visitas" pidiéndole leads
- [ ] Indicador de resultado revisado en cada campaña (qué cuenta como "Resultado")
- [ ] Píxel + CAPI con el evento correcto y deduplicado
- [ ] Conjuntos con eventos suficientes o consolidados
- [ ] Sin conjuntos con gasto ≥ 2× CPL objetivo y 0 resultados
- [ ] 3-5 creatividades distintas por conjunto
- [ ] Formularios: alguien llama en menos de una hora
- [ ] WhatsApp: tiempo de respuesta medido y conversaciones cruzadas con ventas
