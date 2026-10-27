import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { isLocalMode, LOCAL_DB_URL } from "@/lib/mode";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const PGLITE_PREFIX = "pglite:";

/**
 * La conexión vive en globalThis, no en una variable del módulo: Next empaqueta este
 * archivo por separado para las páginas, las APIs y instrumentation (el programador),
 * y cada copia tendría su propia variable. Con Neon solo serían conexiones de más;
 * con PGlite serían dos bases abiertas sobre la misma carpeta, y eso la daña.
 */
const DB_KEY = Symbol.for("panel-de-marca.db");
type GlobalWithDb = typeof globalThis & { [DB_KEY]?: Promise<Db> | null };
const store = globalThis as GlobalWithDb;

/** DATABASE_URL, o en modo local la base embebida en ./data/panel. */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || (isLocalMode() ? LOCAL_DB_URL : undefined);
}

export function isDbConfigured(): boolean {
  return Boolean(databaseUrl());
}

/** Base embebida (Postgres en esta computadora). En modo local aplica las migraciones al abrir. */
async function connectPglite(dataDir: string): Promise<Db> {
  const { acquireDbLock } = await import("./local-lock");
  acquireDbLock(dataDir);
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  if (isLocalMode()) {
    try {
      const { migrateLocal } = await import("./migrate-local");
      await migrateLocal(db);
    } catch (err) {
      // Cerrarla antes de soltarla: el siguiente intento abriría otra sobre la misma carpeta.
      await client.close().catch(() => {});
      throw err;
    }
  }
  return db as unknown as Db;
}

async function connect(url: string): Promise<Db> {
  if (url.startsWith(PGLITE_PREFIX)) return connectPglite(url.slice(PGLITE_PREFIX.length));
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  return drizzle(neon(url), { schema }) as unknown as Db;
}

/** Se conecta al primer uso para que el build no exija base de datos. */
export function getDb(): Promise<Db> {
  const url = databaseUrl();
  if (!url) return Promise.reject(new Error("DATABASE_URL no está configurada"));
  store[DB_KEY] ??= connect(url).catch((err) => {
    store[DB_KEY] = null; // no guardar un fallo para siempre en una lambda caliente
    throw err;
  });
  return store[DB_KEY];
}
