/**
 * Modo de la app.
 * - nube: Vercel + Neon + login con Google (la instancia original).
 * - local: una sola persona en su computadora, sin login, base embebida (PGlite).
 *
 * En Vercel nunca es local, aunque alguien ponga APP_MODE=local por error.
 */
export type AppMode = "local" | "cloud";

type Env = Readonly<Record<string, string | undefined>>;

export const LOCAL_DB_URL = "pglite:./data/panel";

export function appMode(env: Env = process.env): AppMode {
  if (env.VERCEL) return "cloud";
  if (env.APP_MODE === "local") return "local";
  if (env.APP_MODE === "cloud") return "cloud";
  return (env.DATABASE_URL ?? "").startsWith("pglite:") ? "local" : "cloud";
}

export const isLocalMode = (env: Env = process.env): boolean => appMode(env) === "local";
