import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { zipSync, type Zippable } from "fflate";
import type { SkillId } from "./catalog";

/** Carpeta con las copias de los skills (se sincroniza desde la fuente con `npm run skills:sync`). */
export const SKILLS_DIR = path.join(process.cwd(), "skills");

/** Lo que nunca va dentro del zip. */
const SKIP = new Set([".git", "__pycache__", ".DS_Store", "node_modules"]);

function collect(dir: string, prefix: string, out: Zippable): void {
  for (const name of readdirSync(dir)) {
    // Ocultos (.env, llaves) y enlaces simbólicos nunca salen: la descarga es pública.
    if (SKIP.has(name) || name.endsWith(".pyc") || (name.startsWith(".") && name !== ".gitignore")) continue;
    const full = path.join(dir, name);
    const rel = `${prefix}/${name}`;
    const st = lstatSync(full);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) collect(full, rel, out);
    else if (st.isFile()) out[rel] = readFileSync(full);
  }
}

/**
 * Zip con la carpeta del skill en la raíz (`<id>/SKILL.md`): así se descomprime directo
 * en ~/.claude/skills y claude.ai lo acepta tal cual al subirlo.
 */
const cache = new Map<string, Uint8Array>();

/** Igual que zipSkill, pero una sola vez por proceso (los skills no cambian sin un nuevo despliegue). */
export function cachedZip(id: SkillId): Uint8Array {
  const hit = cache.get(id);
  if (hit) return hit;
  const z = zipSkill(id);
  cache.set(id, z);
  return z;
}

export function zipSkill(id: SkillId, root = SKILLS_DIR): Uint8Array {
  const dir = path.join(root, id);
  const files: Zippable = {};
  collect(dir, id, files);
  if (!files[`${id}/SKILL.md`]) throw new Error(`El skill ${id} no tiene SKILL.md`);
  return zipSync(files, { level: 6 });
}
