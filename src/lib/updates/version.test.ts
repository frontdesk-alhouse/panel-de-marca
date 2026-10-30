import { test } from "node:test";
import assert from "node:assert/strict";
import { isNewer, isPublicRepoRemote, parseVersion } from "./version";
import { FRAME_PRESETS, framePreset, frameBootScript, isValidLogo } from "../appearance/presets";

test("parseVersion lee x.y.z con o sin v y rechaza lo demás", () => {
  assert.deepEqual(parseVersion("1.2.3"), [1, 2, 3]);
  assert.deepEqual(parseVersion("v0.10.0"), [0, 10, 0]);
  assert.equal(parseVersion("1.2"), null);
  assert.equal(parseVersion("1.2.3-beta"), null);
  assert.equal(parseVersion(undefined), null);
});

test("isNewer compara número por número, no como texto", () => {
  assert.equal(isNewer("0.10.0", "0.9.9"), true);
  assert.equal(isNewer("0.2.0", "0.2.0"), false);
  assert.equal(isNewer("0.1.9", "0.2.0"), false);
  assert.equal(isNewer("1.0.0", "0.99.99"), true);
  assert.equal(isNewer("basura", "0.1.0"), false);
});

test("isPublicRepoRemote reconoce https y ssh del repo público, nada más", () => {
  const repo = "https://github.com/frontdesk-alhouse/panel-de-marca";
  assert.equal(isPublicRepoRemote("https://github.com/frontdesk-alhouse/panel-de-marca.git\n", repo), true);
  assert.equal(isPublicRepoRemote("git@github.com:frontdesk-alhouse/panel-de-marca.git", repo), true);
  assert.equal(isPublicRepoRemote("https://github.com/frontdesk-alhouse/alto-house-dashboard.git", repo), false);
  assert.equal(isPublicRepoRemote("https://github.com/otro/panel-de-marca", repo), false);
});

test("framePreset cae en el de fábrica con ids desconocidos", () => {
  assert.equal(framePreset("oceano").id, "oceano");
  assert.equal(framePreset("<script>").id, FRAME_PRESETS[0].id);
  assert.equal(framePreset(null).id, FRAME_PRESETS[0].id);
});

test("isValidLogo solo acepta data URL raster y de tamaño acotado", () => {
  assert.equal(isValidLogo("data:image/png;base64,iVBORw0KGgo="), true);
  assert.equal(isValidLogo("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(isValidLogo("javascript:alert(1)"), false);
  assert.equal(isValidLogo(`data:image/png;base64,${"A".repeat(500_000)}`), false);
});

test("frameBootScript es una expresión válida que no lee nada fuera de su llave", () => {
  const src = frameBootScript("ah-panel-frame");
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /"ah-panel-frame"/);
});
