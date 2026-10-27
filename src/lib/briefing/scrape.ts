import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";
import { internalLinks, pageFacts, pickKeyPages, siteFacts, type PageFacts, type SiteFacts } from "./extract";

/**
 * Lee el sitio de una marca para el briefing: inicio + sitemap + hasta 14 páginas clave.
 * Respeta robots.txt, identifica al panel en el User-Agent y corta a los pocos segundos
 * por página. No necesita ninguna llave.
 */
export interface SiteProfile {
  domain: string;
  origin: string;
  facts: SiteFacts;
  pages: PageFacts[];
  /** Cuántas URLs encontró en total (sitemap o enlaces). */
  found: number;
}

const UA = "Mozilla/5.0 (compatible; PanelDeMarca/1.0; +https://github.com/)";
const PAGE_TIMEOUT_MS = 8_000;
/** Tope por página: la extracción usa expresiones que se vuelven lentas con HTML enorme o roto. */
const MAX_HTML_BYTES = 300_000;
const MAX_XML_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const MAX_CHILD_SITEMAPS = 5;

/** Error para la persona; el texto sale del diccionario según `code` (ver i18n server.scrape). */
export type ScrapeErrorCode = "notAUrl" | "notPublic" | "unreachable";
export class ScrapeError extends Error {
  constructor(public readonly code: ScrapeErrorCode, public readonly domain = "") {
    super(`${code}${domain ? `: ${domain}` : ""}`);
    this.name = "ScrapeError";
  }
}

/** «https://www.Estudio.mx/inicio» → «estudio.mx». Rechaza IPs y nombres sin punto. */
export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  let host: string;
  try {
    host = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
  } catch {
    throw new ScrapeError("notAUrl");
  }
  host = host.replace(/^www\./, "").replace(/\.$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".local") || host.endsWith(".localhost")) {
    throw new ScrapeError("notPublic");
  }
  return host;
}

/** Rangos que no son internet público: la lectura nunca va a la red local ni a esta computadora. */
const PRIVATE = new BlockList();
for (const [net, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4]] as const) PRIVATE.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10]] as const) PRIVATE.addSubnet(net, prefix, "ipv6");

async function isPublicHost(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !PRIVATE.check(a.address, a.family === 6 ? "ipv6" : "ipv4"));
  } catch {
    return false;
  }
}

/** Lee el cuerpo hasta un tope de bytes (no carga en memoria una respuesta gigante). */
async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, max));
}

/**
 * Descarga dentro del sitio que se lee: http(s), solo el dominio y su «www.», nunca a
 * direcciones privadas, y siguiendo a mano hasta 3 redirecciones con las mismas reglas.
 * Así un sitio no puede mandar al lector a servicios de esta computadora o de la red local.
 */
async function fetchText(url: string, domain: string, kind: "html" | "xml" = "html", userAgent = UA): Promise<{ url: string; text: string } | null> {
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(current);
      const host = u.hostname.toLowerCase();
      if (!/^https?:$/.test(u.protocol) || (host !== domain && host !== `www.${domain}`) || !(await isPublicHost(host))) return null;
      const res = await fetch(u, { headers: { "User-Agent": userAgent, Accept: "text/html,application/xml;q=0.9,*/*;q=0.5" }, redirect: "manual", signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        if (!next) return null;
        current = new URL(next, u).toString();
        continue;
      }
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "";
      if (!/html|xml|text\/plain/i.test(type)) return null;
      return { url: current, text: await readCapped(res, kind === "xml" ? MAX_XML_BYTES : MAX_HTML_BYTES) };
    }
    return null;
  } catch {
    return null;
  }
}

/** El mismo lector protegido, para medir sitios de la competencia (src/sources/competitors.ts). */
export const fetchFromSite = fetchText;

/** Reglas de robots.txt para «*» y para nuestro agente: rutas prohibidas y sitemaps. */
export function parseRobots(text: string): { disallow: string[]; sitemaps: string[] } {
  const disallow: string[] = [];
  const sitemaps: string[] = [];
  let applies = false;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, field, value] = m;
    const key = field.toLowerCase();
    if (key === "sitemap") { sitemaps.push(value.trim()); continue; }
    if (key === "user-agent") {
      const agent = value.trim().toLowerCase();
      const match = agent === "*" || agent.includes("paneldemarca");
      applies = lastWasAgent ? applies || match : match;
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (applies && key === "disallow" && value.trim()) disallow.push(value.trim());
  }
  return { disallow, sitemaps };
}

export const isAllowed = (path: string, disallow: string[]): boolean =>
  !disallow.some((rule) => {
    const re = new RegExp(`^${rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
    return re.test(path);
  });

const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

async function sitemapUrls(origin: string, domain: string, fromRobots: string[]): Promise<string[]> {
  const first = fromRobots.length ? fromRobots : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  for (const url of first) {
    const res = await fetchText(url, domain, "xml");
    if (!res || !/<(urlset|sitemapindex)/i.test(res.text)) continue;
    if (!/<sitemapindex/i.test(res.text)) return locs(res.text);
    const children = locs(res.text).slice(0, MAX_CHILD_SITEMAPS);
    const lists = await Promise.all(children.map(async (c) => locs((await fetchText(c, domain, "xml"))?.text ?? "")));
    return lists.flat();
  }
  return [];
}

export async function scrapeSite(input: string): Promise<SiteProfile> {
  const domain = normalizeDomain(input);
  const home = (await fetchText(`https://${domain}/`, domain)) ?? (await fetchText(`https://www.${domain}/`, domain));
  if (!home) throw new ScrapeError("unreachable", domain);
  const origin = new URL(home.url).origin;
  const robots = parseRobots((await fetchText(`${origin}/robots.txt`, domain))?.text ?? "");
  const fromSitemap = await sitemapUrls(origin, domain, robots.sitemaps);
  const candidates = fromSitemap.length ? fromSitemap : internalLinks(home.text, origin);
  const normalized = candidates.map((u) => { try { const x = new URL(u); return `${origin}${x.pathname}`.replace(/\/$/, ""); } catch { return ""; } }).filter(Boolean);
  const chosen = pickKeyPages(normalized, origin).filter((u) => isAllowed(new URL(u).pathname, robots.disallow));
  const pages = (await Promise.all(chosen.map((u) => fetchText(u, domain)))).filter((p): p is { url: string; text: string } => Boolean(p));
  return {
    domain,
    origin,
    facts: siteFacts(home.text, pages.map((p) => p.text)),
    pages: [pageFacts(home.url, home.text), ...pages.map((p) => pageFacts(p.url, p.text))],
    found: candidates.length,
  };
}
