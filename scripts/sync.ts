/**
 * Sincroniza una fuente desde la terminal (desarrollo y backfill).
 *   npm run sync -- mock --from 2026-07-25 --to 2026-10-22
 *   npm run sync -- mock --clear        (borra los datos de prueba)
 *   npm run sync -- score               (guarda la calificación de ayer)
 */
import { loadWorkspace } from "../src/lib/workspace/load";
import { addDays } from "../src/lib/dates";
import { defaultRange, runSync } from "../src/lib/sync";
import { deleteMockData } from "../src/lib/metrics-store";
import { snapshotScorecard } from "../src/lib/scorecard/load";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  if (!(await loadWorkspace())) throw new Error("Falta la configuración de la marca: corre primero scripts/import-workspace.ts");
  const source = process.argv[2];
  if (!source) throw new Error("Uso: npm run sync -- <fuente|score> [--from AAAA-MM-DD] [--to AAAA-MM-DD] [--clear]");

  if (source === "score") {
    const { scorecard, endDate } = await snapshotScorecard(arg("to"));
    console.log(`Calificación ${endDate}: ${scorecard.overall?.toFixed(1) ?? "-"} · cobertura ${(scorecard.coverage * 100).toFixed(0)} %`);
    return;
  }
  if (process.argv.includes("--clear")) {
    if (source !== "mock") throw new Error("--clear solo aplica a la fuente mock");
    await deleteMockData();
    console.log("Datos de prueba borrados");
    return;
  }

  const fallback = defaultRange();
  const to = arg("to") ?? fallback.to;
  const from = arg("from") ?? (arg("days") ? addDays(to, -(Number(arg("days")) - 1)) : fallback.from);
  const result = await runSync(source, { from, to }, "script");
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  // La conexión embebida (PGlite) mantiene vivo el proceso: salir explícitamente.
  .finally(() => process.exit());
