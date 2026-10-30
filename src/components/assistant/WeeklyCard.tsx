"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2 } from "lucide-react";
import type { StoredWeekly as Weekly } from "@/lib/assistant/weekly";
import type { WeeklyMetrics } from "@/lib/analytics/sections/weekly-metrics";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/dash/Segmented";
import { TrendChart } from "@/components/dash/TrendChart";
import { cn } from "@/lib/utils";
import { Delta, fmt, MetricTile } from "./WeeklyMetrics";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import { ActionCopy } from "@/components/handoff/ActionCopy";
import type { HandoffPayload } from "@/lib/handoff/from-panel";

interface Props {
  analysis: { periodo: string; creado: Date; analisis: Weekly } | null;
  metrics: WeeklyMetrics | null;
  handoff?: HandoffPayload | null;
  /** Un texto para la IA por acción, en el mismo orden que `acciones`. */
  actionHandoffs?: HandoffPayload[];
  defaultOpen?: boolean;
}
type Tab = "cambios" | "estado" | "aprendizajes" | "esperar";
type Action = Weekly["acciones"][number];

const IMPACT: Record<string, { dot: string; label: string }> = {
  alto: { dot: "bg-bad", label: "Impacto alto" }, medio: { dot: "bg-warn", label: "Impacto medio" }, bajo: { dot: "bg-muted-foreground/50", label: "Impacto bajo" },
};
/** Frente de trabajo en palabras de quien usa el panel. */
const FRENTE: Record<Action["frente"], string> = {
  seo: "SEO · Google", geo: "GEO · asistentes de IA", anuncios: "Anuncios", conversion: "Conversión", medicion: "Medición",
  sitio: "Sitio", contenido: "Contenido", redes: "Redes", crm: "CRM", competencia: "Competencia", otro: "",
};
const CARD_METRICS = ["sessions", "key_events", "cpl"];

const frenteLabel = (a: Action) => FRENTE[a.frente] || a.seccion;
/** Lo que vamos a trabajar: el foco si existe; en análisis viejos, los frentes de las acciones. */
const focusOf = (a: Weekly) => a.foco || `Trabajar en ${[...new Set(a.acciones.map(frenteLabel))].slice(0, 3).join(", ").toLowerCase()}.`;

function Bullets({ items, empty = "Nada que reportar." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="divide-y divide-border">{items.map((x) => <li key={x} className="py-2.5 text-sm max-w-[70ch]">{x}</li>)}</ul>;
}

/** Una acción del plan: frente, qué hacer, lo que vimos, pasos, cómo sabremos que funcionó y el botón para la IA. */
function ActionCard({ x, n, handoff }: { x: Action; n: number; handoff?: HandoffPayload }) {
  const skill = handoff?.input.skills[0]?.name;
  return (
    <li className="space-y-3 rounded-xl bg-background p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xl leading-none">{n}</span>
        {frenteLabel(x) && <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium">{frenteLabel(x)}</span>}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", IMPACT[x.impacto].dot)} aria-hidden />{IMPACT[x.impacto].label}</span>
      </div>
      <p className="text-lg font-medium leading-snug">{x.accion}</p>
      {x.hallazgo && <p className="text-sm"><span className="text-muted-foreground">Lo que vimos: </span>{x.hallazgo}</p>}
      {x.pasos.length > 0 && (
        <ol className="space-y-1.5">
          {x.pasos.map((p, i) => (
            <li key={p} className="flex gap-2.5 text-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-card font-mono text-[10px]">{i + 1}</span><span>{p}</span></li>
          ))}
        </ol>
      )}
      {x.exito && <p className="text-sm"><span className="text-muted-foreground">Sabremos que funcionó si: </span>{x.exito}</p>}
      {!x.hallazgo && <p className="text-sm text-muted-foreground">{x.porQue}</p>}
      {handoff && <div className="pt-1"><ActionCopy payload={handoff} skillName={skill} /></div>}
    </li>
  );
}

