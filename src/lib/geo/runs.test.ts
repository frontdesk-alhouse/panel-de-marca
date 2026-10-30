import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { citationIndex, citedDomains, parseFrontmatter, parseRun } from "./runs";

const DIR = path.join(process.cwd(), "skills/seo-geo/examples/corridas-ejemplo");
const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));

test("lee las 12 corridas de ejemplo del skill", () => {
  const runs = files.map((f) => parseRun(readFileSync(path.join(DIR, f), "utf8")));
  assert.equal(runs.length, 12);
  const first = parseRun(readFileSync(path.join(DIR, "Q-01_chatgpt_c1.md"), "utf8"));
  assert.equal(first.assistant, "chatgpt");
  assert.equal(first.queryId, "Q-01");
  assert.equal(first.appears, true);
  assert.equal(first.position, 3);
  assert.equal(first.citedUrls.length, 3);
  assert.match(first.query, /cirujano de columna/);
  const all = citationIndex(runs)[0];
  assert.equal(all.assistant, "all");
  assert.equal(all.n, 12);
});

test("frontmatter: listas en línea y con guiones, null y booleanos", () => {
  const f = parseFrontmatter("---\na: [x, \"y\"]\nb:\n  - https://u.example/1\nc: null\nd: false\ne: 3\n---\n");
  assert.deepEqual(f, { a: ["x", "y"], b: ["https://u.example/1"], c: null, d: false, e: 3 });
});

test("sin aparecer no hay posición; asistente desconocido se rechaza", () => {
  const base = "---\nconsulta: Q-02\nasistente: claude\ncorrida: 2\nfecha: 2026-10-20\nbusco: true\naparece: false\nposicion: 4\n---\n";
  assert.equal(parseRun(base).position, null);
  assert.throws(() => parseRun(base.replace("claude", "bard")));
  assert.throws(() => parseRun("sin frontmatter"), /frontmatter/);
});

test("índice y censo de dominios", () => {
  const runs = [
    { assistant: "chatgpt", appears: true, position: 1, searched: true, citedUrls: ["https://www.a.example/x", "https://a.example/y"] },
    { assistant: "chatgpt", appears: false, position: null, searched: false, citedUrls: ["https://b.example/"] },
    { assistant: "gemini", appears: true, position: 2, searched: true, citedUrls: ["notaurl"] },
  ] as const;
  const idx = citationIndex(runs);
  assert.deepEqual(idx.find((i) => i.assistant === "chatgpt"), { assistant: "chatgpt", k: 1, n: 2, firstPlace: 1, searched: 1 });
  assert.deepEqual(citedDomains(runs), [{ domain: "a.example", count: 1 }, { domain: "b.example", count: 1 }]);
});

test("batería: ids consecutivos, servicios, ciudad y marca", async () => {
  const { buildBattery } = await import("./battery");
  const b = buildBattery({ name: "Lumen", city: "Monterrey" }, ["pastelería", "pasteles de boda"], ["Dulce Co"]);
  assert.deepEqual(b.map((q) => q.id), ["Q-01", "Q-02", "Q-03", "Q-04", "Q-05", "Q-06", "Q-07"]);
  assert.equal(b[0].text, "¿A quién me recomiendas para pastelería en Monterrey?");
  assert.ok(b.some((q) => q.type === "comparativa" && q.text.includes("Dulce Co")));
});
