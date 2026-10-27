import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta del modo local: un panel de verdad (build de producción)
 * con base nueva en data/e2e y sin llaves. Corren en orden porque comparten la base:
 * 01 sin marca → 02 configuración inicial → 03 panel configurado.
 *   npm run test:e2e
 */
const PORT = 4310;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  // Sin reintentos: las pruebas comparten la base y un reintento a medias falla por otra razón.
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "es-MX",
    extraHTTPHeaders: { "Accept-Language": "es-MX,es;q=0.9" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node e2e/server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/setup`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
