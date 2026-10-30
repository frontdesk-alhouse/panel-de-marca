import { isAllowed, parseRobots, rulesFor } from "./robots";
import { detectChallenge, detectPlatform, jsonldTypes, normalizeText } from "./html";

/**
 * Chequeo técnico de GEO: ¿los asistentes de IA pueden leer el sitio y entender
 * quién es la marca? Port del núcleo de check_html_crudo.py (skill seo-geo).
 * El UA se imita desde el servidor del panel: un bloqueo por IP verificada no se ve aquí.
 */
export const BOT_UAS: Record<string, string> = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  "Claude-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)",
  "Claude-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://www.anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
};
const UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Los que alimentan respuestas con búsqueda: si no entran, el asistente no te puede citar. */
export const SEARCH_BOTS = ["Googlebot", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];
/** Visitas en nombre de una persona (cuando alguien le pasa tu URL al asistente). */
export const USER_BOTS = ["ChatGPT-User", "Claude-User"];
/** Entrenamiento: bloquearlos es decisión de la marca, no un error. */
export const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

export type Severity = "error" | "warn" | "info";

export interface GeoCheck {
  id: string;
  ok: boolean;
  severity: Severity;
  title: string;
  detail: string;
  /** Qué hacer si falla. */
  fix: string;
}

export interface BotResult { bot: string; status: number | null; blocked: boolean; challenge: boolean; brandVisible: boolean }

export interface GeoReport {
  url: string;
  checkedAt: string;
  platform: string | null;
  bots: BotResult[];
  jsonld: string[];
  checks: GeoCheck[];
}

interface Fetched { status: number | null; body: string; headers: Headers | null; error?: string }

const TIMEOUT_MS = 20_000;
/** Una Home real pesa menos; más que esto no se lee (protege la memoria del servidor). */
const MAX_BODY_BYTES = 3_000_000;

