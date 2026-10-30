import { test } from "node:test";
import assert from "node:assert/strict";
import { installCommand, isSkillId, skillsForMetric, SKILLS } from "./catalog";

test("cada métrica de visibilidad apunta a seo-geo", () => {
  assert.deepEqual(skillsForMetric({ id: "brand_ctr", dimension: "visibilidad" }), ["seo-geo"]);
});

test("una métrica extra cruza de dimensión sin duplicar", () => {
  assert.deepEqual(skillsForMetric({ id: "lighthouse_seo", dimension: "experiencia" }), ["seo-geo"]);
  assert.deepEqual(skillsForMetric({ id: "paid_conversion", dimension: "conversion" }), ["anuncios-eficiencia"]);
});

test("ids fuera del catálogo se rechazan (sin rutas libres)", () => {
  assert.equal(isSkillId("seo-geo"), true);
  assert.equal(isSkillId("../.env"), false);
  assert.equal(isSkillId("seo-geo/../../"), false);
});

test("con repo propio se clona; sin repo, se baja el zip del panel", () => {
  const withRepo = SKILLS.find((s) => s.repoUrl)!;
  assert.match(installCommand(withRepo, "x"), /^git clone https:\/\/github\.com\//);
  const noRepo = SKILLS.find((s) => !s.repoUrl)!;
  assert.match(installCommand(noRepo, "https://panel/api/skills/x/zip"), /curl -fsSL "https:\/\/panel\/api\/skills\/x\/zip"/);
});
