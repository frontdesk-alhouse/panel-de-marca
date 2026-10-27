import { INTEGRATIONS, type IntegrationId } from "./catalog";

/**
 * Estado de cada conexión para la pantalla. Las llaves secretas nunca salen del
 * servidor: solo viaja si están guardadas. Los IDs (no secretos) sí viajan.
 */
export interface FieldState {
  key: string;
  set: boolean;
  /** Solo para campos no secretos. */
  value?: string;
}

export interface IntegrationState {
  id: IntegrationId;
  connected: boolean;
  fields: FieldState[];
  /** Google: ya autorizó (hay refresh token). */
  authorized?: boolean;
}

const has = (k: string) => Boolean(process.env[k]);

export function integrationStates(): IntegrationState[] {
  return INTEGRATIONS.map((it) => {
    const fields = it.fields.map((f) => ({ key: f.key, set: has(f.key), ...(f.secret ? {} : { value: process.env[f.key] ?? "" }) }));
    const required = it.fields.filter((f) => !f.optional).every((f) => has(f.key));
    const authorized = it.id === "google" ? has("GOOGLE_REFRESH_TOKEN") : undefined;
    const connected = required && (it.id === "google" ? Boolean(authorized) && (has("GA4_PROPERTY_ID") || has("GSC_SITE_URL")) : it.id === "gads" ? has("GOOGLE_REFRESH_TOKEN") : true);
    return { id: it.id, connected, fields, ...(authorized === undefined ? {} : { authorized }) };
  });
}
