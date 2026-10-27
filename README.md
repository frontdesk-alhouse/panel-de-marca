# Panel de marca

**by [Alto House](https://altohouse.mx)** · [English](README.en.md)

Un panel de marketing para agencias, estudios y negocios que corre **en tu computadora**: tu sitio, Google, anuncios, Instagram y tu competencia en un solo lugar, con una calificación de 0 a 100, lo que conviene atender esta semana y, si quieres, un analista con Claude que responde con tus datos.

- **Sin servidores ni cuentas.** Todo se guarda en tu computadora (base embebida en `data/`). No hay login: solo se abre desde la misma máquina.
- **Configuración guiada.** Al abrirlo por primera vez lee tu sitio, te hace un briefing (quién es tu competencia, qué quieres saber de ella, qué ideas de contenido buscar) y te sugiere búsquedas y competidores con datos reales.
- **Gratis por defecto.** CRM, negocio e ideas de contenido funcionan sin conectar nada. Cada conexión enciende más secciones; solo Claude y Apify cuestan (poco).
- **Español e inglés.**

## Qué necesitas

| | |
|---|---|
| Node.js 22 o más nuevo (versión LTS) | [nodejs.org](https://nodejs.org) |
| git (opcional, para actualizar con un comando) | [git-scm.com](https://git-scm.com/downloads) |
| Mac, Windows o Linux | |

## Instalar y abrir

**Mac (lo más fácil):** descarga el repo ([Code → Download ZIP](https://github.com/frontdesk-alhouse/panel-de-marca/archive/refs/heads/main.zip)), descomprímelo y haz doble clic en `Iniciar.command`. La primera vez instala y construye todo (2-3 minutos); después abre el panel en tu navegador.

> Si macOS dice que no puede abrirlo: clic derecho → Abrir → Abrir.

**Cualquier sistema (terminal):**

```bash
git clone https://github.com/frontdesk-alhouse/panel-de-marca.git
cd panel-de-marca
npm install
npm run setup     # crea .env.local y construye la app
npm start         # abre http://127.0.0.1:3000
```

El panel se actualiza solo **mientras está abierto** (revisa cada 10 minutos qué fuente toca). Si la computadora estuvo apagada, se pone al día al abrirlo.

## Qué se conecta y cuánto cuesta

Todo se conecta desde el panel (**Ajustes → Conexiones**), con los pasos y links de cada plataforma y un botón «Probar conexión». Ninguna conexión es obligatoria.

| Conexión | Enciende | Costo |
|---|---|---|
| Nada | CRM, Negocio, Ideas de contenido (autocompletado de Google y blogs de la competencia) | Gratis |
| [PageSpeed Insights](https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com) | Velocidad del sitio y comparación con la competencia | Gratis |
| [Microsoft Clarity](https://clarity.microsoft.com/projects) | Comportamiento: clics de enojo, scroll, regresos rápidos | Gratis |
| [Google Analytics y Search Console](https://console.cloud.google.com/auth/clients/create) | Tráfico, conversiones y SEO | Gratis |
| [Meta](https://business.facebook.com/settings/system-users) | Instagram orgánico y Meta Ads | Gratis |
| [Google Ads](https://ads.google.com/aw/apicenter) (avanzado) | Campañas, términos y costo por lead | Gratis (Google aprueba un token) |
| [Apify](https://console.apify.com/sign-up) | Posiciones en Google, Google Maps, backlinks e Instagram de la competencia, Reddit | Gratis hasta US$5 de crédito al mes; el panel usa ~US$3-5 |
| [Claude (Anthropic)](https://console.anthropic.com/settings/keys) | Chat con tus datos, análisis semanal, plan de medios y el borrador de tu marca | Pago por uso: centavos por análisis, ~US$1 por plan de medios |

Para Google usas **tu propio** proyecto de Google Cloud con un cliente OAuth de tipo «App de escritorio»; el panel te lleva paso a paso. Google mostrará «Google no verificó esta app»: es normal, la app es tuya.

## Tus datos y tus llaves

- La base de datos vive en `data/` y las llaves en `.env.local` (solo legible por tu usuario). Ninguna de las dos se sube a git.
- El panel solo escucha en `127.0.0.1`: si por error quedara visible para tu red, se apaga solo.
- Para respaldar: copia la carpeta `data/` y el archivo `.env.local` con el panel cerrado.

## Actualizar

```bash
git pull
npm install
npm start          # reconstruye si hay código nuevo; la base se actualiza sola
```

## Problemas comunes

| Síntoma | Solución |
|---|---|
| «La base local está abierta por otro proceso» | Ya hay un panel abierto. Ciérralo (Ctrl+C en su terminal) o usa ese. |
| El navegador dice que no puede conectar | Revisa que la terminal siga abierta; el panel se apaga al cerrarla. |
| Google pide volver a conectar cada 7 días | Publica la pantalla de consentimiento («Publicar app») en Google Cloud → Público. |
| «El panel se puede abrir desde la red… se apaga» | Ábrelo con `npm start` (no con `next start` a secas). |
| Una sección dice «Conectar» | Esa sección necesita la conexión que indica; el botón te lleva a Ajustes. |
| Puerto 3000 ocupado | `PORT=4000 npm start` |

## Para desarrolladores

- Next.js 16, React 19, Tailwind 4, Drizzle (PGlite en local; Postgres en la nube), zod.
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint`.
- `npm run test:e2e`: recorre la configuración inicial y el panel en un navegador real (Playwright) con una base nueva y sin llaves. La primera vez: `npx playwright install chromium`.
- Cambios al esquema: edita `src/db/schema.ts` y corre `npm run db:generate`; la migración se aplica sola al abrir.
- **Modo nube (opcional):** el mismo código corre en Vercel con Postgres (Neon) y login de Google con lista de correos. Ver `.env.example` (sección «Solo modo nube»); la configuración de la marca se carga con `scripts/import-workspace.ts`.
- Traducciones: `src/i18n/es.ts` es la fuente; `en.ts` comparte el tipo y no compila si le falta algo.
- Tipografías: el panel usa Bricolage Grotesque e Instrument Sans (OFL). Para usar las de tu marca, pon sus archivos en `src/app/fonts/brand/` con un `index.ts` como el de `src/app/fonts/open.ts`.

## Licencia

[MIT](LICENSE) © 2026 Alto House. Hecho por [Alto House](https://altohouse.mx), un estudio de brand management en Guadalajara.
