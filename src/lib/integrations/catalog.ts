import type { WritableSecret } from "@/lib/secrets/keys";

/**
 * Qué se puede conectar, qué cuesta y cómo se consigue cada llave, con links directos.
 * Solo datos; los textos (nombre, qué enciende, pasos, avisos) están en src/i18n.
 * La prueba de cada conexión vive en ./test.ts (solo servidor).
 */
export type IntegrationId = "psi" | "clarity" | "google" | "gads" | "meta" | "apify" | "anthropic";

export type Cost = "free" | "free-tier" | "paid";

export interface IntegrationField {
  key: WritableSecret;
  /** Se muestra con puntos y nunca vuelve al navegador una vez guardada. */
  secret: boolean;
  placeholder?: string;
  optional?: boolean;
}

/** Un paso: el texto está en el diccionario (mismo orden); aquí solo su link. */
export interface Step {
  url?: string;
}

export interface Integration {
  id: IntegrationId;
  cost: Cost;
  minutes: number;
  /** Fuera del camino principal (más pasos o requisitos). */
  advanced?: boolean;
  /** Necesita otra conectada antes. */
  requires?: IntegrationId;
  fields: IntegrationField[];
  steps: Step[];
}

export const INTEGRATIONS: readonly Integration[] = [
  {
    id: "psi",
    cost: "free",
    minutes: 5,
    fields: [{ key: "PSI_API_KEY", secret: true, placeholder: "AIza…" }],
    steps: [
      { url: "https://console.cloud.google.com/projectcreate" },
      { url: "https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com" },
      { url: "https://console.cloud.google.com/apis/credentials" },
    ],
  },
  {
    id: "clarity",
    cost: "free",
    minutes: 5,
    fields: [{ key: "CLARITY_TOKEN", secret: true }],
    steps: [
      { url: "https://clarity.microsoft.com/projects" },
      {},
    ],
  },
  {
    id: "google",
    cost: "free",
    minutes: 15,
    fields: [
      { key: "GOOGLE_CLIENT_ID", secret: false, placeholder: "….apps.googleusercontent.com" },
      { key: "GOOGLE_CLIENT_SECRET", secret: true, placeholder: "GOCSPX-…" },
      { key: "GA4_PROPERTY_ID", secret: false, placeholder: "123456789", optional: true },
      { key: "GSC_SITE_URL", secret: false, placeholder: "sc-domain:example.com", optional: true },
    ],
    steps: [
      { url: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" },
      { url: "https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com" },
      { url: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" },
      { url: "https://console.cloud.google.com/auth/overview" },
      { url: "https://console.cloud.google.com/auth/audience" },
      { url: "https://console.cloud.google.com/auth/clients/create" },
      {},
    ],
  },
  {
    id: "gads",
    cost: "free",
    minutes: 20,
    advanced: true,
    requires: "google",
    fields: [
      { key: "GOOGLE_ADS_DEVELOPER_TOKEN", secret: true },
      { key: "GOOGLE_ADS_CUSTOMER_ID", secret: false, placeholder: "123-456-7890" },
      { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", secret: false, placeholder: "123-456-7890", optional: true },
    ],
    steps: [
      { url: "https://console.cloud.google.com/apis/library/googleads.googleapis.com" },
      { url: "https://ads.google.com/aw/apicenter" },
      {},
      {},
    ],
  },
  {
    id: "meta",
    cost: "free",
    minutes: 20,
    fields: [
      { key: "META_TOKEN", secret: true, placeholder: "EAA…" },
      { key: "META_AD_ACCOUNT_ID", secret: false, placeholder: "act_123…", optional: true },
      { key: "META_IG_USER_ID", secret: false, placeholder: "1784…", optional: true },
    ],
    steps: [
      { url: "https://developers.facebook.com/apps/creation/" },
      { url: "https://business.facebook.com/settings/system-users" },
      {},
      {},
    ],
  },
  {
    id: "apify",
    cost: "free-tier",
    minutes: 5,
    fields: [{ key: "APIFY_TOKEN", secret: true, placeholder: "apify_api_…" }],
    steps: [
      { url: "https://console.apify.com/sign-up" },
      { url: "https://console.apify.com/settings/integrations" },
    ],
  },
  {
    id: "anthropic",
    cost: "paid",
    minutes: 5,
    fields: [{ key: "ANTHROPIC_API_KEY", secret: true, placeholder: "sk-ant-…" }],
    steps: [
      { url: "https://console.anthropic.com/settings/billing" },
      { url: "https://console.anthropic.com/settings/keys" },
    ],
  },
];

export const integration = (id: IntegrationId): Integration => {
  const found = INTEGRATIONS.find((i) => i.id === id);
  if (!found) throw new Error(`Integración desconocida: ${id}`);
  return found;
};

