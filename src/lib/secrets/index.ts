import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isLocalMode } from "@/lib/mode";
import { resetRedditToken } from "@/lib/ideas/collect";
import { resetMetaAssets } from "@/sources/meta-graph";
import { mergeEnv } from "./env-file";
import { isWritableSecret, type WritableSecret } from "./keys";

/**
 * Llaves de las integraciones.
 * - Nube: viven en las variables de Vercel; aquí solo se leen.
 * - Local: la configuración las escribe en .env.local (solo legible por el dueño)
 *   y las aplica al proceso al momento, sin reiniciar el panel.
 */
export class SecretsReadOnlyError extends Error {
  constructor() {
    super("En la nube las llaves se cambian en las variables de entorno de Vercel.");
    this.name = "SecretsReadOnlyError";
  }
}

export const envFilePath = (): string => path.join(process.cwd(), ".env.local");

export function getSecret(key: string): string | undefined {
  const value = process.env[key];
  return value ? value : undefined;
}

export const hasSecret = (key: string): boolean => Boolean(getSecret(key));

/** Clientes que guardan algo derivado de una llave: se olvidan al cambiarla. */
function resetClients(): void {
  resetMetaAssets();
  resetRedditToken();
}

/** Guarda (string) o borra (null) llaves. Escritura atómica: nunca deja un .env.local a medias. */
export function setSecrets(changes: Readonly<Partial<Record<WritableSecret, string | null>>>): void {
  if (!isLocalMode()) throw new SecretsReadOnlyError();
  const bad = Object.keys(changes).filter((k) => !isWritableSecret(k));
  if (bad.length > 0) throw new Error(`Estas variables no se pueden cambiar desde el panel: ${bad.join(", ")}`);
  const file = envFilePath();
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const next = mergeEnv(current, changes as Record<string, string | null>);
  const tmp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(tmp, next, { mode: 0o600 });
    renameSync(tmp, file);
  } finally {
    rmSync(tmp, { force: true });
  }
  chmodSync(file, 0o600);
  for (const [key, value] of Object.entries(changes) as [string, string | null][]) {
    if (value === null) delete process.env[key];
    else process.env[key] = value;
  }
  resetClients();
}
