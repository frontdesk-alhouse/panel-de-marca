import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSerp, type SerpItem } from "./serp";

// Forma real del actor apify/google-search-scraper (corrida del 2026-10-23, recortada).
const items: SerpItem[] = [
  { searchQuery: { term: "diseño web guadalajara", page: 1 }, organicResults: [
    { position: 1, url: "https://sectorweb.mx/", title: "Sector Web" },
    { position: 8, url: "https://rival-uno.mx/diseno-paginas-web-guadalajara/", title: "Páginas Web Guadalajara - rival-uno.mx" },
  ], peopleAlsoAsk: [{ question: "¿Cuánto se cobra por un diseño web?" }] },
  { searchQuery: { term: "diseño web guadalajara", page: 2 }, organicResults: [
    { position: 11, url: "https://desingsgdl.com.mx/", title: "DesingsGDL" },
    { position: 17, url: "https://rival-uno.mx/diseno-paginas-web-guadalajara/", title: "repetido" },
  ] },
  { searchQuery: { term: "otra búsqueda que no es objetivo", page: 1 }, organicResults: [{ position: 1, url: "https://ejemplo.mx/" }] },
];

test("guarda el mejor lugar de cada estudio y marca la búsqueda como medida", () => {
  const { rows } = parseSerp(items, "2026-10-23");
  const bustum = rows.filter((r) => r.metric === "position" && r.dimKey.endsWith("site:rival-uno.mx"));
  assert.equal(bustum.length, 1);
  assert.equal(bustum[0].value, 8);
  const checked = rows.find((r) => r.metric === "checked");
  assert.equal(checked?.dimKey, "q:diseño web guadalajara");
  assert.equal((checked?.meta?.top as unknown[]).length, 3);
});

test("ignora búsquedas que no están en la lista objetivo", () => {
  const { rows } = parseSerp(items, "2026-10-23");
  assert.ok(!rows.some((r) => r.dimKey.includes("ejemplo.mx")));
});

test("las preguntas de Google pasan a ideas de contenido", () => {
  const { ideas } = parseSerp(items, "2026-10-23");
  assert.equal(ideas[0].text, "¿Cuánto se cobra por un diseño web?");
  assert.equal(ideas[0].source, "paa");
});
