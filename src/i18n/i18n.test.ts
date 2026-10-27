import assert from "node:assert/strict";
import test from "node:test";
import en from "./en";
import es from "./es";
import { langFromAcceptLanguage } from "./index";

/** Recorre el diccionario y devuelve cada hoja con su ruta. */
function leaves(o: unknown, path = ""): [string, unknown][] {
  if (typeof o === "string" || typeof o === "function") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}

test("el inglés tiene exactamente las mismas claves y largos de listas que el español", () => {
  assert.deepEqual(leaves(en).map(([p]) => p), leaves(es).map(([p]) => p));
});

test("ningún texto vacío salvo los marcados a propósito", () => {
  const empty = leaves(en).filter(([p, v]) => v === "" && !p.endsWith(".question")).map(([p]) => p);
  assert.deepEqual(empty, []);
});

test("las funciones devuelven texto en los dos idiomas", () => {
  assert.equal(es.connect.title("Apify"), "Conecta Apify");
  assert.equal(en.connect.title("Apify"), "Connect Apify");
  assert.equal(en.setup.connections.count(2, 7), "2 of 7 connected");
});

test("los pasos de cada integración coinciden en cantidad con el catálogo", async () => {
  const { INTEGRATIONS } = await import("@/lib/integrations/catalog");
  for (const it of INTEGRATIONS) {
    for (const d of [es, en]) {
      const t = d.integrations[it.id];
      assert.equal(t.steps.length, it.steps.length, `${it.id} pasos`);
      assert.deepEqual(Object.keys(t.fields).sort(), it.fields.map((f) => f.key).sort(), `${it.id} campos`);
    }
  }
});

test("idioma del navegador", () => {
  assert.equal(langFromAcceptLanguage("en-US,en;q=0.9"), "en");
  assert.equal(langFromAcceptLanguage("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(langFromAcceptLanguage(null), "es");
});

test("Claude responde en inglés solo si la marca usa el panel en inglés", async () => {
  const { buildSystem } = await import("@/lib/assistant/context");
  const { EXAMPLE_WORKSPACE } = await import("@/lib/workspace/example");
  const { WorkspaceSchema } = await import("@/lib/workspace/schema");
  const esWs = WorkspaceSchema.parse(EXAMPLE_WORKSPACE);
  const enWs = { ...esWs, locale: { ...esWs.locale, language: "en" as const, locale: "en-US" } };
  assert.ok(!buildSystem(esWs, []).includes("## Idioma"));
  assert.ok(buildSystem(enWs, []).endsWith("Si la persona escribe en español, responde en español."));
});
