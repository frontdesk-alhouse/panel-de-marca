import type { Competitor, CompetitorInput, Workspace } from "./schema";

/**
 * Copia en memoria de la configuración. Se llena desde la base al arrancar el
 * servidor (instrumentation) y en cada página o API (`loadWorkspace`), y se lee
 * sin esperar desde cualquier parte. Sin datos, falla con un error claro en vez
 * de mostrar una marca vacía.
 */
interface Loaded { ws: Workspace; competitors: CompetitorInput[]; loadedAt: number; setupCompletedAt: Date | null }
let current: Loaded | null = null;

export class WorkspaceMissingError extends Error {
  constructor() {
    super("Falta la configuración de la marca (tabla workspace vacía). En modo local abre /setup; en la nube corre scripts/import-workspace.ts.");
    this.name = "WorkspaceMissingError";
  }
}

export function setWorkspace(ws: Workspace, competitors: CompetitorInput[], setupCompletedAt: Date | null = new Date()): void {
  current = { ws, competitors, loadedAt: Date.now(), setupCompletedAt };
}

export function clearWorkspace(): void {
  current = null;
}

export function hasWorkspace(): boolean {
  return current !== null;
}

export function loadedAt(): number {
  return current?.loadedAt ?? 0;
}

export function setupCompletedAt(): Date | null {
  return current?.setupCompletedAt ?? null;
}

export function ws(): Workspace {
  if (!current) throw new WorkspaceMissingError();
  return current.ws;
}

/** Sitio propio primero (con `self`), luego la competencia activa en su orden. */
export function competitors(): Competitor[] {
  const w = ws();
  const self: Competitor = { name: w.brand.name, domain: w.brand.domain, city: w.brand.city, self: true, mapsQuery: w.brand.mapsQuery };
  if (w.brand.instagram) self.instagram = w.brand.instagram;
  return [self, ...(current?.competitors ?? [])];
}

/** Ciudades que cuentan como «área local» en Tráfico. */
export function localCities(): string[] {
  const b = ws().brand;
  return b.localCities.length ? b.localCities : [b.city];
}

/** Identificación honesta de las visitas del panel a sitios ajenos (sitemaps, HTML). */
export function crawlerUserAgent(): string {
  return `Mozilla/5.0 (compatible; PanelDeMarca/1.0; +https://${ws().brand.domain})`;
}

/** Moneda, idioma y zona horaria; sin configuración, los de México (un formato nunca rompe la página). */
export const DEFAULT_LOCALE: Workspace["locale"] = { language: "es", locale: "es-MX", currency: "MXN", timeZone: "America/Mexico_City" };
let clientLocale: Workspace["locale"] | null = null;

export function localeSettings(): Workspace["locale"] {
  return current?.ws.locale ?? clientLocale ?? DEFAULT_LOCALE;
}

/** En el navegador solo existe la versión pública: la fija WorkspaceProvider. */
export function setClientLocale(locale: Workspace["locale"]): void {
  clientLocale = locale;
}
