import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { zipSkill } from "./zip";

test("el zip trae la carpeta del skill en la raíz y deja fuera la basura", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skills-"));
  const dir = path.join(root, "seo-geo");
  mkdirSync(path.join(dir, "scripts", "__pycache__"), { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), "---\nname: seo-geo\ndescription: x\n---\n");
  writeFileSync(path.join(dir, "scripts", "a.py"), "print(1)");
  writeFileSync(path.join(dir, "scripts", "__pycache__", "a.cpython.pyc"), "x");
  writeFileSync(path.join(dir, ".DS_Store"), "x");
  const files = Object.keys(unzipSync(zipSkill("seo-geo", root))).sort();
  assert.deepEqual(files, ["seo-geo/SKILL.md", "seo-geo/scripts/a.py"]);
});

test("sin SKILL.md no se arma el zip", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skills-"));
  mkdirSync(path.join(root, "seo-geo"));
  assert.throws(() => zipSkill("seo-geo", root), /SKILL\.md/);
});
