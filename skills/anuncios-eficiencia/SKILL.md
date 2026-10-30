---
name: anuncios-eficiencia
description: "Audita y corrige la eficiencia de la inversión en Google Ads y Meta Ads de un negocio pequeño o mediano (medición, objetivo de campaña, costo por lead objetivo desde su margen, estructura, negativas, creatividades y reglas de pausa y escala); úsalo cuando los anuncios gastan sin traer leads o ventas medibles, o cuando un diagnóstico marcó baja la eficiencia de inversión."
argument-hint: "[--google | --meta | ambas] [--auditoria | --plan | --reporte] [ruta a exports CSV] [--ticket N --margen N --cierre N]"
---

# Eficiencia de anuncios: Google Ads + Meta Ads

> Convierte una cuenta de anuncios que "gasta y no se sabe qué trae" en una que **mide, paga por
> el resultado correcto y tiene un corte de costo propio**. No es teoría: sale el costo por lead
> que el negocio puede pagar, la lista de campañas a pausar, cambiar o escalar, las negativas que
> faltan, el plan de pruebas y el reporte.

**Input**: $ARGUMENTS (plataforma + modo + exports CSV o acceso por MCP + ticket, margen y cierre)

| Modo | Corre |
|---|---|
| sin bandera | Pasos 1 a 9 completos |
| `--auditoria` | Pasos 1 a 4 y el hallazgo de 5 a 8, sin tocar la cuenta: diagnóstico y lista priorizada |
| `--plan` | Pasos 4 a 8 sobre una cuenta ya auditada: estructura, negativas, creatividades, reglas |
| `--reporte` | Paso 9 con los datos del periodo |
| `--google` / `--meta` | Limita cualquier modo a esa plataforma; sin ninguna, se revisan las dos |

---

## Verdad de negocio (leer antes de prometerle nada al dueño)

Evidencia con etiqueta y fecha en `references/evidencia.md`. Lo que no se negocia:

- **No se promete ROAS, CPL ni número de leads.** Se promete método: medición correcta, objetivo
  correcto, un corte de costo propio y decisiones con reglas escritas. El resultado depende de la
  oferta, el precio, la respuesta comercial y el mercado.
- **Sin conversión medida no se optimiza.** Si la cuenta no registra leads o ventas, todo lo demás
  es opinión. El paso 2 bloquea al resto.
- **El costo se juzga contra el objetivo del negocio, no contra benchmarks.** Los promedios de
  industria publicados casi siempre son de Estados Unidos y de otras estructuras de precio [E]. El
  CPL que sirve sale de ticket × margen × tasa de cierre (`references/costo-objetivo.md`).
- **Un clic no es un lead.** Promocionar una publicación con objetivo de tráfico o visitas compra
  clics baratos y casi nunca conversaciones. El objetivo debe ser Clientes potenciales, Mensajes o
  Ventas [O].
- **Las estrategias automáticas necesitan datos.** Smart Bidding y la fase de aprendizaje de Meta
  piden volumen de conversiones; repartir poco presupuesto en muchas campañas deja a todas sin
  aprender [O].
- **La plataforma reporta lo que atribuye, no lo que vendiste.** El número final se cruza con el
  CRM, la libreta de ventas o el WhatsApp del negocio.

---

## Cuándo usarlo

- El dueño dice "le meto dinero a Facebook/Google y no veo clientes".
- Un diagnóstico o panel de marketing dio puntaje bajo en **eficiencia de inversión**.
- Antes de subir presupuesto: confirmar que lo que hay ya convierte.
- Al heredar una cuenta de otra agencia o de un "community manager" que promocionaba posts.
- Cada mes, para el reporte y las decisiones de pausa y escala.

## Qué necesita

1. **Datos de la cuenta**, cualquiera de estas vías:
   - Export CSV de Google Ads (Campañas → descargar, últimos 30 o 90 días, con columnas Costo,
     Impr., Clics, Conversiones, Estrategia de oferta, Tipo de campaña) y, si se puede, el informe
     de **términos de búsqueda**.
   - Export CSV del Administrador de anuncios de Meta a nivel campaña (Importe gastado,
     Resultados, Indicador de resultado, Impresiones, Clics en el enlace).
   - El **MCP oficial de Meta Ads** (`https://mcp.facebook.com/ads`) si está conectado, o un MCP de
     Google Ads (ver `references/google-ads.md`). Con MCP se lee igual; **no se cambia nada en la
     cuenta sin el visto bueno explícito del dueño**.
