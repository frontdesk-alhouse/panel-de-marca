import type { Workspace } from "./schema";
import { localeSettings, ws } from "./store";

/**
 * Expresiones que dependen de cada marca y salen de su configuración. Si la marca da
 * los patrones, se usan tal cual; si no, se derivan de su ciudad, sus servicios y sus temas.
 */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Palabras de 4+ letras de servicios y temas, sin repetir: «diseño web» → diseño, web… */
function serviceWords(w: Workspace): string[] {
  const words = [...w.services, ...w.content.topics]
    .flatMap((s) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u))
    .filter((x) => x.length >= 4 && !STOPWORDS.has(x));
  return [...new Set(words)];
}
const STOPWORDS = new Set(["para", "with", "from", "como", "sobre", "your", "tienda", "servicio", "servicios", "agencia"]);

const cache = new WeakMap<Workspace, Map<string, RegExp | null>>();
function memo(w: Workspace, key: string, build: () => RegExp | null): RegExp | null {
  let m = cache.get(w);
  if (!m) cache.set(w, (m = new Map()));
  if (!m.has(key)) m.set(key, build());
  return m.get(key) ?? null;
}

/** Intención «local»: \b(ciudad|municipio|cerca de mí|near me). */
export function localIntentPattern(w: Workspace = ws()): RegExp {
  return memo(w, "local", () => {
    const own = w.content.localPatterns;
    const alts = own.length ? own : [...new Set([w.brand.city, ...w.brand.localCities].filter(Boolean).map((c) => escape(c.toLowerCase())))].concat(["cerca de m[ií]", "near me"]);
    return new RegExp(`\\b(${alts.join("|")})`, "i");
  }) as RegExp;
}

/** El título de la página de inicio menciona el servicio (señal de SEO). null = no hay con qué medir. */
export function serviceTitlePattern(w: Workspace = ws()): RegExp | null {
  return memo(w, "title", () => {
    const alts = w.content.serviceTitlePatterns.length ? w.content.serviceTitlePatterns : serviceWords(w).map(escape);
    return alts.length ? new RegExp(`(${alts.join("|")})`, "i") : null;
  });
}

/** Una ruta es página de servicio. Incluye la versión sin tilde y la codificada en URL. */
export function servicePagePattern(w: Workspace = ws()): RegExp | null {
  return memo(w, "page", () => {
    if (w.content.servicePagePatterns.length) return new RegExp(`(${w.content.servicePagePatterns.join("|")})`, "i");
    const words = serviceWords(w);
    const variants = words.flatMap((x) => {
      const plain = x.normalize("NFD").replace(/\p{M}/gu, "");
      return [...new Set([x, plain, encodeURIComponent(x)])];
    });
    const alts = [...new Set([...variants.map(escape), "servicio", "service"])];
    return new RegExp(`(${alts.join("|")})`, "i");
  });
}

/** País e idioma de la marca para Google y Maps (es-MX → es, mx). */
export function searchRegion(locale = localeSettings().locale): { language: string; country: string | null } {
  const [language, region] = locale.split("-");
  return { language: language.toLowerCase(), country: region ? region.toLowerCase() : null };
}

/** Nombre del país en el idioma de la marca («México»), para los textos. */
export function countryName(locale = localeSettings().locale): string | null {
  const { country, language } = searchRegion(locale);
  if (!country) return null;
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(country.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}
