import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyIntent } from "./intent";
import { isRelevantIdea, titleFromUrl } from "./collect";

test("intención por palabras clave", () => {
  assert.equal(classifyIntent("cuanto cuesta una página web"), "precio");
  assert.equal(classifyIntent("que es una agencia de branding"), "dudas");
  assert.equal(classifyIntent("mejor agencia de marketing en mexico"), "comparativa");
  assert.equal(classifyIntent("agencia de marketing en guadalajara"), "local");
  assert.equal(classifyIntent("Would I be wrong to request a refund from my website designer?"), "quejas");
  assert.equal(classifyIntent("agencia de branding y diseño"), "general");
});

test("filtra otros países, empleos y temas ajenos", () => {
  assert.equal(isRelevantIdea("la mejor agencia de branding en perú"), false);
  assert.equal(isRelevantIdea("agencia de marketing vacantes"), false);
  assert.equal(isRelevantIdea("problemas con web whatsapp"), false);
  assert.equal(isRelevantIdea("cuanto cuesta una agencia de branding"), true);
});

test("título legible desde la URL", () => {
  assert.equal(titleFromUrl("https://estudio.example/blog/5-fuerzas-de-porter/"), "5 fuerzas de porter");
});

test("marca nueva sin lista propia: descarta ideas de otros países hispanohablantes, no las del suyo", async () => {
  const { ideaFilters } = await import("./collect");
  const { WorkspaceSchema } = await import("@/lib/workspace/schema");
  const { EXAMPLE_WORKSPACE } = await import("@/lib/workspace/example");
  const w = WorkspaceSchema.parse({ ...EXAMPLE_WORKSPACE, content: { ...EXAMPLE_WORKSPACE.content, excludePatterns: [] } });
  const mx = ideaFilters(w.content, "es-MX").exclude;
  assert.ok(mx?.test("mejores churros madrid"));
  assert.ok(mx?.test("chocolate caliente en bogotá"));
  assert.ok(!mx?.test("churros en guadalajara"));
  const es = ideaFilters({ ...w.content }, "es-ES").exclude;
  assert.ok(!es?.test("churros madrid") && es?.test("churros en méxico"));
  assert.equal(ideaFilters({ ...w.content }, "en-US").exclude, null);
});
