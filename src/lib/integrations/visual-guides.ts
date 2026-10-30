import type { IntegrationId } from "./catalog";

/**
 * Réplicas simplificadas de las pantallas reales donde se saca cada llave, con el clic
 * marcado. No son capturas: no muestran datos de ninguna cuenta y pesan nada. Se armaron
 * viendo cada plataforma el día de `verified`; si una plataforma cambia su pantalla, se
 * actualiza aquí y la fecha avisa qué tan reciente es.
 *
 * Los textos de botones van como aparecen en la plataforma (en su idioma).
 */
export type MockBlock =
  | { kind: "button"; label: string; variant?: "primary" | "outline"; align?: "right" }
  | { kind: "secret"; label: string; actions: string[] }
  | { kind: "cards"; items: { title: string; text: string; button: string }[] }
  | { kind: "menu"; anchor: string; items: string[] }
  | { kind: "lines"; count: number };

export interface MockScreen {
  /** Lo que se ve en la barra de direcciones. */
  url: string;
  app: string;
  /** Color de la marca de la plataforma (solo el acento del botón principal y el logo). */
  accent: string;
  topNav?: { items: string[]; active: string };
  sidebar?: { title?: string; items: string[]; active: string };
  tabs?: { items: string[]; active: string };
  title: string;
  subtitle?: string;
  blocks: MockBlock[];
  /** Texto del elemento donde se da clic (botón, pestaña, acción o tarjeta). */
  target: string;
  /** Día en que se comparó con la pantalla real; sin fecha = armada con la documentación de la plataforma. */
  verified?: string;
}

const VERIFIED = "2026-10-29";

const APIFY_TOKEN: MockScreen = {
  url: "console.apify.com/settings/integrations",
  app: "Apify",
  accent: "#1a1a1a",
  sidebar: { items: ["Apify Store", "Dashboard", "Actors", "Runs", "Tasks", "Integrations", "Schedules", "Settings"], active: "Settings" },
  tabs: { items: ["Account", "Login & Privacy", "API & Integrations", "Organizations", "Notifications"], active: "API & Integrations" },
  title: "API tokens",
  subtitle: "Personal API tokens",
  blocks: [
    { kind: "button", label: "+ Create a new token", variant: "outline", align: "right" },
    { kind: "secret", label: "Default API token created on sign-up", actions: ["ver", "copiar"] },
  ],
  target: "copiar",
  verified: VERIFIED,
};

const CLAUDE_BILLING: MockScreen = {
  url: "platform.claude.com/settings/billing",
  app: "Claude Console",
  accent: "#1f1e1d",
  sidebar: { title: "Spending", items: ["Overview", "Cost & spend", "Billing & payments", "Spend limits", "API usage", "Rate limits"], active: "Billing & payments" },
  title: "Billing",
  subtitle: "Credit balance · Payment details",
  blocks: [
    { kind: "lines", count: 2 },
    { kind: "button", label: "Buy credits", variant: "primary", align: "right" },
    { kind: "button", label: "Add payment method", variant: "primary", align: "right" },
  ],
  target: "Add payment method",
  verified: VERIFIED,
};

const CLAUDE_KEYS: MockScreen = {
  url: "platform.claude.com/settings/keys",
  app: "Claude Console",
  accent: "#1f1e1d",
  sidebar: { title: "Keys & access", items: ["API keys", "Service accounts", "Workload identity"], active: "API keys" },
  title: "API keys",
  blocks: [
    { kind: "button", label: "+ Create key", variant: "primary", align: "right" },
    { kind: "lines", count: 3 },
  ],
  target: "+ Create key",
  verified: VERIFIED,
};

const CLARITY_NAV = { items: ["Dashboard", "Recordings", "Heatmaps", "Settings"], active: "Settings" };
const CLARITY_SIDE = ["Overview", "Team", "Setup", "Masking", "Funnels", "Data export", "Integrations"];

const CLARITY_INSTALL: MockScreen = {
  url: "clarity.microsoft.com/projects/view/…/settings#setup",
  app: "Microsoft Clarity",
  accent: "#5b5fc7",
  topNav: CLARITY_NAV,
  sidebar: { items: CLARITY_SIDE, active: "Setup" },
  title: "Setup",
  subtitle: "Installation methods (más abajo en la página)",
  blocks: [{
    kind: "cards",
    items: [
      { title: "Install on a third-party platform", text: "Shopify, Wix, WordPress…", button: "View all platforms" },
      { title: "Install manually", text: "Copy and paste tracking code into <head>", button: "Get tracking code" },
      { title: "Install using NPM", text: "Clarity package on NPM", button: "View instructions" },
    ],
  }],
  target: "Get tracking code",
  verified: VERIFIED,
};

const CLARITY_TOKEN: MockScreen = {
  url: "clarity.microsoft.com/projects/view/…/settings#apiTokens",
  app: "Microsoft Clarity",
  accent: "#5b5fc7",
  topNav: CLARITY_NAV,
  sidebar: { items: CLARITY_SIDE, active: "Data export" },
  title: "Data export",
  subtitle: "API calls are limited to 10 per project, per day",
  blocks: [
    { kind: "button", label: "+ Generate new API token", variant: "primary" },
    { kind: "lines", count: 2 },
  ],
  target: "+ Generate new API token",
  verified: VERIFIED,
};

const GCLOUD_SIDE = { title: "APIs y servicios", items: ["APIs y servicios habilitados", "Biblioteca", "Credenciales", "Pantalla de consentimiento"], active: "Credenciales" };

const PSI_PROJECT: MockScreen = {
  url: "console.cloud.google.com/projectcreate",
  app: "Google Cloud",
  accent: "#1a73e8",
  title: "Proyecto nuevo",
  subtitle: "Nombre del proyecto (p. ej. «panel-de-marca»)",
  blocks: [{ kind: "lines", count: 2 }, { kind: "button", label: "Crear", variant: "primary" }],
  target: "Crear",
};

const PSI_ENABLE: MockScreen = {
  url: "console.cloud.google.com/apis/library/pagespeedonline.googleapis.com",
  app: "Google Cloud",
  accent: "#1a73e8",
  sidebar: { ...GCLOUD_SIDE, active: "Biblioteca" },
  title: "PageSpeed Insights API",
  subtitle: "Google Enterprise API",
  blocks: [{ kind: "button", label: "Habilitar", variant: "primary" }, { kind: "lines", count: 2 }],
  target: "Habilitar",
};

const PSI_KEY: MockScreen = {
  url: "console.cloud.google.com/apis/credentials",
  app: "Google Cloud",
  accent: "#1a73e8",
  sidebar: GCLOUD_SIDE,
  title: "Credenciales",
  blocks: [
    { kind: "button", label: "+ Crear credenciales ▾", variant: "outline" },
    { kind: "menu", anchor: "+ Crear credenciales ▾", items: ["Clave de API", "ID de cliente de OAuth", "Cuenta de servicio"] },
  ],
  target: "Clave de API",
  verified: VERIFIED,
};

/** Réplica por paso, en el mismo orden que los pasos de cada conexión (null = sin réplica). */
export const VISUAL_GUIDES: Partial<Record<IntegrationId, (MockScreen | null)[]>> = {
  psi: [PSI_PROJECT, PSI_ENABLE, PSI_KEY],
  clarity: [CLARITY_INSTALL, CLARITY_TOKEN],
  apify: [null, APIFY_TOKEN],
  anthropic: [CLAUDE_BILLING, CLAUDE_KEYS],
};
