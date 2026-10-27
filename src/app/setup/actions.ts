"use server";

import { getViewer } from "@/auth";
import { isLocalMode } from "@/lib/mode";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace/load";
import { hasWorkspace, ws } from "@/lib/workspace/store";
import { CompetitorSchema, type Briefing, type CompetitorInput } from "@/lib/workspace/schema";
import { scrapeSite, ScrapeError, normalizeDomain, type SiteProfile } from "@/lib/briefing/scrape";
import { draftBrand, type Draft } from "@/lib/briefing/draft";
import { competitorFromFacts, formToWorkspace, missingFields, type BrandForm } from "@/lib/briefing/brand-form";
import { googleSearchLinks, suggestCompetitors, suggestQueries, type CompetitorSuggestion, type Suggestion } from "@/lib/briefing/suggest";
import { integration, type IntegrationId } from "@/lib/integrations/catalog";
import { integrationStates, type IntegrationState } from "@/lib/integrations/status";
import { testIntegration, type TestResult } from "@/lib/integrations/test";
import { setSecrets } from "@/lib/secrets";
import type { WritableSecret } from "@/lib/secrets/keys";
import type { SiteFacts } from "@/lib/briefing/extract";
import { getMessages } from "@/i18n/server";
import type { Messages } from "@/i18n";

type S = Messages["server"];
const srv = async (): Promise<S> => (await getMessages()).server;

/**
 * Acciones de la configuración inicial y de /ajustes. Solo en modo local y solo desde
 * esta computadora (getViewer revisa el Host; Next revisa el Origin de las acciones).
 */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard(): Promise<string | null> {
  const t = await srv();
  if (!isLocalMode()) return t.localOnly;
  if (!(await getViewer())) return t.unauthorized;
  return null;
}

const failure = (err: unknown, fallback: string, t?: S): { ok: false; error: string } => {
  if (err instanceof ScrapeError && t) {
    const m = t.scrape;
    return { ok: false, error: err.code === "unreachable" ? m.unreachable(err.domain) : m[err.code] };
  }
  console.error("[setup]", err);
  return { ok: false, error: fallback };
};

/** El último sitio leído, para que el borrador no lo vuelva a descargar. */
const SITE_KEY = Symbol.for("panel-de-marca.last-site");
type GlobalWithSite = typeof globalThis & { [SITE_KEY]?: SiteProfile };
const lastSite = () => (globalThis as GlobalWithSite)[SITE_KEY];

export interface SiteSummary {
  domain: string;
  facts: SiteFacts;
  pages: { url: string; title: string }[];
  found: number;
  keyPaths: string[];
  /** Descripción de la página de inicio (para prellenar «Qué es tu marca» sin Claude). */
  description: string;
}

export async function readSiteAction(input: string): Promise<Result<SiteSummary>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  try {
    const site = await scrapeSite(input);
    (globalThis as GlobalWithSite)[SITE_KEY] = site;
    const keyPaths = site.pages.slice(1, 5).map((p) => new URL(p.url).pathname);
    return { ok: true, data: { domain: site.domain, facts: site.facts, pages: site.pages.map((p) => ({ url: p.url, title: p.title })), found: site.found, keyPaths, description: site.pages[0]?.description ?? "" } };
  } catch (err) {
    const t = await srv();
    return failure(err, t.readFailed, t);
  }
}

export async function draftAction(domain: string, briefing: Briefing, knownCompetitors: string, language: "es" | "en"): Promise<Result<Draft | null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: true, data: null };
  try {
    const site = lastSite()?.domain === normalizeDomain(domain) ? lastSite()! : await scrapeSite(domain);
    return { ok: true, data: await draftBrand({ site, briefing, knownCompetitors, language }) };
  } catch (err) {
    const t = await srv();
    return failure(err, t.draftFailed, t);
  }
}

export async function saveBrandAction(form: BrandForm): Promise<Result<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const t = await srv();
  try {
    if (JSON.stringify(form).length > 200_000) return { ok: false, error: t.tooLong };
    const missing = missingFields(form);
    if (missing.length) return { ok: false, error: t.missing(missing.join(", ")) };
    const previous = (await loadWorkspace()) ? ws() : null;
    await saveWorkspace(formToWorkspace(form, previous));
    return { ok: true, data: null };
  } catch (err) {
    return failure(err, t.saveFailed, t);
  }
}

export async function suggestQueriesAction(services: string[], city: string, locale: string): Promise<Result<Suggestion<string>[]>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const t = await srv();
  try {
    return { ok: true, data: await suggestQueries(services, city, locale, t.suggest) };
  } catch (err) {
    return failure(err, t.suggestFailed, t);
  }
}

export interface CompetitorSuggestions {
  suggestions: Suggestion<CompetitorSuggestion>[];
  /** Sin Apify: búsquedas para ver en Google. */
  links: { query: string; url: string }[];
  viaApify: boolean;
}

