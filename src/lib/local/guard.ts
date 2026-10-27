/**
 * Sin login, el modo local solo se protege por estar en la misma computadora:
 * - el servidor escucha en 127.0.0.1 (no en la red);
 * - Host debe ser loopback, para frenar «DNS rebinding» (un dominio ajeno que apunta a 127.0.0.1);
 * - en pedidos que escriben, Origin (si viene) debe ser loopback, para frenar que otra
 *   página abierta en el navegador mande formularios o fetch al panel.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function hostname(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1);
  return h.split(":")[0];
}

export function isLoopbackHost(hostHeader: string | null | undefined): boolean {
  return Boolean(hostHeader) && LOOPBACK.has(hostname(hostHeader as string));
}

export function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && LOOPBACK.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export interface LocalRequestInfo {
  method: string;
  host: string | null;
  origin: string | null;
}

/** null si el pedido puede pasar; si no, la razón (para el log, no para el cliente). */
export function localRequestProblem({ method, host, origin }: LocalRequestInfo): string | null {
  if (!isLoopbackHost(host)) return "host no local";
  if (SAFE_METHODS.has(method.toUpperCase())) return null;
  if (origin !== null && !isLoopbackOrigin(origin)) return "origen no local";
  return null;
}

export const requestInfo = (req: Request): LocalRequestInfo => ({
  method: req.method,
  host: req.headers.get("host"),
  origin: req.headers.get("origin"),
});
