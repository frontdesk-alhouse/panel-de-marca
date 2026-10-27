import assert from "node:assert/strict";
import test from "node:test";
import { googleSearchLinks, isLikelyCompetitor, rankCompetitors } from "./suggest";

test("redes, directorios y gobierno no cuentan como competidores", () => {
  for (const d of ["facebook.com", "es.wikipedia.org", "doctoralia.com.mx", "clutch.co", "jalisco.gob.mx", "dulcesol.example", "blog.dulcesol.example"]) assert.equal(isLikelyCompetitor(d, "dulcesol.example"), false, d);
  for (const d of ["pasteleriaregia.example", "lamorena.example"]) assert.equal(isLikelyCompetitor(d, "dulcesol.example"), true, d);
});

test("ordena por cuántas búsquedas los muestran y luego por su mejor lugar", () => {
  const items = [
    { searchQuery: { term: "pasteles monterrey" }, organicResults: [
      { position: 1, url: "https://www.facebook.com/x", title: "x" },
      { position: 2, url: "https://lamorena.example/", title: "Pasteles | La Morena" },
      { position: 3, url: "https://pasteleriaregia.example/", title: "Pastelería Regia" },
      { position: 4, url: "https://dulcesol.example/", title: "Dulce Sol" },
    ] },
    { searchQuery: { term: "pastel de boda monterrey" }, organicResults: [
      { position: 5, url: "https://www.pasteleriaregia.example/bodas", title: "Bodas – Pastelería Regia" },
      { position: 6, url: "https://otra.example/", title: "Otra" },
    ] },
  ];
  const r = rankCompetitors(items, "dulcesol.example");
  assert.deepEqual(r.map((c) => [c.domain, c.hits, c.best]), [["pasteleriaregia.example", 2, 3], ["lamorena.example", 1, 2], ["otra.example", 1, 6]]);
  assert.equal(r[1].name, "La Morena");
});

test("sin Apify: links a Google en el país e idioma de la marca", () => {
  const [l] = googleSearchLinks(["pasteles monterrey"], "es-MX");
  assert.equal(l.url, "https://www.google.com/search?q=pasteles+monterrey&hl=es&gl=mx");
});
