import { localeSettings } from "@/lib/workspace/store";
import { isAuthorized, unauthorized, requireWorkspace } from "@/lib/api-auth";
import { graphAll, isMetaConfigured } from "@/sources/meta-graph";

/** Qué activos ve el token de Meta (nombres e IDs, sin datos sensibles): para revisar la conexión. */
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const missing = await requireWorkspace();
  if (missing) return missing;
  if (!isMetaConfigured()) return Response.json({ error: "META_TOKEN no configurado" }, { status: 400 });
  const safe = async <T>(p: Promise<T[]>) => p.catch((e: Error) => [{ error: e.message }] as unknown as T[]);
  const [pages, ads, perms] = await Promise.all([
    safe(graphAll<{ id: string; name: string }>("me/accounts", { fields: "id,name,instagram_business_account{id,username}", limit: 50 })),
    safe(graphAll<{ id: string; name: string }>("me/adaccounts", { fields: "id,name,account_status,currency,amount_spent", limit: 50 })),
    safe(graphAll<{ permission: string; status: string }>("me/permissions", { limit: 100 })),
  ]);
  return Response.json({ pages, adAccounts: ads, permissions: perms, note: `El panel lee solo cuentas activas en ${localeSettings().currency}.` });
}
