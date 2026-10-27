import assert from "node:assert/strict";
import test from "node:test";
import { brandTermsFor, competitorFromFacts, domainsInText, EMPTY_BRIEFING, formFromSite, formToWorkspace, guessLocale, missingFields, workspaceToForm } from "./brand-form";
import type { SiteFacts } from "./extract";

const facts: SiteFacts = { name: "Dulce Sol", lang: "es", city: "Monterrey", phone: null, instagram: "dulcesol.mty", socials: [], prices: [] };

test("idioma del sitio, región del navegador si el sitio no la dice", () => {
  assert.deepEqual(guessLocale("es", "es-CO"), { language: "es", locale: "es-CO", currency: "COP" });
  assert.deepEqual(guessLocale("es-ES", "es-MX", "rosetta.com.mx"), { language: "es", locale: "es-MX", currency: "MXN" }, "el dominio .mx manda sobre un es-ES mal declarado");
  assert.deepEqual(guessLocale("es-ES", "es-MX", "panaderia.com"), { language: "es", locale: "es-MX", currency: "MXN" }, "sin ccTLD, el navegador");
  assert.deepEqual(guessLocale("es-AR", "es", "panaderia.com"), { language: "es", locale: "es-AR", currency: "ARS" }, "sin región en el navegador, la del sitio");
  assert.deepEqual(guessLocale(null, "en-GB"), { language: "en", locale: "en-GB", currency: "GBP" });
  assert.equal(guessLocale("pt", "pt-BR").currency, "USD", "moneda desconocida → USD, editable");
});

test("términos de marca: nombre, sin espacios y dominio", () => {
  assert.deepEqual(brandTermsFor("Dulce Sol", "dulcesol.example"), ["dulce sol", "dulcesol"]);
});

test("sin Claude: el formulario sale del sitio y falta lo que solo sabe la persona", () => {
  const f = formFromSite({ domain: "dulcesol.example", facts, keyPaths: ["/servicios"], draft: null, briefing: EMPTY_BRIEFING, timeZone: "America/Monterrey", browserLocale: "es-MX" });
  assert.equal(f.name, "Dulce Sol");
  assert.equal(f.city, "Monterrey");
  assert.deepEqual(f.keyPaths, ["/", "/servicios"]);
  assert.deepEqual(missingFields(f), ["tu nombre", "«Qué es tu marca» (un párrafo)", "al menos un servicio o producto"]);
});

test("del formulario a una configuración válida, y de vuelta igual", () => {
  const f = {
    ...formFromSite({ domain: "dulcesol.example", facts, keyPaths: [], draft: null, briefing: { ...EMPTY_BRIEFING, wantToKnow: ["precios" as const], audience: "novias" }, timeZone: "America/Monterrey", browserLocale: "es-MX" }),
    owner: "Ana", about: "Pastelería artesanal.", services: ["Pasteles de boda", "Galletas"],
    packages: [{ name: "Boda chica", price: 3200 }, { name: "Boda chica", price: null }, { name: "  ", price: 10 }],
    relevantTerms: ["pastel", "boda (civil)"], topics: ["pastel de boda"], targetQueries: ["pasteles monterrey"],
  };
  const w = formToWorkspace(f);
  assert.equal(w.brand.team, "Ana", "sin equipo, el dueño");
  assert.equal(w.brand.mapsQuery, "Dulce Sol Monterrey");
  assert.equal(w.assistant.brief, "Pastelería artesanal.", "sin brief, el párrafo");
  assert.equal(w.assistant.marketContext, "Pasteles de boda en Monterrey");
  assert.deepEqual(w.packages.map((p) => p.id), ["boda-chica", "boda-chica-2"]);
  assert.deepEqual(w.content.relevantPatterns, ["pastel", "boda \\(civil\\)"], "palabras escapadas para el filtro");
  assert.equal(w.briefing?.audience, "novias");
  assert.deepEqual(formToWorkspace({ ...f, topics: [] }).content.topics, ["pasteles de boda", "galletas"], "sin temas, los servicios");
  const back = workspaceToForm(w);
  assert.deepEqual(back.relevantTerms, ["pastel", "boda (civil)"]);
  assert.deepEqual(formToWorkspace(back, w), w, "ida y vuelta sin cambios");
});

test("conserva metas e IDs de cuentas que el formulario no toca", () => {
  const base = formToWorkspace({ ...formFromSite({ domain: "dulcesol.example", facts, keyPaths: [], draft: null, briefing: EMPTY_BRIEFING, timeZone: "America/Monterrey", browserLocale: "es-MX" }), owner: "Ana", about: "x", services: ["a"] });
  const prev = { ...base, targets: { ...base.targets, cpl: 500 }, platforms: { ga4PropertyId: "123" } };
  const w = formToWorkspace(workspaceToForm(prev), prev);
  assert.equal(w.targets.cpl, 500);
  assert.equal(w.platforms.ga4PropertyId, "123");
});

test("dominios escritos en texto libre", () => {
  assert.deepEqual(domainsInText("La Morena (lamorena.example), https://www.pasteleriaregia.example/bodas y Dulce Sol"), ["lamorena.example", "pasteleriaregia.example"]);
});

test("competidor desde su sitio, con la ciudad propia si no dice la suya", () => {
  assert.deepEqual(competitorFromFacts("lamorena.example", { ...facts, name: "La Morena", city: null, instagram: null }, "Monterrey"), { name: "La Morena", domain: "lamorena.example", city: "Monterrey", mapsQuery: "La Morena Monterrey" });
});

test("guardar desde Ajustes no rompe patrones importados que nadie tocó", () => {
  const base = formToWorkspace({ ...formFromSite({ domain: "dulcesol.example", facts, keyPaths: [], draft: null, briefing: EMPTY_BRIEFING, timeZone: "America/Monterrey", browserLocale: "es-MX" }), owner: "Ana", about: "x", services: ["a"] });
  const prev = { ...base, content: { ...base.content, relevantPatterns: ["dise[ñn]o", "p[aá]gina web", "\\bai\\b"] } };
  const form = workspaceToForm(prev);
  const w = formToWorkspace({ ...form, relevantTerms: [...form.relevantTerms, "logo (nuevo)"] }, prev);
  assert.deepEqual(w.content.relevantPatterns, ["dise[ñn]o", "p[aá]gina web", "\\bai\\b", "logo \\(nuevo\\)"]);
});
