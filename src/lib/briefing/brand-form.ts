import { COMPETITOR_INTERESTS, WorkspaceSchema, type Briefing, type CompetitorInput, type Workspace } from "@/lib/workspace/schema";
import type { Draft } from "./draft";
import type { SiteFacts } from "./extract";

/**
 * Formulario de la configuración inicial ↔ configuración de la marca. Todo en texto y
 * listas simples para el navegador; las reglas viven aquí (puras, con pruebas).
 */
export interface BrandForm {
  name: string;
  domain: string;
  city: string;
  localCities: string[];
  instagram: string;
  team: string;
  owner: string;
  language: "es" | "en";
  locale: string;
  currency: string;
  timeZone: string;
  marketContext: string;
  about: string;
  brief: string;
  services: string[];
  packages: { name: string; price: number | null }[];
  brandTerms: string[];
  keyPaths: string[];
  targetQueries: string[];
  topics: string[];
  relevantTerms: string[];
  redditSearches: { sub: string; q: string; topic: string }[];
  briefing: Briefing;
}

export const EMPTY_BRIEFING: Briefing = { wantToKnow: [], wantToKnowOther: "", contentIdeas: "", audience: "", goals: "" };

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "paquete";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unescapeRe = (s: string) => s.replace(/\\(.)/g, "$1");

/** Moneda probable por país del idioma (es-MX → MXN). La persona la puede cambiar. */
const CURRENCY_BY_REGION: Record<string, string> = { MX: "MXN", US: "USD", ES: "EUR", CO: "COP", AR: "ARS", CL: "CLP", PE: "PEN", GB: "GBP", CA: "CAD" };

/** País por la terminación del dominio (.mx, .com.mx → MX). Los sitios suelen declarar mal su región. */
export function regionFromDomain(domain: string | undefined): string | null {
  const tld = domain?.split(".").pop()?.toUpperCase();
  const region = tld === "UK" ? "GB" : tld;
  return region && region in CURRENCY_BY_REGION ? region : null;
}

export function guessLocale(htmlLang: string | null, browserLocale = "es-MX", domain?: string): { language: "es" | "en"; locale: string; currency: string } {
  // Idioma: el del sitio. Región: dominio (.mx) → navegador → lo que declare el sitio.
  const [siteLang, siteRegion] = (htmlLang ?? "").split("-");
  const [browserLang, browserRegion] = browserLocale.split("-");
  const lang = siteLang || browserLang;
  const region = regionFromDomain(domain) ?? browserRegion ?? siteRegion ?? "MX";
  const language = lang.toLowerCase() === "en" ? "en" : "es";
  const locale = `${lang.toLowerCase()}-${region.toUpperCase()}`;
  return { language, locale, currency: CURRENCY_BY_REGION[region.toUpperCase()] ?? "USD" };
}

/** Palabras de marca: nombre completo, nombre sin espacios y dominio sin terminación. */
export function brandTermsFor(name: string, domain: string): string[] {
  const n = name.toLowerCase().trim();
  const base = domain.split(".")[0];
  return uniq([n, n.replace(/\s+/g, ""), base]).filter((t) => t.length >= 3);
}

interface FromSite {
  domain: string;
  facts: SiteFacts;
  keyPaths: string[];
  /** Meta descripción del inicio: punto de partida de «Qué es tu marca» sin Claude. */
  description?: string;
  draft: Draft | null;
  briefing: Briefing;
  timeZone: string;
  browserLocale: string;
}

