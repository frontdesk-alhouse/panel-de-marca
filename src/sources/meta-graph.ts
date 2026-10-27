import { localeSettings } from "@/lib/workspace/store";
/**
 * Cliente mínimo de la Graph API de Meta (v26, 2026-07-29) con el token del
 * usuario del sistema «panel» (solo lectura). El token va en el encabezado, nunca
 * en la URL, para que no quede en logs.
 */
const BASE = "https://graph.facebook.com/v26.0";
const TIMEOUT_MS = 30_000;

export const isMetaConfigured = () => Boolean(process.env.META_TOKEN);

export async function graph<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}/${path.replace(/^\//, "")}${qs.size ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${process.env.META_TOKEN}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json()) as T & { error?: { message?: string; code?: number; error_subcode?: number } };
  if (!res.ok || json.error) {
    const e = json.error;
    throw new Error(`Meta respondió ${res.status}${e?.code ? ` (código ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})` : ""}: ${(e?.message ?? "").slice(0, 160)}`);
  }
  return json;
}

/** Sigue la paginación de Graph (paging.next) hasta `max` elementos. */
export async function graphAll<T>(path: string, params: Record<string, string | number>, max = 500): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  do {
    const page = await graph<{ data: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(path, { ...params, ...(after ? { after } : {}) });
    out.push(...page.data);
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after && out.length < max);
  return out;
}

export interface MetaAssets { adAccountIds: string[]; skippedAccounts: string[]; igUserId: string | null; igUsername: string | null; pageId: string | null }

let cached: Promise<MetaAssets> | null = null;

/** Olvida lo descubierto (al cambiar el token en la configuración). */
export function resetMetaAssets(): void {
  cached = null;
}

/** Encuentra cuenta publicitaria, página e Instagram del usuario del sistema (o usa las de env). */
export function metaAssets(): Promise<MetaAssets> {
  cached ??= (async () => {
    const [pages, ads] = await Promise.all([
      graphAll<{ id: string; name: string; instagram_business_account?: { id: string; username?: string } }>("me/accounts", { fields: "id,name,instagram_business_account{id,username}", limit: 50 }).catch(() => []),
      graphAll<{ id: string; name: string; account_status: number; currency: string }>("me/adaccounts", { fields: "id,name,account_status,currency", limit: 50 }).catch(() => []),
    ]);
    const page = pages.find((p) => p.instagram_business_account) ?? pages[0];
    // Solo cuentas activas en la moneda de la marca: el panel no convierte monedas.
    const currency = localeSettings().currency;
    const active = ads.filter((a) => a.account_status === 1);
    const sameCurrency = active.filter((a) => a.currency === currency);
    return {
      adAccountIds: process.env.META_AD_ACCOUNT_ID ? [process.env.META_AD_ACCOUNT_ID] : sameCurrency.map((a) => a.id),
      skippedAccounts: active.filter((a) => a.currency !== currency).map((a) => `${a.name} (${a.currency})`),
      igUserId: process.env.META_IG_USER_ID ?? page?.instagram_business_account?.id ?? null,
      igUsername: page?.instagram_business_account?.username ?? null,
      pageId: page?.id ?? null,
    };
  })().catch((e) => { cached = null; throw e; });
  return cached;
}
