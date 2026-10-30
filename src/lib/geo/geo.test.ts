import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowed, parseRobots, rulesFor } from "./robots";
import { detectChallenge, detectPlatform, jsonldTypes, normalizeText } from "./html";
import { wilson } from "./wilson";

const ROBOTS = `User-agent: *
Disallow: /admin
Allow: /admin/public

User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: OAI-SearchBot
Disallow:
`;

test("robots: grupos unidos, el patrón más largo gana y Disallow vacío no bloquea", () => {
  const g = parseRobots(ROBOTS);
  assert.equal(isAllowed(rulesFor(g, "GPTBot").rules, "/").allowed, false);
  assert.equal(isAllowed(rulesFor(g, "CCBot").rules, "/x").allowed, false);
  assert.equal(isAllowed(rulesFor(g, "OAI-SearchBot").rules, "/").allowed, true);
  assert.equal(rulesFor(g, "ClaudeBot").group, "*");
  assert.equal(isAllowed(rulesFor(g, "ClaudeBot").rules, "/admin/x").allowed, false);
  assert.equal(isAllowed(rulesFor(g, "ClaudeBot").rules, "/admin/public/x").allowed, true);
});

test("robots: comodín y ancla $", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /*.pdf$").flatMap((x) => x.rules);
  assert.equal(isAllowed(rules, "/a/b.pdf").allowed, false);
  assert.equal(isAllowed(rules, "/a/b.pdf?x=1").allowed, true);
});

test("JSON-LD: tipos anidados y bloques rotos", () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["LocalBusiness","Bakery"]}]}</script>
  <script type='application/ld+json'>{roto</script>`;
  assert.deepEqual(jsonldTypes(html), { types: ["Bakery", "LocalBusiness", "Organization"], broken: 1 });
});

test("texto: sin scripts ni acentos; challenge y plataforma", () => {
  assert.equal(normalizeText("<p>Pastelería&nbsp;<b>Lumen</b></p><script>var x='oculto'</script>"), "pasteleria lumen");
  assert.equal(detectChallenge("<title>Just a moment...</title>"), true);
  assert.equal(detectChallenge("<p>hola</p>", { "cf-mitigated": "challenge" }), true);
  assert.equal(detectPlatform('<html data-wf-site="abc">'), "webflow");
  assert.equal(detectPlatform('<img src="https://framerusercontent.com/x.png">'), "framer");
});

test("Wilson coincide con el script de Python del skill", () => {
  const a = wilson(3, 9);
  assert.ok(Math.abs(a.low - 0.12058159868274293) < 1e-12 && Math.abs(a.high - 0.6458026525009102) < 1e-12);
  assert.ok(Math.abs(wilson(0, 6).high - 0.3903430336530645) < 1e-12);
  assert.deepEqual(wilson(0, 0), { low: 0, high: 0 });
});

test("servicio visible por sus palabras, no por la frase exacta", async () => {
  const { serviceVisible } = await import("./check");
  const text = normalizeText("<h2>Branding, identidad visual y estrategia</h2><p>Diseñamos tu sitio web</p>");
  assert.equal(serviceVisible("Branding e identidad", text), true);
  assert.equal(serviceVisible("Sitio web", text), true);
  assert.equal(serviceVisible("Fotografía de producto", text), false);
});

test("solo hosts públicos", async () => {
  const { isPublicHost } = await import("./check");
  assert.equal(isPublicHost("altohouse.mx"), true);
  for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "[::1]", "intranet", "db.internal", "printer.local"]) assert.equal(isPublicHost(h), false, h);
});
