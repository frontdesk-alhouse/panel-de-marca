#!/usr/bin/env node
/**
 * Servidor para las pruebas: base nueva en data/e2e, modo local, sin ninguna llave
 * (aunque la computadora tenga un .env.local con llaves reales, aquí se vacían).
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const port = process.argv[2] ?? "4310";
const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const KEYS = ["ANTHROPIC_API_KEY", "APIFY_TOKEN", "PSI_API_KEY", "CLARITY_TOKEN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN",
  "GA4_PROPERTY_ID", "GSC_SITE_URL", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "META_TOKEN", "META_AD_ACCOUNT_ID", "META_IG_USER_ID", "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "ENABLE_MOCK_SOURCE", "AUTH_DEV_BYPASS"];
const env = {
  ...process.env,
  ...Object.fromEntries(KEYS.map((k) => [k, ""])),
  APP_MODE: "local",
  DATABASE_URL: "pglite:./data/e2e",
  // Las llaves que guarde la prueba van a un archivo aparte: el .env.local real no se toca.
  PANEL_ENV_FILE: "data/e2e-env/.env.local",
  NEXT_TELEMETRY_DISABLED: "1",
};

rmSync("data/e2e", { recursive: true, force: true });
rmSync("data/e2e.lock", { force: true });
rmSync("data/e2e-env", { recursive: true, force: true });
if (!process.env.E2E_SKIP_BUILD) execSync(`"${process.execPath}" "${next}" build`, { stdio: "inherit", env });
const server = spawn(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", port], { stdio: "inherit", env });
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => server.kill(s));
server.on("exit", (code) => process.exit(code ?? 0));