2. **Números del negocio**: ticket promedio, margen bruto, tasa de cierre de lead a venta (incluso si
   es estimada) y, si aplica, compras por cliente.
3. **Qué cuenta como conversión** para este negocio: formulario, mensaje de WhatsApp, llamada,
   cita agendada o compra.

Si falta algo, se pide; si el dueño no sabe su tasa de cierre, se usa una estimación declarada y
se recalcula al mes.

---

## Flujo (9 pasos)

### 1. Diagnóstico
`python3 scripts/analizar_export.py export.csv --cpl-objetivo N` por cada export. Lee gasto,
resultados, objetivo y estrategia por campaña y marca:

- gasto con 0 conversiones (ERROR);
- objetivo o resultado de tráfico, clics, visitas o alcance (ERROR);
- export sin columna de conversiones (ERROR: no hay medición que leer);
- costo por resultado arriba del objetivo, puja por clics, gasto concentrado, presupuesto
  repartido (AVISO).

Además, a mano: cuántas campañas y grupos hay contra el presupuesto diario, qué está activo sin
razón, y si "Resultados" en Meta son de verdad leads.

### 2. Medición primero (bloqueante)
No se optimiza nada sin conversión medida. Checklist en `references/medicion-conversiones.md`:

- Google Ads: al menos una acción de conversión **principal** que dispare de verdad (prueba real
  con el Asistente de etiquetas o un envío de prueba), conversiones mejoradas si hay formulario,
  llamadas y clics a WhatsApp como conversiones separadas.
- Meta: píxel + **API de Conversiones**, evento correcto (`Lead`, `Contact`, `Purchase`) y, si el
  objetivo es Mensajes, conversaciones iniciadas como resultado.
- El montaje completo de GA4 y etiquetas va con el skill hermano `conversion-medicion` si está
  instalado.

Si la medición está rota, el entregable de esta vuelta es arreglarla. Lo demás espera.

### 3. Objetivo correcto
| Lo que el negocio quiere | Google Ads | Meta Ads |
|---|---|---|
| Leads por formulario | Búsqueda con conversión de formulario | Clientes potenciales (formulario instantáneo o sitio) |
| Conversaciones | Búsqueda con conversión de clic a WhatsApp/llamada | Interacción o Clientes potenciales con destino Mensajes (WhatsApp) |
| Venta en línea | Búsqueda o Shopping/PMax con conversión de compra | Ventas con evento `Purchase` |
| Que lo conozcan | Solo con presupuesto aparte y sin pedirle leads | Reconocimiento, medido por alcance, nunca por CPL |

Promociones de publicación con "Más visitas al perfil" o "Más visitas al sitio web" se apagan o se
rehacen con objetivo de resultado. Detalle en `references/meta-ads.md` y `references/google-ads.md`.

### 4. Costo por lead objetivo
`python3 scripts/costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.20`

- CPA máximo = ticket × margen (× compras por cliente).
- CPL máximo = CPA máximo × tasa de cierre.
- Objetivo = máximo menos un colchón de utilidad (30 % por defecto).

Ese CPL objetivo es el corte de todo lo demás: `--cpl-objetivo` en el análisis, umbrales de pausa
y metas de la puja. Ejemplos en MXN en `references/costo-objetivo.md`.

### 5. Estructura
- **Pocas campañas con suficiente presupuesto** antes que muchas con migajas. Regla práctica: cada
  campaña debe poder pagar varias conversiones a la semana a su CPA objetivo.
- Google: separar marca de genéricas; grupos por intención (servicio), no por sinónimo; PMax solo
  con conversión medida y presupuesto que lo sostenga (`google-ads.md`).
- Meta: un conjunto por audiencia realmente distinta; consolidar para salir de la fase de
  aprendizaje; Advantage+ cuando hay eventos suficientes.
- Ubicación y horario: solo donde el negocio atiende y entrega.

### 6. Negativas y términos de búsqueda (Google)
Revisar el informe de términos de búsqueda de los últimos 30 días:

- Negativas de entrada: empleo/vacantes, gratis, curso/tutorial, PDF, "qué es", marcas de
  competencia si no conviene, ciudades donde no hay servicio.
- Cada término con gasto ≥ CPL objetivo y 0 conversiones se evalúa para negativa.
- Términos que convierten pasan a palabra clave propia en frase o exacta.
- Concordancia amplia solo con Smart Bidding y conversión medida; si no, frase y exacta.

