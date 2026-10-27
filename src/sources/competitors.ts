import { crawlerUserAgent } from "@/lib/workspace/store";
import type { DateRange } from "@/lib/dates";
import { competitors } from "@/lib/scorecard/config";
import { servicePagePattern, serviceTitlePattern } from "@/lib/workspace/patterns";
import type { MetricRow, Source } from "./types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 240_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHILD_SITEMAPS = 10;
const BLOG_PATTERN = /\/(blog|journal|insights|articulos|articles|notas|news|noticias|recursos)\//i;

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": crawlerUserAgent() }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}


/** Señales de SEO on-page en el HTML de la Home. */
export function parseHome(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
  return {
    title,
    has_meta_description: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html) ? 1 : 0,
    has_schema: /application\/ld\+json/i.test(html) ? 1 : 0,
    h1_count: (html.match(/<h1[\s>]/gi) ?? []).length,
    has_canonical: /<link[^>]+rel=["']canonical["']/i.test(html) ? 1 : 0,
    indexable: /noindex/i.test(robots) ? 0 : 1,
    // Palabras de servicio que Google necesita ver en el título para asociar el sitio con las búsquedas objetivo.
    title_keyword: serviceTitlePattern()?.test(title) ? 1 : 0,
  };
}

const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

export interface SitemapEntry { loc: string; lastmod: string | null }

/** Entradas <url> con su lastmod, si lo publican. */
export function parseSitemapEntries(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((m) => ({
    loc: m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.[1] ?? "",
    lastmod: m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i)?.[1] ?? null,
  })).filter((e) => e.loc);
}

/** Entradas del sitemap (sigue un nivel de índice); null si no hay sitemap. */
export async function sitemapEntries(domain: string): Promise<SitemapEntry[] | null> {
  const root = (await get(`https://${domain}/sitemap.xml`)) ?? (await get(`https://www.${domain}/sitemap.xml`));
  if (!root) return null;
  if (/<sitemapindex/i.test(root)) {
    const children = await Promise.all(locs(root).slice(0, MAX_CHILD_SITEMAPS).map(get));
    return children.flatMap((x) => (x ? parseSitemapEntries(x) : []));
  }
  return parseSitemapEntries(root);
}

/** URLs del sitemap; null si no hay sitemap. */
export async function sitemapUrls(domain: string): Promise<string[] | null> {
  return (await sitemapEntries(domain))?.map((e) => e.loc) ?? null;
}

/** Señales de confianza (E-E-A-T): quién eres, cómo contactarte y prueba de trabajo. */
const TRUST_PATTERNS = {
  about: /\/(nosotros|about|estudio|studio|quienes-somos|equipo|team)\/?$/i,
  contact: /\/(contacto|contact|cotiza|cotizar)\/?$/i,
  work: /\/(proyectos|projects|work|trabajo|casos|case-studies|portafolio|portfolio)(\/|$)/i,
};

/** Resumen del sitemap para los factores de contenido, frescura y confianza. */
export function summarizeSitemap(entries: SitemapEntry[], today: string) {
  const urls = entries.map((e) => e.loc);
  const paths = urls.map((u) => { try { return new URL(u).pathname; } catch { return u; } });
  const dates = entries.map((e) => e.lastmod?.slice(0, 10)).filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d))).sort();
  const newest = dates.at(-1);
  return {
    urls: urls.length,
    blog: urls.filter((u) => BLOG_PATTERN.test(u)).length,
    // Páginas que responden a una búsqueda de servicio (de la configuración de la marca).
    service: paths.filter((p) => p !== "/" && Boolean(servicePagePattern()?.test(p)) && !BLOG_PATTERN.test(p)).length,
    trust: Object.values(TRUST_PATTERNS).filter((re) => paths.some((p) => re.test(p))).length,
    freshDays: newest ? Math.max(0, Math.round((Date.parse(today) - Date.parse(newest)) / 86_400_000)) : undefined,
  };
}

/** Cuántas URLs publica y cuántas parecen artículos. */
export async function countSitemap(domain: string): Promise<{ urls: number; blog: number } | null> {
  const entries = await sitemapEntries(domain);
  if (!entries) return null;
  const sum = summarizeSitemap(entries, new Date().toISOString().slice(0, 10));
  return { urls: sum.urls, blog: sum.blog };
}

async function psi(domain: string) {
  const params = new URLSearchParams({ url: `https://${domain}/`, strategy: "mobile", key: process.env.PSI_API_KEY as string });
  for (const c of ["performance", "seo", "accessibility"]) params.append("category", c);
  let res: Response;
  try {
    res = await fetch(`${PSI_ENDPOINT}?${params}`, { signal: AbortSignal.timeout(PSI_TIMEOUT_MS) });
  } catch (err) {
    // Sitios pesados pueden pasar del tiempo: se guarda lo demás y PageSpeed se reintenta en su turno.
    console.warn(`[comp] PageSpeed de ${domain} no respondió:`, err instanceof Error ? err.name : err);
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    lighthouseResult?: { categories?: Record<string, { score?: number | null }>; audits?: Record<string, { numericValue?: number }> };
  };
  const cats = json.lighthouseResult?.categories ?? {};
  const score = (k: string) => (typeof cats[k]?.score === "number" ? (cats[k].score as number) * 100 : undefined);
  return {
    perf: score("performance"),
    seo: score("seo"),
    a11y: score("accessibility"),
    lcp_ms: json.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue,
  };
}

/** Un sitio por día, en orden; con seis sitios cada uno se mide cada seis días. */
export function siteForDate(isoDate: string) {
  const day = Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
  return competitors()[day % competitors().length];
}

/** `withSpeed: false` para el sitio propio: su PageSpeed ya lo mide la fuente psi. */
export async function measureSite(domain: string, date: string, withSpeed = true): Promise<MetricRow[]> {
  const [home, entries, speed] = await Promise.all([get(`https://${domain}/`), sitemapEntries(domain), withSpeed ? psi(domain) : null]);
  const sitemap = entries ? summarizeSitemap(entries, date) : null;
  const dimKey = `site:${domain}`;
  const rows: MetricRow[] = [];
  const push = (metric: string, value: number | undefined, meta?: Record<string, unknown>) => {
    if (value !== undefined && Number.isFinite(value)) rows.push({ source: "comp", metric, dimKey, date, value, meta });
  };
  if (home) {
    const h = parseHome(home);
    push("has_meta_description", h.has_meta_description, { title: h.title.slice(0, 160) });
    push("has_schema", h.has_schema);
    push("h1_count", h.h1_count);
    push("has_canonical", h.has_canonical);
    push("indexable", h.indexable);
    push("title_keyword", h.title_keyword);
  }
  push("has_https", home ? 1 : 0);
  push("has_sitemap", sitemap ? 1 : 0);
  if (sitemap) {
    push("sitemap_urls", sitemap.urls);
    push("blog_urls", sitemap.blog);
    push("service_urls", sitemap.service);
    push("trust_pages", sitemap.trust);
    push("fresh_days", sitemap.freshDays);
  }
  if (speed) {
    push("perf", speed.perf);
    push("seo", speed.seo);
    push("a11y", speed.a11y);
    push("lcp_ms", speed.lcp_ms);
  }
  return rows;
}

export const competitorsSource: Source = {
  id: "comp",
  label: "Competencia",
  isConfigured: () => Boolean(process.env.PSI_API_KEY),
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const site = process.argv.includes("--all") ? null : siteForDate(range.to);
    const targets = site ? [site] : competitors();
    const results = await Promise.all(targets.map((s) => measureSite(s.domain, range.to, !s.self)));
    return results.flat();
  },
};
