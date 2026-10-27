import { crawlerUserAgent, localeSettings, ws } from "@/lib/workspace/store";
import { competitors } from "@/lib/scorecard/config";
import { harvest, isApifyConfigured } from "@/lib/apify";
import { sitemapUrls } from "@/sources/competitors";
import { IDEA_PREFIXES } from "./config";
import { defaultExcludePatterns } from "./regions";
import type { Content } from "@/lib/workspace/schema";

export interface IdeaHit {
  source: "autocomplete" | "reddit" | "competitor" | "paa";
  text: string;
  url: string | null;
  seed: string;
  rank: number;
  meta?: Record<string, unknown>;
}

const TIMEOUT_MS = 10_000;
const BLOG_PATTERN = /\/(blog|journal|insights|articulos|articles|notas|news|noticias|recursos)\/[^/]+/i;
const CONCURRENCY = 8;
const REDDIT_PAUSE_MS = 1200;

const JOBS = /\b(vacante|vacantes|trabajo|empleo|sueldo|salario|pr[aá]cticas|internship|job)/i;

/**
 * Filtros de la marca (configuración «content»): solo ideas del tema y sin otros
 * países. Se arman igual que las constantes de antes para que nada cambie:
 * relevantes = (a|b|c), excluidos = \b(a|b|c). Sin \b al final: la tilde (perú)
 * no cuenta como letra para \b.
 */
const excludeRegex = (patterns: string[]) => (patterns.length ? new RegExp(`\\b(${patterns.join("|")})`, "i") : null);

const filterCache = new WeakMap<Content, { relevant: RegExp | null; exclude: RegExp | null }>();
export function ideaFilters(content: Content = ws().content, locale: string = localeSettings().locale) {
  let f = filterCache.get(content);
  if (!f) {
    f = {
      relevant: content.relevantPatterns.length ? new RegExp(`(${content.relevantPatterns.join("|")})`, "i") : null,
      exclude: excludeRegex(content.excludePatterns.length ? content.excludePatterns : defaultExcludePatterns(locale)),
    };
    filterCache.set(content, f);
  }
  return f;
}

const isOnTopic = (text: string) => ideaFilters().relevant?.test(text) ?? true;
export const isRelevantIdea = (text: string) => isOnTopic(text) && !ideaFilters().exclude?.test(text) && !JOBS.test(text);

/** Autocompletado en el idioma y país de la marca (es-MX → hl=es, gl=mx). */
export function autocompleteParams(locale = localeSettings().locale): string {
  const [lang, region] = locale.split("-");
  const params = new URLSearchParams({ hl: lang.toLowerCase() });
  if (region) params.set("gl", region.toLowerCase());
  return params.toString();
}

async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) out.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(fn))));
  return out;
}

/** Sugerencias del autocompletado de Google para México; el orden refleja popularidad. */
export async function autocomplete(): Promise<IdeaHit[]> {
  const seeds = ws().content.topics.flatMap((t) => IDEA_PREFIXES.map((p) => `${p}${t}`));
  const params = autocompleteParams();
  const lists = await inBatches(seeds, async (seed) => {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&${params}&q=${encodeURIComponent(seed)}`;
      const res = await fetch(url, { headers: { "User-Agent": crawlerUserAgent() }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return [];
      const json = (await res.json()) as [string, string[]];
      return (json[1] ?? [])
        .filter((s) => s.toLowerCase() !== seed.toLowerCase() && isRelevantIdea(s))
        .map((text, i): IdeaHit => ({ source: "autocomplete", text: text.toLowerCase(), url: null, seed, rank: i + 1 }));
    } catch {
      return [];
    }
  });
  // La misma sugerencia puede salir de varias semillas: quedarse con su mejor lugar.
  const best = new Map<string, IdeaHit>();
  for (const h of lists.flat()) if (!best.has(h.text) || best.get(h.text)!.rank > h.rank) best.set(h.text, h);
  return [...best.values()];
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Actor de Apify para Reddit: desde Vercel, Reddit bloquea las consultas sin cuenta. */
export const REDDIT_ACTOR = "fatihtahta/reddit-scraper-search-fast";
const REDDIT_EVERY_DAYS = 7;
/** 16 búsquedas × 12 posts × semanal ≈ $1.2 USD al mes. */
const REDDIT_MAX_POSTS = 12;

interface ApifyRedditPost { kind?: string; title?: string; url?: string; permalink?: string; subreddit?: string; score?: number; num_comments?: number; created_utc?: string; query?: string }

/** Tema de la búsqueda que trajo el post (negocio, marketing, web, branding, IA). */
function topicOf(query?: string) {
  return ws().content.redditSearches.find((r) => query?.startsWith(r.q))?.topic ?? null;
}

/** Convierte los posts del actor en ideas (ignora comentarios y posts sin título). */
export function redditFromApifyItems(items: ApifyRedditPost[]): IdeaHit[] {
  const posts = items.filter((p) => p.title && (p.kind ?? "post").startsWith("post"));
  return posts.map((p, i) => ({
    source: "reddit" as const, text: p.title!.trim(),
    url: p.permalink ? (p.permalink.startsWith("http") ? p.permalink : `https://www.reddit.com${p.permalink}`) : p.url ?? null,
    seed: p.query ?? `r/${p.subreddit ?? "?"}`, rank: i + 1,
    meta: { subreddit: p.subreddit, score: p.score, comments: p.num_comments, published: p.created_utc, topic: topicOf(p.query) },
  }));
}

