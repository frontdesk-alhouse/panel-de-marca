# Brand panel

**by [Alto House](https://altohouse.mx)** · [Español](README.md)

A marketing panel for agencies, studios and businesses that runs **on your computer**: your site, Google, ads, Instagram and your competitors in one place, with a 0–100 score, what to work on this week and, optionally, a Claude-powered analyst that answers with your data.

- **No servers or accounts.** Everything is stored on your computer (embedded database in `data/`). No login: it only opens on the same machine.
- **Guided setup.** The first time you open it, it reads your site, runs a briefing (who your competitors are, what you want to know about them, which content ideas to look for) and suggests searches and competitors from real data.
- **Free by default.** CRM, business and content ideas work without connecting anything. Each connection turns on more sections; only Claude and Apify cost (a little).
- **Spanish and English.** The setup, menus and section headers are translated; some in-section texts are still in Spanish (in progress).

## What you need

| | |
|---|---|
| Node.js 22 or newer (LTS) | [nodejs.org](https://nodejs.org) |
| git (optional, to update with one command) | [git-scm.com](https://git-scm.com/downloads) |
| Mac, Windows or Linux | |

## Install and open

**Mac (easiest):** download the repo ([Code → Download ZIP](https://github.com/frontdesk-alhouse/panel-de-marca/archive/refs/heads/main.zip)), unzip it and double-click `Iniciar.command`. The first time it installs and builds everything (2–3 minutes); then it opens the panel in your browser.

> If macOS says it can't open it: right-click → Open → Open.

**Any system (terminal):**

```bash
git clone https://github.com/frontdesk-alhouse/panel-de-marca.git
cd panel-de-marca
npm install
npm run setup     # creates .env.local and builds the app
npm start         # opens http://127.0.0.1:3000
```

The panel updates itself **while it's open** (every 10 minutes it checks which source is due). If the computer was off, it catches up when you open it.

## What connects and what it costs

Everything is connected from the panel (**Settings → Connections**), with each platform's steps and links and a «Test connection» button. No connection is required.

| Connection | Turns on | Cost |
|---|---|---|
| Nothing | CRM, Business, Content ideas (Google autocomplete and competitors' blogs) | Free |
| [PageSpeed Insights](https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com) | Site speed and comparison with competitors | Free |
| [Microsoft Clarity](https://clarity.microsoft.com/projects) | Behavior: rage clicks, scroll, quick backs | Free |
| [Google Analytics and Search Console](https://console.cloud.google.com/auth/clients/create) | Traffic, conversions and SEO | Free |
| [Meta](https://business.facebook.com/settings/system-users) | Organic Instagram and Meta Ads | Free |
| [Google Ads](https://ads.google.com/aw/apicenter) (advanced) | Campaigns, search terms and cost per lead | Free (Google approves a token) |
| [Apify](https://console.apify.com/sign-up) | Google rankings, Google Maps, backlinks and competitors' Instagram, Reddit | Free up to US$5 credit a month; the panel uses ~US$3–5 |
| [Claude (Anthropic)](https://console.anthropic.com/settings/keys) | Chat with your data, weekly analysis, media plan and the brand draft | Pay as you go: cents per analysis, ~US$1 per media plan |

For Google you use **your own** Google Cloud project with a «Desktop app» OAuth client; the panel walks you through it. Google will show «Google hasn't verified this app»: that's expected, the app is yours.

## Your data and keys

- The database lives in `data/` and the keys in `.env.local` (readable only by your user). Neither goes to git.
- The panel only listens on `127.0.0.1`: if it were ever reachable from your network, it shuts itself down.
- To back up: copy the `data/` folder and the `.env.local` file while the panel is closed.

## Update

```bash
git pull
npm install
npm start          # rebuilds if there's new code; the database updates itself
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| «La base local está abierta por otro proceso» | A panel is already open. Close it (Ctrl+C in its terminal) or use that one. |
| The browser can't connect | Make sure the terminal is still open; the panel stops when you close it. |
| Google asks to reconnect every 7 days | Publish the consent screen («Publish app») in Google Cloud → Audience. |
| «El panel se puede abrir desde la red… se apaga» | Open it with `npm start` (not plain `next start`). |
| A section says «Connect» | That section needs the connection it names; the button takes you to Settings. |
| Port 3000 is busy | `PORT=4000 npm start` |

## For developers

- Next.js 16, React 19, Tailwind 4, Drizzle (PGlite locally; Postgres in the cloud), zod.
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint`.
- `npm run test:e2e`: walks through the setup and the panel in a real browser (Playwright) with a fresh database and no keys. First time: `npx playwright install chromium`.
- Schema changes: edit `src/db/schema.ts` and run `npm run db:generate`; the migration applies itself on open.
- **Cloud mode (optional):** the same code runs on Vercel with Postgres (Neon) and Google login with an email allowlist. See `.env.example` («Solo modo nube» section); the brand setup is loaded with `scripts/import-workspace.ts`.
- Translations: `src/i18n/es.ts` is the source; `en.ts` shares its type and won't compile if anything is missing.
- Fonts: the panel uses Bricolage Grotesque and Instrument Sans (OFL). To use your brand's, put the files in `src/app/fonts/brand/` with an `index.ts` like `src/app/fonts/open.ts`.

## License

[MIT](LICENSE) © 2026 Alto House. Made by [Alto House](https://altohouse.mx), a brand management studio in Guadalajara, Mexico.
