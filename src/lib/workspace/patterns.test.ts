import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLE_WORKSPACE } from "./example";
import { countryName, localIntentPattern, searchRegion, servicePagePattern, serviceTitlePattern } from "./patterns";
import { WorkspaceSchema } from "./schema";

const w = WorkspaceSchema.parse(EXAMPLE_WORKSPACE);
const bakery = WorkspaceSchema.parse({
  ...EXAMPLE_WORKSPACE,
  brand: { ...EXAMPLE_WORKSPACE.brand, city: "Monterrey", localCities: ["San Pedro Garza García"] },
  services: ["pasteles", "panadería artesanal"],
  content: { ...EXAMPLE_WORKSPACE.content, topics: ["pastel de cumpleaños"] },
  locale: { ...EXAMPLE_WORKSPACE.locale, locale: "es-CO" },
});

test("intención local con las ciudades de la marca, no las de Guadalajara", () => {
  assert.ok(localIntentPattern(bakery).test("pasteles en monterrey"));
  assert.ok(localIntentPattern(bakery).test("panadería san pedro garza garcía"));
  assert.ok(localIntentPattern(bakery).test("pastelería cerca de mí"));
  assert.ok(!localIntentPattern(bakery).test("pasteles en zapopan"));
});

test("señales de servicio salen de sus servicios y temas", () => {
  assert.ok(serviceTitlePattern(bakery)?.test("Pasteles artesanales · Dulce Sol"));
  assert.ok(!serviceTitlePattern(bakery)?.test("Agencia de branding"));
  assert.ok(servicePagePattern(bakery)?.test("/panaderia-artesanal"), "sin tilde");
  assert.ok(servicePagePattern(bakery)?.test("/panader%C3%ADa"), "codificada");
  assert.ok(servicePagePattern(bakery)?.test("/servicios"));
  assert.ok(!servicePagePattern(bakery)?.test("/nosotros"));
  assert.ok(servicePagePattern(w)?.test("/branding"));
});

test("país e idioma de búsqueda desde el formato de la marca", () => {
  assert.deepEqual(searchRegion("es-CO"), { language: "es", country: "co" });
  assert.deepEqual(searchRegion("en"), { language: "en", country: null });
  assert.equal(countryName("es-MX"), "México");
  assert.equal(countryName("en-US"), "United States");
});