/** Contenido del pop-up: primero el plan (qué vamos a hacer), luego los números y el diagnóstico. */
function WeeklyDetail({ a, metrics, actionHandoffs, handoff }: { a: Weekly; metrics: WeeklyMetrics | null; actionHandoffs?: HandoffPayload[]; handoff?: HandoffPayload | null }) {
  const [tab, setTab] = useState<Tab>("cambios");
  return (
    <div className="space-y-8">
      <section aria-labelledby="plan-h" className="space-y-4">
        <h3 id="plan-h" className="font-mono text-[11px] uppercase text-muted-foreground">Qué vamos a hacer · {a.acciones.length}</h3>
        <ol className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          {a.acciones.map((x, i) => <ActionCard key={x.accion} x={x} n={i + 1} handoff={actionHandoffs?.[i]} />)}
        </ol>
        {handoff && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Pasar todo el plan a tu IA de una vez</summary>
            <CopyForClaude payload={handoff} className="mt-3" />
          </details>
        )}
      </section>

      <section aria-labelledby="diag-h" className="space-y-5">
        <h3 id="diag-h" className="font-mono text-[11px] uppercase text-muted-foreground">De dónde sale: el análisis</h3>
        {metrics && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {metrics.metrics.map((m) => <MetricTile key={m.key} m={m} />)}
            </div>
            <div className="rounded-xl bg-background p-4">
              <p className="mb-2 text-xs text-muted-foreground">Visitas y formularios por día · las dos semanas</p>
              <TrendChart points={metrics.daily} keys={["sessions", "key_events"]} labels={{ sessions: "Visitas", key_events: "Formularios" }} height={200} />
            </div>
          </>
        )}
        <Segmented label="Secciones del análisis" size="sm" value={tab} onChange={setTab} items={[
          { key: "cambios", label: "Qué cambió" },
          { key: "estado", label: "Bien y riesgos" },
          { key: "aprendizajes", label: "Aprendizajes" },
          { key: "esperar", label: "Qué esperar" },
        ]} />
        <div key={tab} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
          {tab === "cambios" && <Bullets items={a.queCambio} />}
          {tab === "estado" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div><p className="flex items-center gap-2 font-mono text-[11px] uppercase text-muted-foreground"><span className="h-2 w-2 rounded-full bg-good" aria-hidden />Funciona</p><Bullets items={a.bien} /></div>
              <div><p className="flex items-center gap-2 font-mono text-[11px] uppercase text-muted-foreground"><span className="h-2 w-2 rounded-full bg-bad" aria-hidden />Atender</p><Bullets items={a.riesgos} /></div>
            </div>
          )}
          {tab === "aprendizajes" && <Bullets items={a.aprendizajes} />}
          {tab === "esperar" && <Bullets items={a.esperar} />}
        </div>
      </section>
    </div>
  );
}

/** El último análisis en corto: en qué vamos a trabajar y las acciones; al tocarlo se abre el plan completo. */
export function WeeklyCard({ analysis, metrics, handoff = null, actionHandoffs, defaultOpen = false }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState<string | null>(null);
  // El foco inicial va al encabezado, no a la gráfica (si no, su tooltip se abre solo).
  const headRef = useRef<HTMLDivElement>(null);
  const generate = () => start(async () => {
    setError(null);
    const res = await fetch("/api/analysis", { method: "POST" });
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo generar."); return; }
    router.refresh();
  });
  const a = analysis?.analisis;
  const cardMetrics = metrics?.metrics.filter((m) => CARD_METRICS.includes(m.key)) ?? [];
  return (
    <section className="space-y-4 rounded-2xl bg-card p-5" aria-labelledby="weekly-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="weekly-title" className="font-mono text-[11px] uppercase text-muted-foreground">{analysis ? "Esta semana vamos a" : "Análisis semanal"}</h2>
        {analysis && <span className="font-mono text-[10px] text-muted-foreground">{analysis.periodo}</span>}
      </div>
      {a ? (
        <>
          <button type="button" onClick={() => setOpen(true)} className="group block w-full space-y-4 rounded-xl text-left transition-transform duration-150 active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p className="line-clamp-3 font-display text-xl leading-snug">{focusOf(a)}</p>
            <ol className="space-y-2.5">
              {a.acciones.slice(0, 4).map((x, i) => (
                <li key={x.accion} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-background font-mono text-[10px]">{i + 1}</span>
                  <span className="min-w-0">
                    {frenteLabel(x) && <span className="mr-1.5 font-mono text-[10px] uppercase text-muted-foreground">{frenteLabel(x)}</span>}
                    <span className="line-clamp-2">{x.accion}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="line-clamp-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Por qué: </span>{a.titular}</p>
            {cardMetrics.length > 0 && (
              <dl className="grid grid-cols-3 gap-2">
                {cardMetrics.map((m) => (
                  <div key={m.key} className="rounded-lg bg-background p-2.5">
                    <dt className="truncate text-[11px] text-muted-foreground">{m.label}</dt>
                    <dd className="font-display text-lg tabular-nums">{fmt(m, m.current)}</dd>
                    <dd><Delta m={m} /></dd>
                  </div>
                ))}
              </dl>
            )}
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground group-hover:text-foreground">
              <Maximize2 className="h-3 w-3" aria-hidden /> Ver el plan y pasárselo a tu IA
            </span>
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent initialFocus={headRef} className="max-h-[88dvh] overflow-y-auto p-6 sm:max-w-5xl md:p-8">
              <div ref={headRef} tabIndex={-1} className="space-y-2 pr-8 outline-none">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Esta semana vamos a · {analysis!.periodo}</p>
                <DialogTitle className="max-w-[60ch] font-display text-2xl leading-snug md:text-3xl">{focusOf(a)}</DialogTitle>
                <DialogDescription className="max-w-[70ch] text-sm text-muted-foreground"><span className="font-medium text-foreground">Por qué: </span>{a.titular}</DialogDescription>
              </div>
              <div className="mt-6"><WeeklyDetail a={a} metrics={metrics} actionHandoffs={actionHandoffs} handoff={handoff} /></div>
            </DialogContent>
          </Dialog>
        </>
      ) : <p className="text-sm text-muted-foreground">Todavía no hay análisis. Se genera solo cada lunes, o puedes pedirlo ahora.</p>}
      <button type="button" onClick={generate} disabled={pending}
        className="h-8 rounded-md bg-background px-3 font-mono text-[11px] uppercase hover:bg-secondary disabled:opacity-60">
        {pending ? "Analizando… (1-2 min)" : analysis ? "Actualizar análisis" : "Generar análisis"}
      </button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </section>
  );
}
