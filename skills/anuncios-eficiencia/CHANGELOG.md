# Changelog

## v1.0.0 (2026-10-29)

Primera versión pública.

### Incluye
- `SKILL.md` con flujo de 9 pasos: diagnóstico, medición primero, objetivo correcto, costo por
  lead objetivo, estructura, negativas y términos de búsqueda, creatividades, reglas de pausa y
  escala, y reporte. Modos `--auditoria`, `--plan`, `--reporte`, `--google`, `--meta`.
- Referencias: `google-ads.md` (estado 2026 de acceso a la API, concordancias, negativas,
  conversiones, Smart Bidding, PMax), `meta-ads.md` (objetivos, fase de aprendizaje, Advantage+,
  CAPI, formulario vs WhatsApp), `costo-objetivo.md` (fórmulas y ejemplos en MXN),
  `reglas-pausa-escala.md`, `medicion-conversiones.md`, `evidencia.md` (etiquetas [E]/[O]/[S]/[M]).
- Plantillas: reporte mensual de anuncios y plan de pruebas.
- Scripts en Python 3 sin dependencias: `analizar_export.py` (exports de Google Ads y Meta en
  español o inglés, UTF-8 o UTF-16, coma o tabulador) y `costo_objetivo.py`.
- Exports ficticios en `examples/` y pruebas en `tests/`.
- `install.sh` standalone, `README.md` y `README.en.md`, licencia MIT.

### Decisiones de encuadre
- No se promete ROAS ni CPL: se promete método y medición.
- El costo se juzga contra el objetivo propio del negocio, nunca contra benchmarks de otro país.
- Los "resultados" de campañas de tráfico no cuentan como conversiones en el análisis.
- Afirmaciones sobre cambios recientes de plataforma (API sin developer token, MCP de Meta,
  negativas en PMax) van marcadas **por verificar**.