/** Primer borrador del formulario: lo que dijo Claude (si hubo) y lo que dice el sitio. */
export function formFromSite({ domain, facts, keyPaths, description = "", draft, briefing, timeZone, browserLocale }: FromSite): BrandForm {
  const loc = guessLocale(facts.lang, browserLocale, domain);
  const name = draft?.name || facts.name || domain.split(".")[0];
  const city = draft?.city || facts.city || "";
  return {
    name,
    domain,
    city,
    localCities: uniq(draft?.localCities ?? []),
    instagram: facts.instagram ?? "",
    team: "",
    owner: "",
    language: loc.language,
    locale: loc.locale,
    currency: draft?.currency && /^[A-Z]{3}$/.test(draft.currency) ? draft.currency : loc.currency,
    timeZone,
    marketContext: draft?.marketContext ?? "",
    about: draft?.about ?? description.trim(),
    brief: draft?.brief ?? "",
    services: uniq(draft?.services ?? []),
    packages: (draft?.packages ?? []).filter((p) => p.name.trim()),
    brandTerms: uniq([...(draft?.brandTerms ?? []), ...brandTermsFor(name, domain)].map((t) => t.toLowerCase())),
    keyPaths: uniq(["/", ...keyPaths]).slice(0, 5),
    targetQueries: uniq(draft?.targetQueries ?? []),
    topics: uniq(draft?.topics ?? []),
    relevantTerms: uniq((draft?.relevantTerms ?? []).map((t) => t.toLowerCase())),
    redditSearches: (draft?.redditSearches ?? []).map((r) => ({ ...r, sub: r.sub.replace(/^\/?r\//i, "") })).filter((r) => /^[A-Za-z0-9_]+$/.test(r.sub)),
    briefing,
  };
}

/** Lo que falta para poder guardar, en palabras de la persona. */
export function missingFields(f: BrandForm): string[] {
  const out: string[] = [];
  if (!f.name.trim()) out.push("el nombre de la marca");
  if (!f.owner.trim()) out.push("tu nombre");
  if (!f.about.trim()) out.push("«Qué es tu marca» (un párrafo)");
  if (!f.services.length) out.push("al menos un servicio o producto");
  return out;
}

/** Arma la configuración completa. Conserva de la anterior lo que el formulario no toca (metas, IDs de cuentas). */
export function formToWorkspace(f: BrandForm, previous?: Workspace | null): Workspace {
  const marketContext = f.marketContext.trim() || [f.services[0], f.city && `en ${f.city}`].filter(Boolean).join(" ");
  const content = {
    // Sin temas, los servicios: así la sección Ideas trae algo desde el primer día.
    topics: uniq(f.topics.length ? f.topics : f.services.map((x) => x.toLowerCase())),
    redditSearches: f.redditSearches,
    // Un término que ya existía como patrón (p. ej. «dise[ñn]o» importado) se conserva tal cual;
    // solo los nuevos se escapan como texto literal.
    relevantPatterns: uniq(f.relevantTerms).map((t) => previous?.content.relevantPatterns.find((p) => unescapeRe(p) === t) ?? escapeRe(t)),
    excludePatterns: previous?.content.excludePatterns ?? [],
    localPatterns: previous?.content.localPatterns ?? [],
    serviceTitlePatterns: previous?.content.serviceTitlePatterns ?? [],
    servicePagePatterns: previous?.content.servicePagePatterns ?? [],
  };
  const ids = new Set<string>();
  const packages = f.packages.filter((p) => p.name.trim()).map((p) => {
    let id = slug(p.name);
    for (let i = 2; ids.has(id); i++) id = `${slug(p.name)}-${i}`;
    ids.add(id);
    return { id, name: p.name.trim(), firstProject: p.price };
  });
  return WorkspaceSchema.parse({
    brand: {
      name: f.name.trim(),
      domain: f.domain,
      city: f.city.trim(),
      localCities: uniq(f.localCities),
      // La búsqueda de Maps se conserva mientras no cambien nombre ni ciudad (pudo afinarse a mano).
      mapsQuery: previous && previous.brand.name === f.name.trim() && previous.brand.city === f.city.trim()
        ? previous.brand.mapsQuery
        : [f.name.trim(), f.city.trim()].filter(Boolean).join(" "),
      instagram: f.instagram.trim().replace(/^@/, "") || undefined,
      brandTerms: uniq(f.brandTerms.length ? f.brandTerms : brandTermsFor(f.name, f.domain)),
      keyPaths: uniq(f.keyPaths.length ? f.keyPaths : ["/"]),
      team: f.team.trim() || f.owner.trim(),
      owner: f.owner.trim(),
    },
    locale: { language: f.language, locale: f.locale, currency: f.currency.toUpperCase(), timeZone: f.timeZone },
    assistant: { about: f.about.trim(), brief: f.brief.trim() || f.about.trim(), marketContext },
    packages,
    services: uniq(f.services),
    targets: previous?.targets ?? { cpl: null, clarity: { rageClicks: null, deadClicks: null, quickBacks: null } },
    targetQueries: uniq(f.targetQueries),
    briefing: { ...f.briefing, wantToKnow: f.briefing.wantToKnow.filter((k) => (COMPETITOR_INTERESTS as readonly string[]).includes(k)) },
    content,
    platforms: previous?.platforms ?? {},
  });
}

/** Para /ajustes: la configuración guardada de vuelta al formulario. */
export function workspaceToForm(w: Workspace): BrandForm {
  return {
    name: w.brand.name,
    domain: w.brand.domain,
    city: w.brand.city,
    localCities: w.brand.localCities,
    instagram: w.brand.instagram ?? "",
    team: w.brand.team,
    owner: w.brand.owner,
    language: w.locale.language,
    locale: w.locale.locale,
    currency: w.locale.currency,
    timeZone: w.locale.timeZone,
    marketContext: w.assistant.marketContext,
    about: w.assistant.about,
    brief: w.assistant.brief,
    services: w.services,
    packages: w.packages.map((p) => ({ name: p.name, price: p.firstProject })),
    brandTerms: w.brand.brandTerms,
    keyPaths: w.brand.keyPaths,
    targetQueries: w.targetQueries,
    topics: w.content.topics,
    relevantTerms: w.content.relevantPatterns.map(unescapeRe),
    redditSearches: w.content.redditSearches,
    briefing: w.briefing ?? EMPTY_BRIEFING,
  };
}

/** Dominios escritos en texto libre («estudio.mx, otro.com y www.tercero.com.mx/inicio»). */
export function domainsInText(text: string): string[] {
  const found = text.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?:\/\S*)?/g) ?? [];
  return uniq(found.map((d) => d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")));
}

/** Competidor a partir de lo que dice su sitio (o solo del dominio si no abrió). */
export function competitorFromFacts(domain: string, facts: SiteFacts | null, fallbackCity: string): CompetitorInput {
  const name = (facts?.name || domain.split(".")[0]).slice(0, 120);
  const city = (facts?.city || fallbackCity).slice(0, 120);
  return { name, domain, city, mapsQuery: [name, city].filter(Boolean).join(" "), ...(facts?.instagram ? { instagram: facts.instagram } : {}) };
}
