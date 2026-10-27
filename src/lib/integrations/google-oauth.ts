import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { isLoopbackOrigin } from "@/lib/local/guard";

/**
 * Autorizar Google desde la app (modo local), con el cliente OAuth «App de escritorio»
 * de la propia persona. Google regresa a la raíz del panel (http://127.0.0.1:puerto/),
 * la forma de regreso que acepta para apps de escritorio; el proxy la desvía al callback.
 */
export { OAUTH_COOKIE } from "./oauth-cookie";
export const OAUTH_TTL_S = 10 * 60;

export const BASE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];
export const ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

export interface OAuthState {
  state: string;
  verifier: string;
  /** A dónde volver: la configuración inicial o los ajustes. */
  back: "/setup" | "/ajustes";
  /** Origen con el que se pidió el permiso: Google exige el mismo al cambiar el código. */
  origin: string;
}

export const redirectUri = (origin: string): string => `${origin}/`;

/**
 * Origen tal como lo abrió la persona (127.0.0.1 o localhost, con su puerto). No se usa
 * req.url: Next lo normaliza a «localhost» y la cookie del flujo (por host) no regresaría.
 * El Host ya pasó la revisión de loopback del modo local.
 */
export function requestOrigin(req: Request): string {
  try {
    const origin = new URL(`http://${req.headers.get("host") ?? ""}`).origin;
    return isLoopbackOrigin(origin) ? origin : "http://127.0.0.1";
  } catch {
    return "http://127.0.0.1";
  }
}

export function oauthClient(origin: string) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri(origin));
}

/**
 * El flujo vive en la memoria del servidor; la cookie solo lleva un identificador al azar.
 * Así otro programa en otro puerto de esta computadora (las cookies no distinguen puertos)
 * no puede plantar su propio state y verificador.
 */
const FLOWS = Symbol.for("panel-de-marca.google-oauth");
type GlobalWithFlows = typeof globalThis & { [FLOWS]?: Map<string, OAuthState & { expires: number }> };
const flows = () => ((globalThis as GlobalWithFlows)[FLOWS] ??= new Map());

export function startFlow(state: OAuthState): string {
  const now = Date.now();
  for (const [k, v] of flows()) if (v.expires < now) flows().delete(k);
  const id = randomBytes(24).toString("base64url");
  flows().set(id, { ...state, expires: now + OAUTH_TTL_S * 1000 });
  return id;
}

export function peekFlow(id: string | undefined): OAuthState | null {
  const f = id ? flows().get(id) : undefined;
  if (!f || f.expires < Date.now()) return null;
  return { state: f.state, verifier: f.verifier, back: f.back, origin: f.origin };
}

export const endFlow = (id: string | undefined): void => { if (id) flows().delete(id); };
