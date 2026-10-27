/**
 * Llaves que la configuración puede escribir en .env.local. Lista cerrada a propósito:
 * nada que cambie el modo, la base, el login o el arranque de Node (APP_MODE,
 * DATABASE_URL, AUTH_*, CRON_SECRET, NODE_OPTIONS…), aunque alguien logre llamar
 * a la acción con otros nombres.
 */
export const WRITABLE_SECRETS = [
  "ANTHROPIC_API_KEY",
  "APIFY_TOKEN",
  "PSI_API_KEY",
  "CLARITY_TOKEN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GA4_PROPERTY_ID",
  "GSC_SITE_URL",
  "GOOGLE_ADS_CUSTOMER_ID",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "META_TOKEN",
  "META_AD_ACCOUNT_ID",
  "META_IG_USER_ID",
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
] as const;

export type WritableSecret = (typeof WRITABLE_SECRETS)[number];

export const isWritableSecret = (key: string): key is WritableSecret => (WRITABLE_SECRETS as readonly string[]).includes(key);
