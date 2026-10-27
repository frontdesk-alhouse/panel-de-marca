/**
 * Prueba una fuente contra su API real sin escribir en la base.
 *   npm run smoke -- ga4 [--days 3]
 * Muestra cuántas filas trae por métrica y el total de los últimos días.
 */
import { loadWorkspace } from "../src/lib/workspace/load";
import { addDays, todayIso } from "../src/lib/dates";
import { getSource } from "../src/sources/registry";

async function main() {
  if (!(await loadWorkspace())) throw new Error("Falta la configuración de la marca: corre primero scripts/import-workspace.ts");
  const id = process.argv[2];
  const source = id ? getSource(id) : undefined;
  if (!source) throw new Error("Uso: npm run smoke -- <ga4|gsc|psi> [--days N]");
  if (!source.isConfigured()) throw new Error(`${source.label}: faltan variables de entorno`);
  const i = process.argv.indexOf("--days");
  const days = i > -1 ? Number(process.argv[i + 1]) : 3;
  const to = addDays(todayIso(), -1);
  const range = { from: addDays(to, -(days - 1)), to };

  const started = Date.now();
  const rows = await source.fetchDaily(range);
  console.log(`${source.label} ${range.from} a ${range.to}: ${rows.length} filas en ${((Date.now() - started) / 1000).toFixed(1)} s`);
  const summary = new Map<string, { rows: number; total: number }>();
  for (const r of rows) {
    const key = `${r.metric}${r.dimKey ? "" : " (total)"}`;
    const s = summary.get(key) ?? { rows: 0, total: 0 };
    s.rows++;
    if (!r.dimKey) s.total += r.value;
    summary.set(key, s);
  }
  for (const [k, s] of [...summary].sort()) console.log(`  ${k.padEnd(30)} filas ${String(s.rows).padStart(5)}${k.endsWith("(total)") ? `  suma ${+s.total.toFixed(2)}` : ""}`);
  const dims = [...new Set(rows.map((r) => r.dimKey).filter(Boolean))].slice(0, 8);
  if (dims.length) console.log("  ejemplos de dimensión:", dims.join(" | "));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
