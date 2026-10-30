import { desc, eq } from "drizzle-orm";
import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react";
import { getDb } from "@/db";
import { syncRuns } from "@/db/schema";
import { SOURCES } from "@/sources/registry";
import { isLocalMode } from "@/lib/mode";

/** Hace cuánto, en palabras: «hace 3 h», «hace 2 días». */
function ago(date: Date | null, now: number): string {
  if (!date) return "Nunca";
  const min = Math.round((now - date.getTime()) / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

/**
 * Qué está conectado y qué no, y cuándo se actualizó cada fuente. Sirve en local y en la nube
 * (en la nube las llaves no se editan aquí: viven en las variables de entorno del despliegue).
 */
export async function SourcesStatus() {
  const db = await getDb();
  const [last, oks] = await Promise.all([
    db.selectDistinctOn([syncRuns.source], { source: syncRuns.source, status: syncRuns.status, startedAt: syncRuns.startedAt })
      .from(syncRuns).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
    db.selectDistinctOn([syncRuns.source], { source: syncRuns.source, finishedAt: syncRuns.finishedAt })
      .from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(syncRuns.source, desc(syncRuns.startedAt)),
  ]);
  const lastBy = new Map(last.map((r) => [r.source, r]));
  const okBy = new Map(oks.map((r) => [r.source, r.finishedAt]));
  const now = Date.now();
  const rows = Object.values(SOURCES)
    .filter((s) => s.id !== "mock")
    .map((s) => {
      const configured = s.isConfigured();
      const lastRun = lastBy.get(s.id);
      const failed = configured && lastRun?.status === "error";
      return { id: s.id, label: s.label, configured, failed, lastOk: okBy.get(s.id) ?? null };
    })
    .sort((a, b) => Number(b.configured) - Number(a.configured));
  const on = rows.filter((r) => r.configured).length;

  return (
    <section aria-labelledby="status-h" className="space-y-4 rounded-2xl bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="status-h" className="font-medium">Qué está conectado</h2>
        <p className="font-mono text-[11px] uppercase text-muted-foreground">{on} de {rows.length} fuentes</p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
            {r.failed ? <AlertTriangle className="h-4 w-4 shrink-0 text-warn" aria-hidden />
              : r.configured ? <CheckCircle2 className="h-4 w-4 shrink-0 text-good" aria-hidden />
              : <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {!r.configured ? "Sin conectar" : r.failed ? `Falló el último intento · bien ${ago(r.lastOk, now)}` : `Actualizada ${ago(r.lastOk, now)}`}
            </span>
          </li>
        ))}
      </ul>
      {!isLocalMode() && (
        <p className="text-xs text-muted-foreground">
          Esta instalación está en la nube: las llaves se agregan o cambian en las variables de entorno del despliegue (en Vercel: Settings → Environment Variables) y se vuelve a desplegar.
        </p>
      )}
    </section>
  );
}