async function redditViaApify(): Promise<IdeaHit[]> {
  const input = {
    queries: ws().content.redditSearches.map(({ sub, q }) => `${q} subreddit:${sub}`),
    sort: "top", timeframe: "month", maxPosts: REDDIT_MAX_POSTS, scrapeComments: false, includeNsfw: false,
  };
  const { items } = await harvest<ApifyRedditPost>(REDDIT_ACTOR, input, { everyDays: REDDIT_EVERY_DAYS, maxChargeUsd: 0.5 });
  return redditFromApifyItems(items);
}

/** Conversaciones más votadas del último mes: Apify si hay token; si no, RSS público de Reddit. */
export async function reddit(): Promise<IdeaHit[]> {
  if (isApifyConfigured()) {
    try {
      return (await redditViaApify()).filter((h) => isOnTopic(h.text));
    } catch (e) {
      console.error("[ideas] Reddit vía Apify falló; se usa RSS", e instanceof Error ? e.message : e);
    }
  }
  // En fila y con pausa: Reddit corta varias consultas simultáneas.
  const lists: IdeaHit[][] = [];
  for (const { sub, q } of ws().content.redditSearches) lists.push(await redditSearch(sub, q));
  return lists.flat().filter((h) => isOnTopic(h.text));
}

let redditToken: Promise<string | null> | null = null;

/** Olvida el token (al cambiar las llaves de Reddit en la configuración). */
export function resetRedditToken(): void {
  redditToken = null;
}

/** Token de solo lectura de la API oficial (app gratuita en reddit.com/prefs/apps). */
function getRedditToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return Promise.resolve(null);
  redditToken ??= fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": crawlerUserAgent() },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(async (r) => (r.ok ? ((await r.json()) as { access_token?: string }).access_token ?? null : null)).catch(() => null);
  return redditToken;
}

interface RedditPost { data: { title: string; permalink: string; score: number; num_comments: number; created_utc: number; subreddit: string } }

async function redditApi(token: string, sub: string, q: string): Promise<IdeaHit[]> {
  const url = `https://oauth.reddit.com/r/${sub}/search?q=${encodeURIComponent(q)}&restrict_sr=1&sort=top&t=month&limit=25`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": crawlerUserAgent() }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: { children?: RedditPost[] } };
  return (json.data?.children ?? []).map(({ data: p }, i): IdeaHit => ({
    source: "reddit", text: p.title.trim(), url: `https://www.reddit.com${p.permalink}`, seed: `r/${sub} · ${q}`, rank: i + 1,
    meta: { subreddit: p.subreddit, score: p.score, comments: p.num_comments, published: new Date(p.created_utc * 1000).toISOString() },
  }));
}

async function redditSearch(sub: string, q: string): Promise<IdeaHit[]> {
  const token = await getRedditToken();
  if (token) return redditApi(token, sub, q).catch(() => []);
  await new Promise((r) => setTimeout(r, REDDIT_PAUSE_MS));
  try {
      const url = `https://www.reddit.com/r/${sub}/search.rss?q=${encodeURIComponent(q)}&restrict_sr=1&sort=top&t=month&limit=15`;
      const res = await fetch(url, { headers: { "User-Agent": crawlerUserAgent() }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return [];
      const xml = await res.text();
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
      return entries.map((e, i): IdeaHit | null => {
        const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1];
        const link = e.match(/<link href="([^"]+)"/)?.[1];
        const published = e.match(/<published>([^<]+)<\/published>/)?.[1];
        if (!title || !link) return null;
        return { source: "reddit", text: decode(title).trim(), url: link, seed: `r/${sub} · ${q}`, rank: i + 1, meta: { subreddit: sub, published } };
      }).filter((x): x is IdeaHit => x !== null);
  } catch {
    return [];
  }
}

/** Título legible a partir del slug de la URL. */
export function titleFromUrl(url: string): string {
  const slug = decodeURIComponent(url.replace(/\/$/, "").split("/").pop() ?? "");
  const t = slug.replace(/[-_]+/g, " ").replace(/\.\w+$/, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Artículos publicados por la competencia (de su sitemap), con link. */
export async function competitorArticles(): Promise<IdeaHit[]> {
  const lists = await Promise.all(competitors().filter((c) => !c.self).map(async (c) => {
    const urls = (await sitemapUrls(c.domain).catch(() => null)) ?? [];
    return urls.filter((u) => BLOG_PATTERN.test(u)).map((u, i): IdeaHit => ({
      source: "competitor", text: titleFromUrl(u), url: u, seed: c.name, rank: i + 1, meta: { domain: c.domain },
    }));
  }));
  return lists.flat();
}
