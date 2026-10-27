/**
 * Autoriza UNA vez la cuenta dueña de GA4, Search Console, Ads y Business Profile.
 *   npm run auth:google [-- --client ruta/al/client_secret.json]
 * Sin --client toma el client_secret_*.json más reciente de ~/Downloads.
 * Escribe GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN en .env.local
 * sin imprimirlos, y lista las propiedades de GA4 y los sitios de Search Console.
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { google } from "googleapis";
import { GOOGLE_SCOPES } from "../src/sources/google-auth";

const ENV_FILE = ".env.local";
const WAIT_MS = 15 * 60_000;

function findClientFile(): string {
  const i = process.argv.indexOf("--client");
  if (i > -1) return process.argv[i + 1];
  const dir = join(homedir(), "Downloads");
  const files = readdirSync(dir)
    .filter((f) => /^client_secret_.*\.json$/.test(f))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!files.length) throw new Error("No encontré client_secret_*.json en ~/Downloads. Usa --client <ruta>.");
  return files[0];
}

function setEnv(values: Record<string, string>) {
  let text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(ENV_FILE, text, { mode: 0o600 });
}

async function waitForCode(): Promise<{ code: string; redirectUri: string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(code ? "<p>Listo. Ya puedes cerrar esta pestaña.</p>" : `<p>No se autorizó: ${error ?? "sin código"}</p>`);
      if (code) resolve({ code, redirectUri, close: () => server.close() });
      else reject(new Error(`Google respondió: ${error ?? "sin código"}`));
    });
    let redirectUri = "";
    server.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      server.emit("ready", redirectUri);
    });
    server.once("ready", (uri: string) => {
      const client = new google.auth.OAuth2(creds.client_id, creds.client_secret, uri);
      const authUrl = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: GOOGLE_SCOPES });
      console.log("Abriendo Google en el navegador. Si no se abre, copia esta URL:\n" + authUrl + "\n");
      if (!process.argv.includes("--no-open")) execFile("open", [authUrl]);
    });
    setTimeout(() => reject(new Error("Se agotó el tiempo de espera (15 min).")), WAIT_MS).unref();
  });
}

const raw = JSON.parse(readFileSync(findClientFile(), "utf8"));
const creds: { client_id: string; client_secret: string } = raw.installed ?? raw.web;
if (!creds?.client_id) throw new Error("El JSON no parece un cliente OAuth de Google.");

async function main() {
  const { code, redirectUri, close } = await waitForCode();
  close();
  const client = new google.auth.OAuth2(creds.client_id, creds.client_secret, redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google no devolvió refresh token. Quita el acceso en myaccount.google.com/permissions y repite.");
  setEnv({ GOOGLE_CLIENT_ID: creds.client_id, GOOGLE_CLIENT_SECRET: creds.client_secret, GOOGLE_REFRESH_TOKEN: tokens.refresh_token });
  console.log("Credenciales guardadas en .env.local (no se muestran).\n");
  client.setCredentials(tokens);

  const admin = google.analyticsadmin({ version: "v1beta", auth: client });
  try {
    const { data } = await admin.accountSummaries.list({ pageSize: 200 });
    console.log("Propiedades de GA4:");
    for (const a of data.accountSummaries ?? []) {
      for (const p of a.propertySummaries ?? []) console.log(`  ${p.property?.replace("properties/", "")}  ${p.displayName}  (cuenta: ${a.displayName})`);
    }
  } catch (e) {
    console.log("No pude listar GA4 (¿está habilitada la Google Analytics Admin API?):", (e as Error).message);
  }

  const sc = google.searchconsole({ version: "v1", auth: client });
  try {
    const { data } = await sc.sites.list();
    console.log("\nSitios de Search Console:");
    for (const s of data.siteEntry ?? []) console.log(`  ${s.siteUrl}  (${s.permissionLevel})`);
  } catch (e) {
    console.log("No pude listar Search Console:", (e as Error).message);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
