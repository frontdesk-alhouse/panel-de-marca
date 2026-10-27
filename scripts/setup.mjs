#!/usr/bin/env node
/**
 * Prepara el panel para correr en esta computadora (modo local). Se puede repetir.
 *   npm install && npm run setup
 * - Revisa la versión de Node.
 * - Crea .env.local con APP_MODE=local y un AUTH_SECRET al azar (si no existen).
 * - Construye la app (npm start la abre después).
 */
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const MIN_NODE = 22;
const major = Number(process.versions.node.split(".")[0]);
if (major < MIN_NODE) {
  console.error(`Necesitas Node ${MIN_NODE} o más nuevo (tienes ${process.versions.node}). Descárgalo en https://nodejs.org (versión LTS).`);
  process.exit(1);
}

const ENV = ".env.local";
const current = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const has = (key) => new RegExp(`^${key}=`, "m").test(current);
const add = [];
if (!has("APP_MODE")) add.push("APP_MODE=local");
if (!has("AUTH_SECRET")) add.push(`AUTH_SECRET="${randomBytes(32).toString("base64url")}"`);
if (add.length) {
  const header = current ? "" : "# Panel de marca · configuración local. Las llaves se agregan desde el panel (Ajustes).\n";
  writeFileSync(ENV, `${header}${current}${current && !current.endsWith("\n") ? "\n" : ""}${add.join("\n")}\n`, { mode: 0o600 });
}
chmodSync(ENV, 0o600);
console.log(add.length ? `✓ ${ENV} listo` : `✓ ${ENV} ya estaba listo`);

console.log("Construyendo el panel (tarda uno o dos minutos la primera vez)…");
execSync(`"${process.execPath}" "${createRequire(import.meta.url).resolve("next/dist/bin/next")}" build`, { stdio: "inherit", env: { ...process.env, APP_MODE: "local", NEXT_TELEMETRY_DISABLED: "1" } });
console.log("\n✓ Listo. Ábrelo con:  npm start");