/** Solo dominios públicos: nada de IPs, localhost ni nombres internos (también tras redirecciones). */
export function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+(\.\d+){3}$/.test(h) || h.includes(":")) return false; // IPv4 o IPv6 literal
  return true;
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    if (size >= MAX_BODY_BYTES) { await reader.cancel(); break; }
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function get(url: string, ua: string): Promise<Fetched> {
  try {
    if (!isPublicHost(new URL(url).hostname)) return { status: null, body: "", headers: null, error: "Host no público" };
    const res = await fetch(url, { headers: { "user-agent": ua, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!isPublicHost(new URL(res.url || url).hostname)) {
      await res.body?.cancel();
      return { status: null, body: "", headers: null, error: "Redirigió a un host no público" };
    }
    return { status: res.status, body: await readCapped(res), headers: res.headers };
  } catch (err) {
    return { status: null, body: "", headers: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * En qué está hecho el sitio, leyendo su portada una vez (mismas protecciones que el chequeo:
 * solo hosts públicos, cuerpo acotado). null si no se reconoce o no responde.
 */
export async function detectSitePlatform(domain: string): Promise<ReturnType<typeof detectPlatform>> {
  const clean = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!clean) return null;
  const home = await get(`https://${clean}/`, "Mozilla/5.0 (compatible; AltoDashboard/1.0; +https://github.com/frontdesk-alhouse/panel-de-marca)");
  return home.body ? detectPlatform(home.body) : null;
}

const ENTITY_TYPES = /Organization|LocalBusiness|Store|Restaurant|Bakery|Clinic|Physician|Dentist|Attorney|Agency|Service|Corporation|Brand|Person|Place/;

const STOP = new Set(["para", "with", "from", "de", "del", "la", "las", "los", "el", "en", "y", "e", "o", "and", "the", "por", "con", "una", "uno"]);

/** Un servicio «se ve» si aparece al menos la mitad de sus palabras con peso (no exige la frase exacta). */
export function serviceVisible(service: string, normalizedText: string): boolean {
  const words = normalizeText(service).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !STOP.has(w));
  if (!words.length) return normalizedText.includes(normalizeText(service));
  const hits = words.filter((w) => new RegExp(`\\b${w}`).test(normalizedText)).length;
  return hits >= Math.ceil(words.length / 2);
}

export interface GeoInput {
  origin: string;
  brandName: string;
  services: readonly string[];
}

/** Arma los chequeos a partir de lo ya descargado (puro: se prueba sin red). */
export function evaluate(input: GeoInput, home: Fetched, bots: Map<string, Fetched>, aux: { robots: Fetched; sitemap: Fetched; llms: Fetched }): GeoReport {
  const brand = normalizeText(input.brandName);
  const botResults: BotResult[] = [...bots.entries()].map(([bot, r]) => {
    const challenge = detectChallenge(r.body, r.headers ?? {});
    const blocked = r.status === null || r.status >= 400 || challenge;
    return { bot, status: r.status, blocked, challenge, brandVisible: !blocked && normalizeText(r.body).includes(brand) };
  });
  const robotsText = aux.robots.status === 200 ? aux.robots.body : "";
  const groups = parseRobots(robotsText);
  const robotsBlocks = (bots: readonly string[]) => bots.filter((b) => !isAllowed(rulesFor(groups, b).rules, "/").allowed);
  const html = home.body;
  const text = normalizeText(html);
  const { types, broken } = jsonldTypes(html);
  const xRobots = home.headers?.get("x-robots-tag") ?? "";
  const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const servicesSeen = input.services.filter((s) => serviceVisible(s, text));
  const blockedSearch = botResults.filter((b) => SEARCH_BOTS.includes(b.bot) && b.blocked).map((b) => b.bot);
  const blockedUser = botResults.filter((b) => USER_BOTS.includes(b.bot) && b.blocked).map((b) => b.bot);
  const robotsSearch = robotsBlocks([...SEARCH_BOTS, ...USER_BOTS]);
  const robotsTraining = robotsBlocks(TRAINING_BOTS);

  const checks: GeoCheck[] = [
    {
      id: "search_bots_reach", severity: "error", ok: blockedSearch.length === 0,
      title: "Los buscadores de IA pueden entrar al sitio",
      detail: blockedSearch.length ? `Bloqueados o con reto anti-bot: ${blockedSearch.join(", ")}.` : `Responden bien: ${SEARCH_BOTS.join(", ")}.`,
      fix: "Revisar el firewall/CDN (Cloudflare: «Block AI bots» o reglas de bots) y permitir a los buscadores de IA.",
    },
    {
      id: "user_bots_reach", severity: "warn", ok: blockedUser.length === 0,
      title: "Los asistentes pueden abrir una página cuando alguien la pide",
      detail: blockedUser.length ? `Bloqueados: ${blockedUser.join(", ")}.` : "ChatGPT y Claude abren el sitio a petición de una persona.",
      fix: "Permitir ChatGPT-User y Claude-User en el firewall o CDN.",
    },
    {
      id: "robots_search", severity: "error", ok: robotsSearch.length === 0,
      title: "robots.txt no bloquea a los buscadores de IA",
      detail: robotsSearch.length ? `robots.txt bloquea: ${robotsSearch.join(", ")}.` : "Ninguna regla bloquea la Home para buscadores ni asistentes.",
      fix: "Quitar el Disallow de esos bots (plantilla robots-ai-permitir del skill seo-geo).",
    },
    {
      id: "brand_raw_html", severity: "error", ok: text.includes(brand),
      title: "El nombre de la marca se ve sin JavaScript",
      detail: text.includes(brand) ? "El HTML crudo de la Home dice el nombre de la marca." : "El nombre no aparece en el HTML crudo: los bots que no ejecutan JavaScript no saben quién eres.",
      fix: "Poner el nombre en texto del HTML (título, H1 o primer párrafo), no solo en imagen o cargado por script.",
    },
    {
      id: "services_raw_html", severity: "warn", ok: input.services.length === 0 || servicesSeen.length > 0,
      title: "Los servicios se ven sin JavaScript",
      detail: input.services.length === 0 ? "No hay servicios configurados en el panel." : servicesSeen.length ? `Se leen: ${servicesSeen.slice(0, 5).join(", ")}.` : "Ningún servicio configurado aparece en el HTML crudo de la Home.",
      fix: "Nombrar los servicios en texto en la Home y enlazar a una página por servicio.",
    },
    {
      id: "jsonld_entity", severity: "warn", ok: types.some((t) => ENTITY_TYPES.test(t)),
      title: "Schema de la entidad (Organization o LocalBusiness)",
      detail: types.length ? `Tipos JSON-LD: ${types.join(", ")}.` : "No hay JSON-LD en el HTML crudo.",
      fix: "Agregar JSON-LD Organization/LocalBusiness con sameAs (skill seo-geo, references/baseline).",
    },
    {
      id: "jsonld_valid", severity: "error", ok: broken === 0,
      title: "El JSON-LD se puede leer",
      detail: broken ? `${broken} bloque(s) JSON-LD con error de sintaxis.` : "Todos los bloques JSON-LD parsean.",
      fix: "Validar en validator.schema.org y corregir la sintaxis.",
    },
    {
      id: "indexable", severity: "error", ok: !/noindex/i.test(xRobots) && !metaNoindex,
      title: "La Home se puede indexar",
      detail: /noindex/i.test(xRobots) ? "Cabecera X-Robots-Tag con noindex." : metaNoindex ? "Meta robots con noindex." : "Sin noindex.",
      fix: "Quitar noindex (en Webflow/Framer: ajustes de SEO de la página o del sitio).",
    },
    {
      id: "robots_txt", severity: "warn", ok: aux.robots.status === 200,
      title: "Existe /robots.txt",
      detail: `Respondió ${aux.robots.status ?? aux.robots.error ?? "sin respuesta"}.`,
      fix: "Publicar un robots.txt con la directiva Sitemap.",
    },
    {
      id: "sitemap", severity: "warn", ok: aux.sitemap.status === 200,
      title: "Existe /sitemap.xml",
      detail: `Respondió ${aux.sitemap.status ?? aux.sitemap.error ?? "sin respuesta"}.`,
      fix: "Activar el sitemap automático de la plataforma y declararlo en robots.txt.",
    },
    {
      id: "llms_txt", severity: "info", ok: aux.llms.status === 200,
      title: "Existe /llms.txt (opcional)",
      detail: aux.llms.status === 200 ? "Publicado." : "No existe. Es especulativo: ningún asistente grande confirma usarlo.",
      fix: "Opcional: generar uno con generar_llms_txt.py del skill seo-geo.",
    },
    {
      id: "training_policy", severity: "info", ok: true,
      title: "Política de bots de entrenamiento",
      detail: robotsTraining.length ? `Bloqueas entrenamiento a: ${robotsTraining.join(", ")} (decisión válida; no afecta las citas).` : "Permites el entrenamiento (valor por defecto).",
      fix: "Es decisión de la marca; no cuenta en la calificación.",
    },
  ];

  return { url: input.origin, checkedAt: new Date().toISOString(), platform: detectPlatform(html), bots: botResults, jsonld: types, checks };
}

/** Proporción de chequeos que cuentan (error y aviso) y están bien. */
export function scoredChecks(report: Pick<GeoReport, "checks">): { ok: number; total: number } {
  const counted = report.checks.filter((c) => c.severity !== "info");
  return { ok: counted.filter((c) => c.ok).length, total: counted.length };
}

export async function runGeoCheck(input: GeoInput): Promise<GeoReport> {
  const url = `${input.origin}/`;
  const [home, robots, sitemap, llms, ...botFetches] = await Promise.all([
    get(url, UA_BROWSER),
    get(`${input.origin}/robots.txt`, UA_BROWSER),
    get(`${input.origin}/sitemap.xml`, UA_BROWSER),
    get(`${input.origin}/llms.txt`, UA_BROWSER),
    ...[...SEARCH_BOTS, ...USER_BOTS].map((b) => get(url, BOT_UAS[b])),
  ]);
  if (home.status === null) throw new Error(`No se pudo abrir ${url}: ${home.error ?? "sin respuesta"}`);
  const bots = new Map([...SEARCH_BOTS, ...USER_BOTS].map((b, i) => [b, botFetches[i]] as const));
  return evaluate(input, home, bots, { robots, sitemap, llms });
}
