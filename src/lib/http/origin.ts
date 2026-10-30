import { headers } from "next/headers";

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Origen público de esta petición (https://… en la nube, http://127.0.0.1:PUERTO en local).
 * El host se valida: termina dentro de un comando de terminal que la persona copia.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const raw = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const host = HOST.test(raw) ? raw : "127.0.0.1:3000";
  const isLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const fwd = h.get("x-forwarded-proto");
  const proto = fwd === "http" || fwd === "https" ? fwd : isLocal ? "http" : "https";
  return `${proto}://${host}`;
}
