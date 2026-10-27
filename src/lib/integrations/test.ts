import { google } from "googleapis";
import type { IntegrationId } from "./catalog";
import type { Messages } from "@/i18n";

type T = Messages["server"]["test"];

/**
 * «Probar conexión»: una llamada de solo lectura por integración, sin gastar crédito
 * (salvo Clarity, que cuenta 1 de sus 10 consultas diarias; se avisa en la UI).
 * Recibe los valores ya combinados (lo escrito en el formulario + lo guardado).
 */
export type Values = Readonly<Record<string, string | undefined>>;

export interface Choice {
  value: string;
  label: string;
}

export interface TestResult {
  ok: boolean;
  /** Para la persona: qué pasó y qué hacer. Nunca incluye la llave. */
  message: string;
  /** Opciones para elegir (propiedades de Analytics, sitios de Search Console). */
  choices?: Partial<Record<"GA4_PROPERTY_ID" | "GSC_SITE_URL", Choice[]>>;
}

const TIMEOUT_MS = 20_000;
const ok = (message: string, extra: Partial<TestResult> = {}): TestResult => ({ ok: true, message, ...extra });
const fail = (message: string): TestResult => ({ ok: false, message });

async function getJson(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const need = (m: T, v: Values, ...keys: string[]): string | null => {
  const missing = keys.filter((k) => !v[k]);
  return missing.length ? m.missing(missing.join(", ")) : null;
};

async function testAnthropic(v: Values, m: T): Promise<TestResult> {
  const { status } = await getJson("https://api.anthropic.com/v1/models?limit=1", {
    headers: { "x-api-key": v.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
  });
  if (status === 200) return ok(m.keyWorks);
  if (status === 401) return fail(m.anthropicUnknown);
  if (status === 403) return fail(m.anthropicForbidden);
  return fail(m.respondedWith("Anthropic", status));
}

async function testApify(v: Values, m: T): Promise<TestResult> {
  const { status, body } = await getJson("https://api.apify.com/v2/users/me", { headers: { Authorization: `Bearer ${v.APIFY_TOKEN}` } });
  if (status === 401) return fail(m.apifyUnknown);
  if (status !== 200) return fail(m.respondedWith("Apify", status));
  const data = (body as { data?: { username?: string; plan?: { id?: string } } })?.data;
  return ok(m.apifyConnected(data?.username ?? m.yourAccount, data?.plan?.id ?? ""));
}

async function testPsi(v: Values, m: T): Promise<TestResult> {
  // Una medición real tarda ~20 s; se mide example.com para no gastar nada del sitio.
  const params = new URLSearchParams({ url: "https://example.com", strategy: "mobile", category: "performance", key: v.PSI_API_KEY ?? "" });
  const { status, body } = await getJson(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {}, 90_000);
  if (status === 200) return ok(m.keyWorks);
  const reason = (body as { error?: { message?: string } })?.error?.message ?? "";
  if (/API key not valid/i.test(reason)) return fail(m.psiUnknown);
  if (/has not been used|is disabled/i.test(reason)) return fail(m.psiDisabled);
  return fail(`${m.respondedWith("Google", status)}${reason ? ` ${reason}` : ""}`);
}

async function testClarity(v: Values, m: T): Promise<TestResult> {
  const { status } = await getJson("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", {
    headers: { Authorization: `Bearer ${v.CLARITY_TOKEN}`, "Content-Type": "application/json" },
  });
  if (status === 200) return ok(m.tokenWorks);
  if (status === 401 || status === 403) return fail(m.clarityUnknown);
  if (status === 429) return fail(m.clarityLimit);
  return fail(m.respondedWith("Clarity", status));
}

function googleClient(v: Values) {
  const client = new google.auth.OAuth2(v.GOOGLE_CLIENT_ID, v.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: v.GOOGLE_REFRESH_TOKEN });
  return client;
}

async function testGoogle(v: Values, m: T): Promise<TestResult> {
  const missing = need(m, v, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  if (missing) return fail(missing);
  if (!v.GOOGLE_REFRESH_TOKEN) return fail(m.googleAuthorize);
  const auth = googleClient(v);
  try {
    await auth.getAccessToken();
  } catch {
    return fail(m.googleRejected);
  }
  const [ga, gsc] = await Promise.allSettled([
    google.analyticsadmin({ version: "v1beta", auth }).accountSummaries.list({ pageSize: 200 }),
    google.searchconsole({ version: "v1", auth }).sites.list(),
  ]);
  const properties: Choice[] = ga.status === "fulfilled"
    ? (ga.value.data.accountSummaries ?? []).flatMap((a) => (a.propertySummaries ?? []).map((p) => ({
        value: (p.property ?? "").replace("properties/", ""),
        label: `${p.displayName} · ${a.displayName}`,
      })))
    : [];
  const sites: Choice[] = gsc.status === "fulfilled"
    ? (gsc.value.data.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => ({ value: s.siteUrl ?? "", label: s.siteUrl ?? "" }))
    : [];
  const problems: string[] = [];
  if (ga.status === "rejected") problems.push(m.googleNoAdmin);
  if (gsc.status === "rejected") problems.push(m.googleNoGsc);
  if (v.GA4_PROPERTY_ID && properties.length && !properties.some((p) => p.value === v.GA4_PROPERTY_ID)) problems.push(m.googleNoProperty);
  if (v.GSC_SITE_URL && sites.length && !sites.some((s) => s.value === v.GSC_SITE_URL)) problems.push(m.googleNoSite);
  const choices = { GA4_PROPERTY_ID: properties, GSC_SITE_URL: sites };
  if (problems.length) return { ok: false, message: m.googlePartial(problems.join("; ")), choices };
  return ok(m.googleConnected(properties.length, sites.length), { choices });
}

async function testGads(v: Values, m: T): Promise<TestResult> {
  const missing = need(m, v, "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID");
  if (missing) return fail(missing);
  if (!v.GOOGLE_REFRESH_TOKEN) return fail(m.gadsNeedsGoogle);
  let token: string | null | undefined;
  try {
    token = (await googleClient(v).getAccessToken()).token;
  } catch {
    return fail(m.gadsRejected);
  }
  const { status, body } = await getJson("https://googleads.googleapis.com/v26/customers:listAccessibleCustomers", {
    headers: { Authorization: `Bearer ${token}`, "developer-token": v.GOOGLE_ADS_DEVELOPER_TOKEN ?? "" },
  });
  const text = JSON.stringify(body ?? "");
  if (status === 200) {
    const id = (v.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, "");
    const names = ((body as { resourceNames?: string[] })?.resourceNames ?? []).map((r) => r.replace("customers/", ""));
    if (names.length && !names.includes(id) && !v.GOOGLE_ADS_LOGIN_CUSTOMER_ID) return fail(m.gadsNoCustomer);
    return ok(m.gadsConnected);
  }
  if (/DEVELOPER_TOKEN_NOT_APPROVED/.test(text)) return fail(m.gadsNotApproved);
  if (/insufficient.*scope|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(text)) return fail(m.gadsScope);
  if (/has not been used|SERVICE_DISABLED/i.test(text)) return fail(m.gadsDisabled);
  return fail(m.respondedWith("Google Ads", status));
}

async function testMeta(v: Values, m: T): Promise<TestResult> {
  const auth = { headers: { Authorization: `Bearer ${v.META_TOKEN}` } };
  const me = await getJson("https://graph.facebook.com/v26.0/me?fields=id,name", auth);
  if (me.status !== 200) return fail(m.metaUnknown);
  const [pages, ads] = await Promise.all([
    getJson("https://graph.facebook.com/v26.0/me/accounts?fields=name,instagram_business_account{username}&limit=50", auth),
    getJson("https://graph.facebook.com/v26.0/me/adaccounts?fields=name,currency,account_status&limit=50", auth),
  ]);
  const pageList = (pages.body as { data?: { name: string; instagram_business_account?: { username?: string } }[] })?.data ?? [];
  const adList = (ads.body as { data?: { name: string }[] })?.data ?? [];
  const ig = pageList.find((p) => p.instagram_business_account)?.instagram_business_account?.username;
  if (!ig && adList.length === 0) return fail(m.metaNothing);
  return ok(m.metaConnected(ig ?? null, adList.length));
}

const TESTS: Record<IntegrationId, (v: Values, m: T) => Promise<TestResult>> = {
  anthropic: testAnthropic,
  apify: testApify,
  psi: testPsi,
  clarity: testClarity,
  google: testGoogle,
  gads: testGads,
  meta: testMeta,
};

export async function testIntegration(id: IntegrationId, values: Values, m: T): Promise<TestResult> {
  try {
    return await TESTS[id](values, m);
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    console.error(`[conexión:${id}]`, err instanceof Error ? err.message : err);
    return fail(timeout ? m.timeout : m.generic);
  }
}
