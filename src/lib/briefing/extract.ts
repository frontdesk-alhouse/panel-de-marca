/**
 * Extracción pura del HTML de un sitio: lo que se puede saber sin IA.
 * Separado de la descarga (scrape.ts) para probarlo sin red.
 */
export interface PageFacts {
  url: string;
  title: string;
  description: string;
  headings: string[];
  /** Texto visible, sin menús ni scripts, recortado. */
  text: string;
}

export interface SiteFacts {
  name: string | null;
  lang: string | null;
  city: string | null;
  phone: string | null;
  instagram: string | null;
  socials: string[];
  /** Montos que aparecen en el sitio («$45,000 MXN», «desde $1,200»). */
  prices: string[];
}

const MAX_TEXT = 4000;

export const decodeEntities = (s: string): string =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const clean = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const meta = (html: string, attr: "name" | "property", key: string): string => {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0] ?? "";
  return decodeEntities(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "").trim();
};

/** Texto visible: quita scripts, estilos, menús y pie para quedarse con el contenido. */
export function visibleText(html: string): string {
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return clean(body).slice(0, MAX_TEXT);
}

export function pageFacts(url: string, html: string): PageFacts {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = meta(html, "name", "description") || meta(html, "property", "og:description");
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => clean(m[2])).filter((h) => h.length > 1 && h.length < 160).slice(0, 25);
  return { url, title, description, headings, text: visibleText(html) };
}

/** Objetos JSON-LD (incluye los que vienen en @graph o en arreglos). */
export function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed: unknown = JSON.parse(m[1].trim());
      const stack: unknown[] = [parsed];
      while (stack.length) {
        const item = stack.pop();
        if (Array.isArray(item)) stack.push(...item);
        else if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          out.push(obj);
          if (Array.isArray(obj["@graph"])) stack.push(...obj["@graph"]);
        }
      }
    } catch {
      // JSON-LD roto: se ignora
    }
  }
  return out;
}

const ORG_TYPES = /(Organization|LocalBusiness|ProfessionalService|Store|Restaurant|MedicalBusiness|Physician|Dentist|LegalService|RealEstateAgent|HomeAndConstructionBusiness|AutomotiveBusiness|FoodEstablishment|HealthAndBeautyBusiness)/;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export const instagramHandle = (url: string): string | null => {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i);
  if (!m || ["p", "reel", "explore", "accounts", "stories"].includes(m[1].toLowerCase())) return null;
  return m[1];
};

const SOCIAL = /https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|youtube\.com|x\.com|twitter\.com|behance\.net|pinterest\.[a-z.]+)\/[^\s"'<>)]+/gi;
const PRICE = /(?:desde|from|a partir de)?\s*(?:\$|MXN|USD|US\$|€|£)\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?(?:\s?(?:MXN|USD|EUR|mil|k))?/gi;

/** Datos de la marca que no necesitan IA: nombre, idioma, ciudad, teléfono, redes y precios. */
export function siteFacts(homeHtml: string, pagesHtml: string[] = []): SiteFacts {
  const all = [homeHtml, ...pagesHtml];
  const org = all.flatMap(jsonLd).find((o) => ORG_TYPES.test(String(o["@type"] ?? "")));
  const address = (org?.address ?? null) as Record<string, unknown> | null;
  const sameAs = Array.isArray(org?.sameAs) ? (org?.sameAs as unknown[]).map(str).filter((x): x is string => Boolean(x)) : [];
  const socials = [...new Set([...sameAs, ...all.flatMap((h) => [...h.matchAll(SOCIAL)].map((m) => m[0].replace(/[\\]+$/, "")))])]
    .filter((u) => !/\/(sharer|share|intent|plugins|dialog)\b/i.test(u))
    .slice(0, 12);
  const instagram = socials.map(instagramHandle).find(Boolean) ?? null;
  const ogName = meta(homeHtml, "property", "og:site_name");
  const title = clean(homeHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const titleName = title.split(/\s[|·–—-]\s/)[0]?.trim() || null;
  const prices = [...new Set(all.flatMap((h) => visibleText(h).match(PRICE) ?? []).map((p) => p.trim().replace(/\s+/g, " ")))].slice(0, 20);
  return {
    name: str(org?.name) ?? (ogName || null) ?? titleName,
    lang: homeHtml.match(/<html[^>]+lang=["']([a-zA-Z-]+)["']/i)?.[1] ?? null,
    city: str(address?.addressLocality),
    phone: str(org?.telephone),
    instagram,
    socials,
    prices,
  };
}

/** Páginas que más dicen quién es la marca: servicios, nosotros, precios, contacto, proyectos. */
const KEY_PAGE = /(servicio|service|nosotros|about|acerca|quienes|qui[eé]nes|equipo|team|precio|pricing|paquete|plan|tarifa|contacto|contact|proyecto|portafolio|portfolio|trabajo|work|clientes|casos|soluciones|solutions|producto|product|menu|men[uú])/i;
const SKIP = /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|xml)$|\/(tag|tags|category|categoria|author|autor|page|feed|wp-|cart|checkout|login|cuenta|account)\b|(privacy|privacidad|terminos|t[eé]rminos|terms|legal|cookies|aviso|bolsa-de-trabajo|empleo|vacantes|careers|jobs|facturaci[oó]n|factura|invoice|splash)/i;

/** /en/…, /pt-br/…: traducciones de las mismas páginas; no dicen nada nuevo. */
const LANG_PREFIX = /^\/[a-z]{2}(?:-[a-z]{2})?(?:\/|$)/i;

export function pickKeyPages(urls: string[], origin: string, max = 14): string[] {
  const own = [...new Set(urls)]
    .filter((u) => u.startsWith(origin) && !SKIP.test(new URL(u).pathname) && !LANG_PREFIX.test(new URL(u).pathname))
    .map((u) => ({ u, depth: new URL(u).pathname.split("/").filter(Boolean).length, key: KEY_PAGE.test(new URL(u).pathname) }));
  own.sort((a, b) => Number(b.key) - Number(a.key) || a.depth - b.depth || a.u.length - b.u.length);
  return own.filter((p) => p.depth > 0 && p.depth <= 3).slice(0, max).map((p) => p.u);
}

/** Enlaces internos de una página (cuando no hay sitemap). */
export function internalLinks(html: string, origin: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], origin);
      if (u.origin === origin) out.add(`${u.origin}${u.pathname}`.replace(/\/$/, "") || origin);
    } catch {
      // href inválido
    }
  }
  return [...out];
}
