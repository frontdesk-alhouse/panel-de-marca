import { Check, Minus, X } from "lucide-react";
import { getMessages } from "@/i18n/server";
import { LoadError, pageGate } from "@/lib/page-gate";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import { CopyButton } from "@/components/handoff/CopyButton";
import { AddRun, ImportRuns } from "@/components/geo/RunForms";
import { handoffFromInsights } from "@/lib/handoff/from-panel";
import { loadGeoOverview } from "@/lib/geo/store";
import { buildBattery } from "@/lib/geo/battery";
import { wilson } from "@/lib/geo/wilson";
import { AI_ASSISTANT_LABELS } from "@/lib/geo/labels";
import { competitors, ws } from "@/lib/workspace/store";
import { todayIso } from "@/lib/dates";
import type { Insight } from "@/lib/analytics/insights";
import type { GeoCheck } from "@/lib/geo/check";
import { deleteRunAction } from "./actions";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)} %`;
const SEV_LABEL: Record<GeoCheck["severity"], string> = { error: "Bloqueante", warn: "Importante", info: "Opcional" };

function checkInsights(checks: readonly GeoCheck[]): Insight[] {
  return checks.filter((c) => c.severity !== "info").map((c) => ({
    tone: c.ok ? "good" as const : c.severity === "error" ? "bad" as const : "watch" as const,
    weight: c.severity === "error" ? 3 as const : 2 as const,
    title: c.ok ? c.title : `${c.title}: no`,
    detail: c.ok ? c.detail : `${c.detail} Qué hacer: ${c.fix}`,
  }));
}

/** Visibilidad en IA: ¿los asistentes pueden leer el sitio y te mencionan cuando alguien pregunta? */
export default async function GeoPage() {
  const msg = await getMessages();
  const TITLE = msg.pages["/seo/ia"].title;
  const gate = await pageGate(TITLE);
  if (gate) return gate;
  let d;
  try { d = await loadGeoOverview(); } catch (e) { console.error("[geo]", e); return <LoadError title={TITLE} />; }

  const w = ws();
  const battery = buildBattery({ name: w.brand.name, city: w.brand.city }, w.services, competitors().filter((c) => !c.self).map((c) => c.name));
  const report = d.latest?.report;
  const counted = report?.checks.filter((c) => c.severity !== "info") ?? [];
  const okCount = counted.filter((c) => c.ok).length;
  const all = d.index.find((i) => i.assistant === "all");
  const insights: Insight[] = [
    ...(report ? checkInsights(report.checks) : []),
    ...(all ? [{
      tone: all.k / all.n >= 0.5 ? "good" as const : all.k / all.n >= 0.2 ? "watch" as const : "bad" as const, weight: 3 as const,
      title: `Los asistentes te mencionan en ${all.k} de ${all.n} corridas (${pct(all.k / all.n)})`,
      detail: `Quién se lleva las citas: ${d.domains.slice(0, 5).map((x) => x.domain).join(", ") || "sin URLs registradas"}.`,
    }] : [{ tone: "watch" as const, weight: 2 as const, title: "Todavía no hay corridas de citación", detail: "Corre la batería de consultas en ChatGPT, Gemini y Claude (3 veces cada una) y regístralas aquí." }]),
    ...d.wrongFacts.map((f) => ({ tone: "bad" as const, weight: 3 as const, title: `${AI_ASSISTANT_LABELS[f.assistant] ?? f.assistant} dijo algo falso de la marca`, detail: f.fact })),
  ];
  const handoff = await handoffFromInsights("Visibilidad en IA", d.latest?.date ?? todayIso(), insights, ["seo-geo"]);
  const batteryText = battery.map((q) => `${q.id}\t${q.text}`).join("\n");

  return (
    <div className="space-y-12">
      <SectionHeader title={TITLE} question={msg.pages["/seo/ia"].question} path="/seo/ia" />
      <CopyForClaude payload={handoff} className="max-w-xl" />

      <section aria-labelledby="tecnico-h" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="tecnico-h" className="font-display text-2xl md:text-3xl">¿Te pueden leer?</h2>
            <p className="max-w-[65ch] text-sm text-muted-foreground">Lo que ve un bot de IA en tu Home, sin ejecutar JavaScript. Se revisa cada día; «Sincronizar ahora» lo repite al momento.</p>
          </div>
          {report && (
            <p className="font-mono text-[11px] uppercase text-muted-foreground">
              {okCount} de {counted.length} bien · {d.latest!.date}{report.platform ? ` · ${report.platform}` : ""}
            </p>
          )}
        </div>
        {!report ? <p className="rounded-2xl bg-card p-5 text-sm">Todavía no hay chequeo. Toca «Sincronizar ahora» arriba para correrlo.</p> : (
          <ul className="divide-y divide-border rounded-2xl bg-card px-5">
            {report.checks.map((c) => (
              <li key={c.id} className="grid gap-x-6 gap-y-1 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${c.ok ? "bg-good/15 text-good-ink" : c.severity === "info" ? "bg-background text-muted-foreground" : c.severity === "error" ? "bg-bad/15 text-bad-ink" : "bg-warn/15 text-warn"}`}>
                    {c.ok ? <Check className="h-3 w-3" aria-label="Bien" /> : c.severity === "info" ? <Minus className="h-3 w-3" aria-label="Opcional" /> : <X className="h-3 w-3" aria-label="Falla" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{c.title}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{SEV_LABEL[c.severity]}</span>
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">{c.detail}</p>
                  {!c.ok && c.severity !== "info" && <p className="mt-1"><span className="font-medium">Qué hacer: </span>{c.fix}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="citas-h" className="space-y-4">
        <div className="space-y-1">
          <h2 id="citas-h" className="font-display text-2xl md:text-3xl">¿Te mencionan?</h2>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            Corridas de los últimos 90 días. Las respuestas de los asistentes cambian de una vez a otra: por eso se corre cada consulta 3 veces y el número va con su rango probable (intervalo de 95 %). Con menos de 9 corridas no cuenta en la calificación.
          </p>
        </div>
        {d.index.length === 0 ? <p className="rounded-2xl bg-card p-5 text-sm">Sin corridas todavía. Usa la batería de abajo.</p> : (
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead className="text-left font-mono text-[10px] uppercase text-muted-foreground">
                <tr><th className="px-5 py-3">Asistente</th><th className="px-3 py-3 text-right">Te menciona</th><th className="px-3 py-3 text-right">Rango probable</th><th className="px-3 py-3 text-right">Primer lugar</th><th className="px-5 py-3 text-right">Buscó en la web</th></tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {d.index.map((i) => {
                  const ci = wilson(i.k, i.n);
                  return (
                    <tr key={i.assistant} className={i.assistant === "all" ? "font-medium" : ""}>
                      <td className="px-5 py-3">{i.assistant === "all" ? "Todos" : AI_ASSISTANT_LABELS[i.assistant] ?? i.assistant}</td>
                      <td className="px-3 py-3 text-right">{i.k}/{i.n} · {pct(i.k / i.n)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{pct(ci.low)}–{pct(ci.high)}</td>
                      <td className="px-3 py-3 text-right">{i.firstPlace}</td>
                      <td className="px-5 py-3 text-right">{pct(i.searched / i.n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {d.domains.length > 0 && (
          <div className="rounded-2xl bg-card p-5">
            <h3 className="font-mono text-[11px] uppercase text-muted-foreground">Fuentes que más citan</h3>
            <ol className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {d.domains.map((x) => <li key={x.domain} className="flex justify-between gap-3"><span className="truncate">{x.domain}</span><span className="tabular-nums text-muted-foreground">{x.count}</span></li>)}
            </ol>
          </div>
        )}
      </section>

      <section aria-labelledby="medir-h" className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-card p-5">
          <h2 id="medir-h" className="font-display text-2xl">Batería de consultas</h2>
          <p className="text-sm text-muted-foreground">Córrela en ChatGPT, Gemini y Claude en una ventana privada o sin memoria, 3 veces cada consulta. El skill seo-geo trae la batería completa por tipo de negocio y la plantilla de corrida.</p>
          <ol className="space-y-1.5 text-sm">{battery.map((q) => <li key={q.id}><span className="font-mono text-[11px] text-muted-foreground">{q.id}</span> {q.text}</li>)}</ol>
          <CopyButton text={batteryText} label="Copiar batería" copiedLabel="Copiada" failedLabel="No se pudo copiar" />
        </div>
        <div className="space-y-8 rounded-2xl bg-card p-5">
          <div className="space-y-3"><h3 className="font-medium">Registrar una corrida</h3><AddRun queries={battery} today={todayIso()} /></div>
          <div className="space-y-3 border-t border-border pt-6"><h3 className="font-medium">Importar corridas del skill</h3><ImportRuns /></div>
        </div>
      </section>

      {d.runs.length > 0 && (
        <section aria-labelledby="corridas-h" className="space-y-3">
          <h2 id="corridas-h" className="font-display text-2xl">Corridas registradas</h2>
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead className="text-left font-mono text-[10px] uppercase text-muted-foreground">
                <tr><th className="px-5 py-3">Fecha</th><th className="px-3 py-3">Asistente</th><th className="px-3 py-3">Consulta</th><th className="px-3 py-3 text-right">Corrida</th><th className="px-3 py-3">Resultado</th><th className="px-5 py-3"><span className="sr-only">Borrar</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.runs.slice(0, 120).map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 tabular-nums">{r.date}</td>
                    <td className="px-3 py-2.5">{AI_ASSISTANT_LABELS[r.assistant] ?? r.assistant}</td>
                    <td className="max-w-[40ch] truncate px-3 py-2.5" title={r.query}><span className="font-mono text-[11px] text-muted-foreground">{r.queryId}</span> {r.query}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.run}</td>
                    <td className="px-3 py-2.5">{r.appears ? `Sí${r.position ? ` · lugar ${r.position}` : ""}` : "No"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <form action={deleteRunAction}><input type="hidden" name="id" value={r.id} /><button type="submit" className="text-xs text-muted-foreground hover:text-bad-ink">Borrar</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
