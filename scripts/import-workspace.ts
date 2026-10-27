/**
 * Carga la configuración de la marca y la competencia en la base.
 *   npx tsx --env-file=.env.local scripts/import-workspace.ts private/workspace.json
 * El archivo tiene la forma { workspace, competitors } (ver src/lib/workspace/schema.ts).
 * Valida todo antes de escribir; si algo no cumple, no toca la base.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { saveWorkspace } from "../src/lib/workspace/load";
import { CompetitorSchema, WorkspaceSchema } from "../src/lib/workspace/schema";
import { competitors, ws } from "../src/lib/workspace/store";

const FileSchema = z.object({ workspace: WorkspaceSchema, competitors: z.array(CompetitorSchema) });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Uso: scripts/import-workspace.ts <archivo.json>");
  const parsed = FileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`El archivo no es válido: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  await saveWorkspace(parsed.data.workspace, parsed.data.competitors, { completeSetup: true });
  console.log(`Configuración de «${ws().brand.name}» guardada · ${competitors().length - 1} competidores activos`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
