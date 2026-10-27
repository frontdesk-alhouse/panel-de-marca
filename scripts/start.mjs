#!/usr/bin/env node
/**
 * Abre el panel en esta computadora: solo en 127.0.0.1 (nadie más en la red lo ve).
 *   npm start            → http://127.0.0.1:3000
 *   PORT=4000 npm start  → otro puerto
 * Si falta construirlo (o el código cambió con git pull), lo construye antes.
 */
import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";

if (!existsSync(".env.local")) {
  console.error("Falta prepararlo: corre  npm run setup");
  process.exit(1);
}

const PORT = process.env.PORT || "3000";
const URL = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, APP_MODE: "local", NEXT_TELEMETRY_DISABLED: "1" };

/** Construir si no hay build o si llegó código nuevo (git pull) después del último build. */
function needsBuild() {
  const marker = ".next/BUILD_ID";
  if (!existsSync(marker)) return true;
  try {
    const lastCommit = Number(execSync("git log -1 --format=%ct", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()) * 1000;
    return lastCommit > statSync(marker).mtimeMs;
  } catch {
    return false; // descargado sin git: el build de npm run setup sirve
  }
}

if (needsBuild()) {
  console.log("Construyendo el panel…");
  execSync(`"${process.execPath}" "${createRequire(import.meta.url).resolve("next/dist/bin/next")}" build`, { stdio: "inherit", env });
}

// Next directo con node (no «npx»): funciona igual en Mac, Linux y Windows.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", PORT], { stdio: "inherit", env });
server.on("error", (err) => {
  console.error("No se pudo arrancar el panel:", err.message);
  process.exit(1);
});
console.log(`\nPanel en ${URL}  (cierra esta ventana o presiona Ctrl+C para apagarlo)\n`);

// Abre el navegador cuando el servidor responde.
function openBrowser(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => console.log(`Abre ${url} en tu navegador.`));
  child.unref();
}
let tries = 0;
const timer = setInterval(async () => {
  tries++;
  try {
    const res = await fetch(URL, { redirect: "manual" });
    if (res.status < 500) {
      clearInterval(timer);
      if (!process.env.NO_OPEN) openBrowser(URL);
    }
  } catch {
    if (tries > 120) {
      clearInterval(timer);
      console.log(`El panel tarda en responder; ábrelo en ${URL} cuando esté listo.`);
    }
  }
}, 1000);

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
