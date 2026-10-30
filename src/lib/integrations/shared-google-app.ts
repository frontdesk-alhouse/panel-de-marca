import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { setSecrets } from "@/lib/secrets";

/**
 * La app de Google «Alto Dashboard» de Alto House: un solo cliente OAuth de escritorio
 * para que nadie tenga que crear su propio proyecto en Google Cloud.
 *
 * De dónde sale, en orden:
 * 1. El cliente propio que la persona ya guardó (GOOGLE_CLIENT_ID/SECRET): se respeta.
 * 2. private/google-oauth-app.json: las instalaciones de Alto House (fuera de git).
 * 3. El panel de Alto House en la nube (PANEL_GOOGLE_APP_URL): las copias del repo público.
 *
 * En apps de escritorio Google no trata el secreto como confidencial (lo protege el inicio
 * de sesión de cada persona y PKCE); no va en el repo para que los escáneres no lo revoquen.
 */
const SharedApp = z.object({
  client_id: z.string().regex(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/),
  client_secret: z.string().regex(/^GOCSPX-[A-Za-z0-9_-]{10,}$/),
});
export type SharedGoogleApp = z.infer<typeof SharedApp>;

export const SHARED_APP_URL = (): string =>
  process.env.PANEL_GOOGLE_APP_URL || "https://alto-house-dashboard.vercel.app/api/oauth/google-app";
const LOCAL_FILE = (): string => path.join(process.cwd(), "private", "google-oauth-app.json");
const FETCH_TIMEOUT_MS = 8_000;

/** Lee el JSON que descarga Google Cloud («installed» o «web») o el que sirve la nube. */
export function parseSharedApp(raw: unknown): SharedGoogleApp | null {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const inner = (obj.installed ?? obj.web ?? obj) as unknown;
  const parsed = SharedApp.safeParse(inner);
  return parsed.success ? parsed.data : null;
}

async function loadSharedApp(): Promise<SharedGoogleApp | null> {
  const file = LOCAL_FILE();
  if (existsSync(file)) {
    try {
      const app = parseSharedApp(JSON.parse(readFileSync(file, "utf8")));
      if (app) return app;
    } catch (err) {
      console.warn("[google] private/google-oauth-app.json no se pudo leer:", err instanceof Error ? err.message : err);
    }
  }
  try {
    const res = await fetch(SHARED_APP_URL(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    return parseSharedApp(await res.json());
  } catch (err) {
    console.warn("[google] no se pudo obtener la app compartida:", err instanceof Error ? err.message : err);
    return null;
  }
}

export type GoogleClientSource = "own" | "shared" | "missing";

/** Deja listo el cliente OAuth antes de pedir permiso a Google. */
export async function ensureGoogleClient(): Promise<GoogleClientSource> {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) return "own";
  const app = await loadSharedApp();
  if (!app) return "missing";
  // Se guarda como cualquier otro cliente: el resto del panel (sincronizar, refrescar) no cambia.
  setSecrets({ GOOGLE_CLIENT_ID: app.client_id, GOOGLE_CLIENT_SECRET: app.client_secret });
  return "shared";
}
