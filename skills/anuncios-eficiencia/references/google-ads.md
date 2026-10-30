# Google Ads para negocio pequeño y mediano (corte 2026-10-29)

> Lo mínimo para auditar y corregir una cuenta de Google Ads con presupuesto chico. Etiquetas y
> fuentes en `evidencia.md`. Donde dice **por verificar**, confírmalo en la cuenta o en la ayuda
> oficial antes de afirmarlo al dueño.

## 1. Acceso a los datos

| Vía | Cuándo | Notas |
|---|---|---|
| Export CSV desde la interfaz | Siempre funciona | Campañas → icono de descarga → CSV. Suele salir en UTF-16 con tabuladores y 1-2 renglones de título; `analizar_export.py` lo lee tal cual |
| Informe de términos de búsqueda | Paso 6 | Palabras clave → Términos de búsqueda, 30 días, columnas Costo y Conversiones |
| Google Ads API / MCP | Cuentas que se revisan seguido | Requiere un proyecto de Google Cloud con la API de Google Ads habilitada y OAuth del usuario con acceso a la cuenta |

- **Developer token:** Google comunicó que el requisito de developer token para la API se retiró
  el **2026-09-09**; el acceso pasa por el proyecto de Google Cloud. **Por verificar** en la
  documentación de la API antes de dar instrucciones: si la cuenta o la librería todavía lo pide,
  sigue el flujo que pida.
- Existe un servidor MCP de Google Ads de código abierto publicado por Google (solo lectura de
  reportes al momento de escribir esto, **por verificar**). Si está conectado, se usa para leer;
  ningún cambio en la cuenta sin visto bueno del dueño.
- `login-customer-id` = la cuenta de administrador (MCC) cuando se entra por una; si no, la propia
  cuenta. Es el error de permisos más común.

## 2. Conversiones (antes que todo)

- Herramientas → Conversiones. Debe haber al menos una acción **principal** del tipo que importa:
  envío de formulario, clic a WhatsApp, llamada desde anuncio, llamada al número del sitio, compra.
- Estado "Sin conversiones recientes" o "Inactiva" = no está disparando. Probar con un envío real y
  el Asistente de etiquetas (Tag Assistant).
- Acciones **secundarias** se reportan pero no entran a la puja. Visitas a página, tiempo en sitio
  o scroll **nunca** como principales.
- **Conversiones mejoradas** para formularios: mejoran la atribución cuando las cookies fallan [O].
- Importar desde GA4 sirve, pero se cuenta una sola vez: o la etiqueta de Google Ads o el evento
  importado de GA4 como principal, no ambos.
- Valor de conversión: si el ticket varía mucho, asignar valor por tipo (cita = X, venta = Y)
  permite pujar por valor más adelante.

## 3. Concordancias y palabras clave

| Concordancia | Qué hace | Cuándo |
|---|---|---|
| Exacta `[implantes dentales]` | Mismo significado que la palabra | Términos probados que convierten |
| Frase `"implantes dentales"` | Incluye el significado de la frase | Base de una cuenta chica |
| Amplia `implantes dentales` | Búsquedas relacionadas, incluso sin las palabras | Solo con Smart Bidding y conversiones medidas [O] |

- La concordancia amplia modificada ya no existe desde 2021 [O].
- Con presupuesto chico y sin conversiones, amplia + CPC manual es la forma más rápida de quemar
  dinero: aparece en búsquedas de empleo, cursos, "gratis" y temas vecinos.
- Grupos de anuncios por **intención** (un servicio, una necesidad), no un grupo por sinónimo.

## 4. Términos de búsqueda y negativas

- El informe de términos dice qué escribió la gente de verdad. Se revisa cada semana el primer mes
  y luego cada mes.
- Las negativas **no** se expanden a variantes cercanas como las positivas: hay que agregar
  plurales y variantes a mano [O].
- Lista de negativas compartida a nivel cuenta con lo universal: `empleo`, `vacantes`, `trabajo`,
  `sueldo`, `gratis`, `curso`, `tutorial`, `pdf`, `que es`, `wikipedia`, `diy`, `segunda mano`
  (según el giro), municipios fuera de cobertura.
- Regla: término con gasto ≥ CPL objetivo y 0 conversiones → se evalúa como negativa. Término que
  convierte → palabra clave propia en exacta o frase.

## 5. Estrategias de puja

| Estrategia | Requisito práctico | Para quién |
|---|---|---|
| Maximizar clics / CPC manual | Ninguno | Solo para arrancar sin conversiones, y por poco tiempo |
| Maximizar conversiones | Conversión medida | Cuentas chicas con medición nueva |
| CPA objetivo | Historial de conversiones; Google ha recomendado del orden de **30 conversiones en 30 días** para que funcione estable (umbral exacto **por verificar**, varía por estrategia) | Cuando ya hay volumen |
| ROAS objetivo | Valor de conversión real y volumen | Ecommerce |

- El CPA objetivo inicial se pone cerca del CPA real reciente, no en el ideal; se baja por pasos.
- Cambios grandes de presupuesto o de objetivo reinician el aprendizaje de la estrategia.

## 6. Performance Max (PMax)

- Necesita objetivos de conversión; sin conversión medida, optimiza a lo que pueda y gasta.
- Con presupuesto chico reparte entre Búsqueda, Display, YouTube, Gmail y Maps: el gasto en
  inventario de baja intención es difícil de controlar.
- Tiende a capturar búsquedas de **marca** que ya eran tuyas; excluir marca cuando se pueda.
- Google habilitó negativas a nivel campaña en PMax en 2025 (**por verificar** disponibilidad en
  la cuenta); antes solo había exclusiones de marca y negativas a nivel cuenta.
- Orden recomendado para un negocio local: Búsqueda con conversiones medidas primero; PMax cuando
  la Búsqueda ya junta conversiones y hay presupuesto para ambas.

## 7. Presupuesto y estructura

- Presupuesto mensual por campaña ≥ varias veces el CPA objetivo; si no alcanza para ~1
  conversión por semana, la campaña no aprende. Consolidar antes que repartir [S regla práctica].
- Marca y genéricas separadas: la marca tiene CPL bajo y "maquilla" a las genéricas si van juntas.
- Ubicación: "Presencia" (personas en la zona) en lugar de "Presencia o interés" para negocio local.
- Programación: si nadie contesta de noche, bajar la puja o pausar en esas horas, o medir mensajes
  nocturnos aparte.

## 8. Checklist de auditoría rápida

- [ ] Acción de conversión principal que dispara (probada con envío real)
- [ ] Ninguna visita de página como conversión principal
- [ ] Sin campañas con gasto ≥ 2× CPL objetivo y 0 conversiones
- [ ] Sin Maximizar clics/CPC manual con conversiones disponibles
- [ ] Lista de negativas compartida aplicada
- [ ] Términos de búsqueda revisados en los últimos 30 días
- [ ] Amplia solo con Smart Bidding
- [ ] Marca separada de genéricas
- [ ] PMax solo con conversiones y presupuesto suficiente
- [ ] Ubicación en "Presencia" para negocio local
