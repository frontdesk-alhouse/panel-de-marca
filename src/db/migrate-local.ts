import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/pglite/migrator";

const MIGRATIONS = { migrationsFolder: path.join(process.cwd(), "drizzle") };

/**
 * Una base creada con `drizzle-kit push` ya tiene las tablas pero no el registro de
 * migraciones, y la migración inicial fallaría con «la tabla ya existe». En ese caso
 * se registra solo la inicial como aplicada; las siguientes corren normal.
 */
async function baselinePushedDb(db: PgliteDatabase<Record<string, unknown>>): Promise<void> {
  const res = await db.execute<{ pushed: boolean; tracked: boolean }>(sql`
    select to_regclass('public.sync_runs') is not null as pushed,
           to_regclass('drizzle.__drizzle_migrations') is not null as tracked`);
  const { pushed, tracked } = res.rows[0];
  if (!pushed || tracked) return;
  const [first] = readMigrationFiles(MIGRATIONS);
  if (!first) return;
  await db.execute(sql`create schema if not exists drizzle`);
  await db.execute(sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`);
  await db.execute(sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${first.hash}, ${first.folderMillis})`);
  console.info("[base] base creada con db:push: se registró la migración inicial como aplicada");
}

/** Deja el esquema al día. Para quien hace `git pull`, las tablas nuevas llegan solas. */
export async function migrateLocal(db: PgliteDatabase<Record<string, unknown>>): Promise<void> {
  await baselinePushedDb(db);
  await migrate(db, MIGRATIONS);
}
