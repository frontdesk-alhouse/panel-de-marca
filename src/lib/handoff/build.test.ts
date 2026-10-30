import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHandoff, sortItems, type HandoffInput } from "./build";

const input: HandoffInput = {
  origin: "Calificación",
  brand: { name: "Pastelería Lumen", domain: "lumen.example", city: "Monterrey" },
  asOf: "2026-10-28",
  items: [
    { id: "a", title: "Medir el envío del formulario", impact: "medio" },
    { id: "b", title: "Cambiar objetivo de Meta a Leads", impact: "alto", evidence: { confidence: "alta", basis: "benchmark de industria", points: 3.2 }, metric: { label: "Costo por lead", value: "$420", target: "$250", band: "red", source: "Meta Ads" } },
    { id: "c", title: "  " },
  ],
  notes: ["No juzgar Search Console antes del 5 de nov", ""],
  skills: [{ id: "anuncios-eficiencia", name: "Anuncios", zipUrl: "https://panel/api/skills/anuncios-eficiencia/zip" }],
  panelUrl: "https://panel",
};

test("ordena por impacto y descarta acciones vacías", () => {
  assert.deepEqual(sortItems(input.items).map((i) => i.title.trim()), ["Cambiar objetivo de Meta a Leads", "Medir el envío del formulario", ""]);
  const md = buildHandoff(input, "code");
  assert.match(md, /1\. \*\*Cambiar objetivo de Meta a Leads\*\* _\(impacto alto\)_/);
  assert.match(md, /2\. \*\*Medir el envío del formulario\*\*/);
  assert.doesNotMatch(md.split("## Ten en cuenta")[0], /3\. /);
});

test("incluye métrica con meta, banda y fuente, y el link del skill", () => {
  const md = buildHandoff(input, "code");
  assert.match(md, /Costo por lead \(hoy: \$420 · meta: \$250 · rojo · fuente: Meta Ads\)/);
  assert.match(md, /\*\*anuncios-eficiencia\*\*.*https:\/\/panel\/api\/skills\/anuncios-eficiencia\/zip/);
  assert.match(md, /https:\/\/lumen\.example/);
});

test("Code pide no publicar sin visto bueno; App guía paso a paso", () => {
  assert.match(buildHandoff(input, "code"), /no publiques a producción/);
  assert.match(buildHandoff(input, "app"), /paso a paso/);
  assert.doesNotMatch(buildHandoff(input, "app"), /rama o en staging/);
});

test("en inglés y sin skills no deja secciones vacías", () => {
  const md = buildHandoff({ ...input, skills: [], notes: [] }, "app", "en");
  assert.match(md, /There is no specific skill/);
  assert.doesNotMatch(md, /Keep in mind/);
});

test("trae evidencia y pide el bloque de cambios para la bitácora", () => {
  const md = buildHandoff({ ...input, today: "2026-10-29" }, "other");
  assert.match(md, /Confianza alta: benchmark de industria\. Puede sumar hasta \+3\.2 puntos/);
  assert.match(md, /```panel-cambios\n- 2026-10-29 \| propio \| conversion \|/);
  assert.match(md, /SKILL\.md/);
});
