import { formatNumber } from "@/lib/format";
import { ScoreHistory } from "./ScoreHistory";
import { ChangeForm } from "./ChangeForm";
import { PasteChanges } from "./PasteChanges";
import { BackfillButton } from "./BackfillButton";
import { listChanges, scoreHistory } from "@/lib/changes/store";
import { changeImpact, IMPACT_WINDOW_DAYS } from "@/lib/changes/impact";
import { DIMENSIONS } from "@/lib/scorecard/config";
import { todayIso } from "@/lib/dates";
import { deleteChangeAction } from "@/app/calificacion/actions";

/**
 * La calificación en el tiempo con la bitácora de cambios encima. Se muestra aunque
 * todavía no haya datos: los cambios se pueden registrar desde el primer día.
 */
export async function ChangeLogSection() {
  const [history, changeRows] = await Promise.all([
    scoreHistory().catch((e) => { console.error("[calificacion] historial", e); return []; }),
    listChanges().catch((e) => { console.error("[calificacion] cambios", e); return []; }),
  ]);
  const today = todayIso();
  // Numeradas de la más vieja a la más nueva: el #n es el mismo en la gráfica y en la lista.
  const numbered = [...changeRows].reverse().map((c, i) => ({ ...c, n: i + 1 }));
  const points = history.map((h) => ({ date: h.date, value: h.overall }));
  const dimLabels = DIMENSIONS.map((d) => ({ id: d.id, label: d.label }));
  return (
    <section aria-labelledby="historia-h" className="space-y-4">
      <div className="space-y-1 px-1">
        <h2 id="historia-h" className="font-display text-2xl md:text-3xl">Cómo va en el tiempo</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Cada línea vertical es un cambio registrado. La calificación usa ventanas de {IMPACT_WINDOW_DAYS} días, así que un cambio tarda hasta {IMPACT_WINDOW_DAYS} días en verse completo.
          Que suba después de un cambio es coincidencia en el tiempo, no prueba: Google y las plataformas también cambian cómo miden.
        </p>
        <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          ¿Faltan días en la gráfica? <BackfillButton /> Se recalcula con los datos guardados; algunas fuentes (PageSpeed, Instagram) solo tienen la foto más reciente.
        </p>
      </div>
      <ScoreHistory points={history} changes={numbered.map((c) => ({ id: c.id, n: c.n, date: c.date, kind: c.kind, title: c.title, area: c.area }))} dimensions={dimLabels} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl bg-card p-5">
          <h3 className="font-medium">Registrar cambios</h3>
          <PasteChanges />
          <details className="border-t border-border pt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">O escribir uno a mano</summary>
            <div className="pt-3"><ChangeForm today={today} areas={dimLabels} /></div>
          </details>
        </div>
        <div className="space-y-3 rounded-2xl bg-card p-5">
          <h3 className="font-medium">Bitácora de cambios</h3>
          {numbered.length === 0 ? <p className="text-sm text-muted-foreground">Sin cambios registrados. Pega lo que te devolvió tu IA, escríbelo a mano o pídeselo al chat: «registra que hoy publicamos…».</p> : (
            <ol className="divide-y divide-border">
              {[...numbered].reverse().map((c) => {
                const impact = changeImpact(c, points, numbered, today);
                return (
                  <li key={c.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 space-y-0.5">
                      <p><span className="font-mono text-[11px] text-muted-foreground">#{c.n} · {c.date} · {c.kind === "propio" ? "propio" : "externo"}</span></p>
                      <p className="font-medium">{c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{c.title}</a> : c.title}</p>
                      {c.detail && <p className="text-muted-foreground">{c.detail}</p>}
                      <p className="text-xs text-muted-foreground">
                        {impact.status === "pending" && `Faltan ${impact.daysLeft} días para juzgarlo.`}
                        {impact.status === "no_data" && "Sin calificación guardada alrededor de esas fechas."}
                        {impact.status === "measured" && (
                          <>General {formatNumber(impact.before, 1)} → {formatNumber(impact.after, 1)} en {IMPACT_WINDOW_DAYS} días (<span className={impact.delta >= 0 ? "text-good-ink" : "text-bad-ink"}>{impact.delta >= 0 ? "+" : ""}{formatNumber(impact.delta, 1)}</span>)
                            {impact.overlapping.length > 0 && `; en esas fechas también: ${impact.overlapping.map((o) => `#${numbered.find((x) => x.id === o.id)?.n}`).join(", ")}`}.</>
                        )}
                      </p>
                    </div>
                    <form action={deleteChangeAction}><input type="hidden" name="id" value={c.id} /><button type="submit" className="text-xs text-muted-foreground hover:text-bad-ink">Borrar</button></form>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
