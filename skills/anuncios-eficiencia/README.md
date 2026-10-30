# anuncios-eficiencia

Skill de Claude (Claude Code o la app de Claude) para **auditar y corregir la eficiencia de la
inversión en Google Ads y Meta Ads** de negocios pequeños y medianos en México y LatAm. Revisa que
la cuenta mida conversiones reales, que cada campaña pague por el resultado correcto, calcula el
costo por lead que el negocio puede pagar desde su ticket, margen y tasa de cierre, y deja
estructura, negativas, plan de pruebas, reglas de pausa y escala y un reporte mensual.

[English version](README.en.md)

## Para quién

- Dueños de negocio que invierten en anuncios y no saben qué les regresa.
- Estudios, agencias chicas y freelancers que heredan cuentas y necesitan un método repetible.
- Cualquiera que recibió un diagnóstico de marketing con "eficiencia de inversión" baja y necesita
  pasar del puntaje a los cambios.

## Qué NO promete

- **No promete ROAS, CPL ni número de leads.** Promete método: medición, objetivo correcto, un
  corte de costo propio y decisiones con reglas escritas.
- **No compara contra benchmarks de otro país.** El costo se juzga contra lo que el negocio puede
  pagar.
- **No cambia la cuenta sin permiso.** Con MCP conectado, lee libre; cualquier cambio necesita el
  visto bueno explícito del dueño.

## Fallas que encuentra

| Falla | Cómo la ve |
|---|---|
| Promociones de Instagram/Facebook con objetivo de clics o visitas (~$0.60 por clic, 0 leads) | `analizar_export.py` marca ERROR por objetivo de tráfico |
| Google Ads sin acción de conversión, o con formularios que no disparan | ERROR por gasto con 0 conversiones o export sin columna de conversiones |
| Costos juzgados contra promedios de Estados Unidos | `costo_objetivo.py` da el CPL objetivo propio |
| Sin negativas, concordancia amplia quemando presupuesto | Paso 6: términos de búsqueda y lista de negativas |
| Presupuesto repartido en demasiadas campañas o grupos | AVISO de presupuesto repartido; paso 5 consolida |
| Sin reglas para pausar o escalar | `references/reglas-pausa-escala.md` y registro de decisiones |

## Instalación

```bash
git clone <url-de-este-repo> anuncios-eficiencia
cd anuncios-eficiencia
bash install.sh
```

`install.sh` copia la carpeta a `~/.claude/skills/anuncios-eficiencia/`, verifica `python3` e
imprime cómo invocarlo. Es idempotente y no descarga nada. Alternativa manual: copia la carpeta tal
cual a `~/.claude/skills/anuncios-eficiencia/`. En la app de Claude, sube la carpeta como skill.

## Uso

```text
/anuncios-eficiencia --auditoria google.csv meta.csv   diagnóstico y lista priorizada, sin tocar la cuenta
/anuncios-eficiencia --google --plan                   estructura, negativas, creatividades y reglas
/anuncios-eficiencia --meta --reporte                  reporte del periodo
/anuncios-eficiencia --ticket 4500 --margen 0.45 --cierre 0.2   flujo completo con números del negocio
```

Entrada: exports CSV de Google Ads y del Administrador de anuncios de Meta (español o inglés), o el
MCP oficial de Meta Ads (`https://mcp.facebook.com/ads`) o un MCP de Google Ads si están
conectados.

## Mapa de archivos

| Ruta | Contenido |
|---|---|
| `SKILL.md` | Flujo de 9 pasos, modos y reglas |
| `references/google-ads.md` | Acceso 2026, concordancias, negativas, conversiones, Smart Bidding, PMax |
| `references/meta-ads.md` | Objetivos, aprendizaje, Advantage+, CAPI, formulario vs WhatsApp |
| `references/costo-objetivo.md` | CPL y CPA máximos y objetivo, ejemplos en MXN |
| `references/reglas-pausa-escala.md` | Cuándo pausar, cambiar o escalar |
| `references/medicion-conversiones.md` | Checklist mínimo de medición |
| `references/evidencia.md` | Afirmaciones con etiqueta [E]/[O]/[S]/[M] y fuente |
| `templates/` | Reporte de anuncios y plan de pruebas |
| `scripts/` | Utilidades en Python |
| `examples/` | Exports ficticios |
| `tests/` | Pruebas de los scripts |

## Scripts

Python 3, **solo biblioteca estándar**. Todos traen `--help`.

| Script | Qué hace |
|---|---|
| `analizar_export.py <csv> [--plataforma google\|meta] [--cpl-objetivo N] [--umbral N] [--json]` | Detecta columnas, agrupa por campaña, calcula CTR, CPC, costo por resultado, tasa de conversión y % del gasto, y marca ERROR/AVISO. Sale con 1 si hay ERROR |
| `costo_objetivo.py --ticket N --margen N --cierre N [--compras N] [--colchon N] [--json]` | CPA y CPL máximos y objetivo, ROAS de equilibrio |

```bash
python3 scripts/costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.20
python3 scripts/analizar_export.py examples/meta-ads-campanas.csv --cpl-objetivo 280
python3 -m unittest discover -s tests -v
```

## Evidencia

`references/evidencia.md` etiqueta cada afirmación como [E] estudio, [O] oficial, [S] señal o
regla práctica, [M] mito, con fuente. Los cambios recientes de plataforma van marcados **por
verificar**.

## Skills relacionados

- `conversion-medicion`: montaje completo de GA4, etiquetas y eventos (paso 2).
- `seo-geo`: SEO técnico, schema y visibilidad en asistentes de IA.

## Licencia

MIT. Ver [LICENSE](LICENSE).

## Cómo contribuir

- **Evidencia:** PR a `references/evidencia.md` con afirmación, etiqueta y fuente verificable.
- **Columnas de export:** si tu export no se detecta, agrega el encabezado a `ALIASES` en
  `scripts/analizar_export.py` y un CSV ficticio a `examples/` con su prueba en `tests/`.
- Nunca datos reales de un cliente: ni nombres, ni IDs de cuenta, ni cifras.
