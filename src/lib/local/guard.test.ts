import assert from "node:assert/strict";
import test from "node:test";
import { appMode } from "../mode";
import { isLoopbackHost, localRequestProblem } from "./guard";

test("en Vercel nunca es local, aunque digan APP_MODE=local", () => {
  assert.equal(appMode({ VERCEL: "1", APP_MODE: "local", DATABASE_URL: "pglite:./x" }), "cloud");
});

test("local por APP_MODE o por base embebida; nube por Neon o por APP_MODE=cloud", () => {
  assert.equal(appMode({ APP_MODE: "local" }), "local");
  assert.equal(appMode({ DATABASE_URL: "pglite:./data/panel" }), "local");
  assert.equal(appMode({ DATABASE_URL: "postgres://neon/db" }), "cloud");
  assert.equal(appMode({ APP_MODE: "cloud", DATABASE_URL: "pglite:./x" }), "cloud");
  assert.equal(appMode({}), "cloud");
});

test("solo hosts de la misma computadora", () => {
  for (const h of ["localhost:3000", "127.0.0.1:3000", "127.0.0.1", "[::1]:3000", "LOCALHOST"]) assert.ok(isLoopbackHost(h), h);
  for (const h of ["192.168.1.5:3000", "evil.com", "localhost.evil.com", "127.0.0.1.nip.io", "", null]) assert.ok(!isLoopbackHost(h), String(h));
});

test("DNS rebinding: un dominio ajeno que apunta a 127.0.0.1 se rechaza aunque sea GET", () => {
  assert.equal(localRequestProblem({ method: "GET", host: "attacker.example:3000", origin: null }), "host no local");
});

test("otra página del navegador no puede escribir en el panel", () => {
  assert.equal(localRequestProblem({ method: "POST", host: "127.0.0.1:3000", origin: "https://evil.com" }), "origen no local");
  assert.equal(localRequestProblem({ method: "POST", host: "127.0.0.1:3000", origin: "null" }), "origen no local");
  assert.equal(localRequestProblem({ method: "DELETE", host: "localhost:3000", origin: "http://localhost.evil.com" }), "origen no local");
});

test("el propio panel y los scripts locales pasan", () => {
  assert.equal(localRequestProblem({ method: "POST", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }), null);
  assert.equal(localRequestProblem({ method: "POST", host: "localhost:3000", origin: "http://localhost:3000" }), null);
  assert.equal(localRequestProblem({ method: "POST", host: "127.0.0.1:3000", origin: null }), null);
  assert.equal(localRequestProblem({ method: "GET", host: "localhost:3000", origin: "https://evil.com" }), null);
});