### 7. Creatividades
- Una promesa concreta por anuncio, con precio o "desde" si existe, zona y siguiente paso claro.
- Google: títulos que repiten la intención de búsqueda; extensiones de llamada, ubicación y
  formulario o mensaje.
- Meta: 3 a 5 variantes por conjunto (formato, gancho, oferta), una variable a la vez.
- Plan de pruebas en `templates/plan-de-pruebas.md`: hipótesis, métrica, presupuesto y duración
  definidos antes de lanzar.

### 8. Reglas de pausa y escala
Escritas antes de mirar los números, en `references/reglas-pausa-escala.md`:

- Pausar o cambiar cuando el gasto sin conversión pasa de 2 a 3 veces el CPL objetivo.
- Escalar en pasos de 15 a 20 % cuando el costo por resultado está bajo el objetivo con volumen
  suficiente y estable.
- No juzgar dentro de la fase de aprendizaje salvo gasto desbocado.
- Cada decisión se registra con fecha y el número que la disparó.

### 9. Reporte
`templates/reporte-anuncios.md`: gasto, resultados, costo por resultado contra objetivo, qué se
pausó, cambió o escaló y por qué, lo que sigue roto en medición, y el cruce con ventas reales.
Sin vanity metrics como protagonistas (alcance, clics, CTR van en anexo).

---

## Referencias

| Archivo | Para qué |
|---|---|
| `references/google-ads.md` | Estado 2026 de acceso y API, concordancias, términos, negativas, conversiones, Smart Bidding, PMax |
| `references/meta-ads.md` | Objetivos, Advantage+, fase de aprendizaje, CAPI, formularios vs WhatsApp, promociones de publicaciones |
| `references/costo-objetivo.md` | Fórmulas de CPL, CPA, equilibrio y ROAS con ejemplos en MXN |
| `references/reglas-pausa-escala.md` | Umbrales de pausa, escala y paciencia |
| `references/medicion-conversiones.md` | Checklist mínimo de medición y cuándo pasar al skill `conversion-medicion` |
| `references/evidencia.md` | Cada afirmación con etiqueta [E]/[O]/[S]/[M], fuente y fecha |
| `templates/reporte-anuncios.md` | Reporte mensual para el dueño |
| `templates/plan-de-pruebas.md` | Pruebas de creatividad, audiencia y oferta |
| `examples/` | Exports ficticios para probar los scripts |

## Scripts

Python 3, solo biblioteca estándar; cada uno trae `--help`.

| Script | Qué hace |
|---|---|
| `scripts/analizar_export.py` | Export CSV de Google Ads o Meta (español o inglés) → métricas por campaña y hallazgos; sale con 1 si hay ERROR |
| `scripts/costo_objetivo.py` | Ticket, margen y cierre → CPL y CPA máximos y objetivo, ROAS de equilibrio |

Pruebas: `python3 -m unittest discover -s tests -v`.

---

## Anti-patrones

| Anti-patrón | Fix |
|---|---|
| Promocionar publicaciones con objetivo de visitas o clics y llamarlo "campaña de leads" | Objetivo Clientes potenciales, Mensajes o Ventas |
| Optimizar pujas sin conversión que dispare | Paso 2 primero; probar la conversión con un envío real |
| Comparar el CPL con un promedio de Estados Unidos | CPL objetivo desde ticket, margen y cierre |
| Concordancia amplia con CPC manual y sin negativas | Frase/exacta, o amplia solo con Smart Bidding y conversiones |
| Diez grupos de anuncios con $100 al día | Consolidar hasta que cada campaña junte conversiones semanales |
| PMax como primera campaña de un negocio chico sin conversiones | Búsqueda primero; PMax cuando hay datos y presupuesto |
| Apagar y prender a diario según el humor | Reglas escritas y registro de decisiones |
| Editar todo dentro de la fase de aprendizaje | Esperar los eventos o el plazo, salvo gasto desbocado |
| Contar "Resultados" de Meta sin ver el indicador de resultado | Revisar qué evento es el resultado |
| Reportar alcance y CTR como éxito | Costo por resultado contra objetivo y ventas reales |
| Prometer un ROAS | Prometer método; el resultado se mide |
| Cambiar la cuenta por MCP sin permiso | Leer libre, escribir solo con visto bueno explícito |
