import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLE_COMPETITORS, EXAMPLE_WORKSPACE } from "./example";
import { WorkspaceSchema } from "./schema";
import { clearWorkspace, competitors, DEFAULT_LOCALE, localCities, localeSettings, setWorkspace, ws, WorkspaceMissingError } from "./store";

test("sin configuración, leerla falla con un error claro y los formatos usan México", () => {
  clearWorkspace();
  assert.throws(() => ws(), WorkspaceMissingError);
  assert.deepEqual(localeSettings(), DEFAULT_LOCALE);
});

test("el sitio propio va primero y marcado como propio", () => {
  setWorkspace(EXAMPLE_WORKSPACE, EXAMPLE_COMPETITORS);
  const list = competitors();
  assert.equal(list[0].domain, "ejemplo.mx");
  assert.equal(list[0].self, true);
  assert.equal(list.length, 1 + EXAMPLE_COMPETITORS.length);
  assert.ok(list.slice(1).every((c) => !c.self));
});

test("área local: sin municipios usa la ciudad", () => {
  setWorkspace({ ...EXAMPLE_WORKSPACE, brand: { ...EXAMPLE_WORKSPACE.brand, localCities: [] } }, []);
  assert.deepEqual(localCities(), ["Guadalajara"]);
});

test("el esquema rechaza dominios con https:// o rutas", () => {
  const bad = { ...EXAMPLE_WORKSPACE, brand: { ...EXAMPLE_WORKSPACE.brand, domain: "https://ejemplo.mx/" } };
  assert.equal(WorkspaceSchema.safeParse(bad).success, false);
  assert.equal(WorkspaceSchema.safeParse(EXAMPLE_WORKSPACE).success, true);
});
