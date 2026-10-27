import assert from "node:assert/strict";
import test from "node:test";
import { mergeEnv, parseEnv } from "./env-file";

const FILE = `# Panel\nAPP_MODE=local\n\n# Google\nPSI_API_KEY=abc # comentario\nexport CLARITY_TOKEN='tok en'\n`;

test("lee valores con comillas, export y comentarios", () => {
  assert.deepEqual(parseEnv(FILE), { APP_MODE: "local", PSI_API_KEY: "abc", CLARITY_TOKEN: "tok en" });
});

test("reemplaza en su lugar, agrega al final, borra con null y conserva los comentarios", () => {
  const out = mergeEnv(FILE, { PSI_API_KEY: "nueva", CLARITY_TOKEN: null, APIFY_TOKEN: "apify_x" });
  assert.equal(out, `# Panel\nAPP_MODE=local\n\n# Google\nPSI_API_KEY="nueva"\nAPIFY_TOKEN="apify_x"\n`);
});

test("las formas reales de las llaves vuelven idénticas", () => {
  for (const v of ["sk-ant-api03-AbC_d-9", "1//0gXyz-ab_c", "EAAG+abc/def==", "apify_api_x", "https://sc-domain.example.com/", "a#b=c"]) {
    assert.equal(parseEnv(mergeEnv("", { X_KEY: v })).X_KEY, v, v);
  }
});

test("rechaza lo que Next leería distinto en vez de guardarlo alterado", () => {
  for (const v of ["con espacio", 'co"mi', "pre$cio", "barra\\", "dos\nlineas", "'x'"]) {
    assert.throws(() => mergeEnv("", { X_KEY: v }), /caracteres no permitidos/, v);
  }
});

test("no acepta nombres que podrían inyectar líneas", () => {
  assert.throws(() => mergeEnv("", { "BAD\nAPP_MODE": "cloud" }));
  assert.throws(() => mergeEnv("", { "lower": "x" }));
});

test("si una llave está repetida, cambia o se borra en todas (dotenv lee la última)", () => {
  const dup = `PSI_API_KEY=vieja\nX=1\nPSI_API_KEY=otra\n`;
  assert.equal(parseEnv(mergeEnv(dup, { PSI_API_KEY: "nueva" })).PSI_API_KEY, "nueva");
  assert.equal(mergeEnv(dup, { PSI_API_KEY: "nueva" }), `PSI_API_KEY="nueva"\nX=1\n`);
  assert.equal(parseEnv(mergeEnv(dup, { PSI_API_KEY: null })).PSI_API_KEY, undefined);
});

test("desde el panel solo se pueden escribir llaves de integraciones", async () => {
  const { isWritableSecret } = await import("./keys");
  for (const k of ["APP_MODE", "DATABASE_URL", "AUTH_SECRET", "CRON_SECRET", "NODE_OPTIONS", "VERCEL", "ALLOWED_EMAILS"]) assert.equal(isWritableSecret(k), false, k);
  for (const k of ["ANTHROPIC_API_KEY", "PSI_API_KEY", "META_TOKEN"]) assert.equal(isWritableSecret(k), true, k);
});