export async function suggestCompetitorsAction(queries: string[], ownDomain: string, locale: string): Promise<Result<CompetitorSuggestions>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!process.env.APIFY_TOKEN) return { ok: true, data: { suggestions: [], links: googleSearchLinks(queries, locale), viaApify: false } };
  const t = await srv();
  try {
    return { ok: true, data: { suggestions: await suggestCompetitors(queries, ownDomain, locale, t.suggest), links: googleSearchLinks(queries, locale), viaApify: true } };
  } catch (err) {
    return failure(err, t.apifyFailed, t);
  }
}

/** Lee el inicio de un competidor para llenar nombre, ciudad e Instagram. */
export async function competitorFromSiteAction(input: string, fallbackCity: string): Promise<Result<CompetitorInput>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  let domain: string;
  try {
    domain = normalizeDomain(input);
  } catch (err) {
    const t = await srv();
    return failure(err, t.invalidDomain, t);
  }
  const site = await scrapeSite(domain).catch(() => null);
  return { ok: true, data: competitorFromFacts(domain, site?.facts ?? null, fallbackCity) };
}

export async function saveCompetitorsAction(list: CompetitorInput[]): Promise<Result<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = list.map((c) => CompetitorSchema.safeParse(c));
  const bad = parsed.findIndex((p) => !p.success);
  const t = await srv();
  if (bad >= 0) return { ok: false, error: t.checkCompetitor(list[bad].name || list[bad].domain) };
  if (!(await loadWorkspace())) return { ok: false, error: t.saveBrandFirst };
  try {
    await saveWorkspace(ws(), parsed.map((p) => p.data!));
    return { ok: true, data: null };
  } catch (err) {
    return failure(err, t.competitorsFailed, t);
  }
}

/** Guarda las llaves de una integración y la prueba. Un secreto vacío = conservar el guardado. */
export async function saveIntegrationAction(id: IntegrationId, values: Record<string, string>): Promise<Result<{ test: TestResult; states: IntegrationState[] }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const t = await srv();
  const it = integration(id);
  const changes: Partial<Record<WritableSecret, string | null>> = {};
  for (const f of it.fields) {
    const raw = String(values[f.key] ?? "").trim().slice(0, 4096);
    if (raw) changes[f.key] = raw;
    else if (!f.secret && f.key in values) changes[f.key] = null; // ID borrado a propósito
  }
  // Se prueba antes de guardar: una llave que no funciona no se queda como «conectada».
  // Google es de varios pasos (cliente → autorizar → elegir propiedades): se guarda siempre.
  const multiStep = id === "google" || id === "gads";
  if (!multiStep) {
    const preview = await testIntegration(id, { ...process.env, ...changes } as Record<string, string | undefined>, t.test);
    if (!preview.ok) return { ok: true, data: { test: preview, states: integrationStates() } };
  }
  try {
    setSecrets(changes);
  } catch (err) {
    return { ok: false, error: err instanceof Error && /caracteres no permitidos/.test(err.message) ? t.badChars : t.keySaveFailed };
  }
  await syncPlatformIds();
  const test = multiStep ? await testIntegration(id, process.env, t.test) : { ok: true, message: t.keySaved };
  return { ok: true, data: { test, states: integrationStates() } };
}

export async function testIntegrationAction(id: IntegrationId): Promise<Result<TestResult>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  return { ok: true, data: await testIntegration(id, process.env, (await srv()).test) };
}

/** Los IDs de cuentas también arman los links directos del panel (configuración de la marca). */
async function syncPlatformIds(): Promise<void> {
  if (!hasWorkspace() && !(await loadWorkspace())) return;
  const w = ws();
  const e = process.env;
  const platforms = {
    ...w.platforms,
    ga4PropertyId: e.GA4_PROPERTY_ID || undefined,
    gscProperty: e.GSC_SITE_URL || undefined,
    googleAdsCustomerId: e.GOOGLE_ADS_CUSTOMER_ID || undefined,
    metaAdAccountId: e.META_AD_ACCOUNT_ID || w.platforms.metaAdAccountId,
  };
  if (JSON.stringify(platforms) !== JSON.stringify(w.platforms)) await saveWorkspace({ ...w, platforms });
}

/** Arranca la primera actualización (corre en el servidor; la pantalla consulta /api/sync/status). */
export async function startFirstSyncAction(): Promise<Result<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const { tick } = await import("@/lib/local/scheduler");
  void tick();
  return { ok: true, data: null };
}

export async function finishSetupAction(): Promise<Result<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!(await loadWorkspace())) return { ok: false, error: (await srv()).brandMissing };
  await saveWorkspace(ws(), undefined, { completeSetup: true });
  return { ok: true, data: null };
}

/** Fuentes que corren con lo conectado ahora mismo (para la primera actualización). */
export async function syncSourcesAction(): Promise<{ id: string; label: string }[]> {
  if (await guard()) return [];
  const { JOBS } = await import("@/lib/local/schedule");
  const { getSource } = await import("@/sources/registry");
  return JOBS.filter((j) => j.kind === "sync")
    .map((j) => getSource(j.id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.isConfigured()))
    .map((s) => ({ id: s.id, label: s.label }));
}
