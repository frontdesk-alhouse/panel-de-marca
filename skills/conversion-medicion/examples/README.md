# Ejemplos

Material ficticio para probar los scripts sin tocar datos de un cliente real. Todos los comandos
se corren desde la raíz del skill (la carpeta que contiene `scripts/`). Requisito: Python 3.10 o
superior, sin dependencias externas.

## Qué hay aquí

- `pagina-webflow-ejemplo.html`: página de contacto de una clínica inventada con la forma del
  HTML que publica Webflow (`data-wf-site`, `w-form`, `.w-form-done`). Tiene los errores típicos:
  solo Universal Analytics, formulario de 7 campos con teléfono y correo como `type="text"`, sin
  página de gracias, enlace interno con UTM, agenda externa sin UTM y WhatsApp sin mensaje.
- `pagina-webflow-corregida.html`: la misma página después de aplicar el skill. Los IDs de
  etiquetas tienen formato válido pero son inventados.
- `psi-respuesta-ejemplo.json`: respuesta recortada y ficticia de la API de PageSpeed Insights,
  con datos de campo solo a nivel origen, LCP malo por una imagen de hero diferida y oportunidades.

## Cómo correr cada script

**Auditoría de medición** (sin red con los archivos locales):

```bash
python3 scripts/auditar_medicion.py examples/pagina-webflow-ejemplo.html     # sale con 1 (ERROR: sin GA4 ni GTM)
python3 scripts/auditar_medicion.py examples/pagina-webflow-corregida.html   # sale con 0
python3 scripts/auditar_medicion.py examples/pagina-webflow-ejemplo.html --json | python3 -m json.tool | head -40
```

Con red, sobre un sitio tuyo o de un cliente con permiso:

```bash
python3 scripts/auditar_medicion.py https://www.tu-sitio.mx/contacto
```

**Velocidad** (sin red con el JSON de ejemplo):

```bash
python3 scripts/velocidad.py --desde-json examples/psi-respuesta-ejemplo.json
python3 scripts/velocidad.py --desde-json examples/psi-respuesta-ejemplo.json --estricto   # sale con 1: no pasa
```

Con red (la API puede tardar hasta 90 s; sin clave la cuota es baja y puede responder 429):

```bash
export PSI_API_KEY=tu-clave   # opcional
python3 scripts/velocidad.py https://www.tu-sitio.mx --estrategia mobile
python3 scripts/velocidad.py https://www.tu-sitio.mx --estrategia desktop --json
```

## Códigos de salida

| Script | 0 | 1 |
|---|---|---|
| `auditar_medicion.py` | sin hallazgos ERROR | algún ERROR (contactos sin GA4 ni GTM), página sin respuesta o challenge anti-bot |
| `velocidad.py` | reporte generado | la API falló (cuota, timeout, URL inválida) o, con `--estricto`, Core Web Vitals de campo no pasan |
