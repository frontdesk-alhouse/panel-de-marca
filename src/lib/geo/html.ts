/** Lectura del HTML crudo, sin ejecutar JavaScript: lo que ve un bot de IA. */

const CHALLENGE_MARKERS = [
  "cf-chl", "challenge-platform", "just a moment...", "attention required! | cloudflare",
  "cf_chl_opt", "checking your browser", "verify you are human", "ddos-guard",
  "px-captcha", "captcha-delivery", "_incapsula_resource",
];

export function detectChallenge(body: string, headers: Headers | Record<string, string | null> = {}): boolean {
  const get = (k: string) => (headers instanceof Headers ? headers.get(k) : headers[k] ?? null);
  if ((get("cf-mitigated") ?? "").toLowerCase() === "challenge") return true;
  const head = body.slice(0, 20_000).toLowerCase();
  return CHALLENGE_MARKERS.some((m) => head.includes(m));
}

/** Tipos @type de todos los bloques JSON-LD, y cuántos bloques no parsean. */
export function jsonldTypes(html: string): { types: string[]; broken: number } {
  const types = new Set<string>();
  let broken = 0;
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      const t = (node as Record<string, unknown>)["@type"];
      for (const v of Array.isArray(t) ? t : [t]) if (typeof v === "string") types.add(v);
      Object.values(node).forEach(walk);
    }
  };
  for (const m of html.matchAll(re)) {
    try { walk(JSON.parse(m[1].trim())); } catch { broken += 1; }
  }
  return { types: [...types].sort(), broken };
}

/** Texto visible aproximado: sin scripts, estilos ni etiquetas; minúsculas y sin acentos. */
export function normalizeText(s: string): string {
  return s
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

/** Plataforma del sitio por huellas del HTML (para que Claude sepa dónde tocar). */
export function detectPlatform(html: string): "webflow" | "framer" | "wordpress" | "shopify" | "wix" | "squarespace" | null {
  const h = html.slice(0, 200_000).toLowerCase();
  if (h.includes("data-wf-site") || h.includes("webflow.com")) return "webflow";
  if (h.includes("framerusercontent.com") || h.includes('name="generator" content="framer')) return "framer";
  if (h.includes("wp-content/") || h.includes('content="wordpress')) return "wordpress";
  if (h.includes("cdn.shopify.com")) return "shopify";
  if (h.includes("static.wixstatic.com")) return "wix";
  if (h.includes("squarespace.com")) return "squarespace";
  return null;
}
