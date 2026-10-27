import { google } from "googleapis";

/** Permisos que pide el script de autorización (uno solo para todas las fuentes de Google). */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/business.manage",
];

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

/** Cliente OAuth con el refresh token de la cuenta dueña de GA4, Search Console y Ads. */
export function googleAuth() {
  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}
