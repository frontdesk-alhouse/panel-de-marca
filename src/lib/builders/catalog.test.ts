import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILDERS, builderFor, connectInstructions } from "./catalog";
import { buildHandoff, type HandoffInput } from "../handoff/build";

test("cada constructor trae guía oficial https y, si es remoto, una dirección https", () => {
  for (const b of BUILDERS) {
    assert.match(b.docs, /^https:\/\//, b.id);
    if (b.mcpUrl) assert.match(b.mcpUrl, /^https:\/\/[^\s]+$/, b.id);
    assert.ok(b.claudeCode.length > 0 && b.claudeApp.length > 0, b.id);
  }
});

test("builderFor reconoce lo que detecta el chequeo del sitio y nada más", () => {
  for (const p of ["webflow", "framer", "wordpress", "shopify", "wix", "squarespace"]) assert.equal(builderFor(p)?.id, p);
  assert.equal(builderFor(null), null);
  assert.equal(builderFor("geocities"), null);
});

test("las instrucciones dependen de la IA: comandos en Claude Code, conector en la app", () => {
  const framer = builderFor("framer")!;
  assert.ok(connectInstructions(framer, "code").some((l) => l.includes("claude mcp add")));
  assert.ok(connectInstructions(framer, "app").some((l) => l.includes("claude.ai/directory/framer")));
  assert.ok(connectInstructions(builderFor("squarespace")!, "app")[0].includes("no edita páginas"));
});

test("el texto para la IA incluye cómo conectarse al sitio solo si se conoce el constructor", () => {
  const base: HandoffInput = { origin: "Prueba", brand: { name: "Marca", domain: "ejemplo.com" }, asOf: "2026-10-29", items: [{ id: "a", title: "Hacer algo" }], skills: [], panelUrl: "http://localhost" };
  assert.doesNotMatch(buildHandoff(base, "code"), /conéctate al sitio/);
  const withBuilder = buildHandoff({ ...base, builder: builderFor("webflow")! }, "code");
  assert.match(withBuilder, /Antes de empezar: conéctate al sitio/);
  assert.match(withBuilder, /mcp\.webflow\.com/);
});
