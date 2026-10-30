"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2 } from "lucide-react";
import type { Weekly } from "@/lib/assistant/weekly";
import type { WeeklyMetrics } from "@/lib/analytics/sections/weekly-metrics";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/dash/Segmented";
import { TrendChart } from "@/components/dash/TrendChart";
import { cn } from "@/lib/utils";
import { Delta, fmt, MetricTile } from "./WeeklyMetrics";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import type { HandoffPayload } from "@/lib/handoff/from-panel";

interface Props { analysis: { periodo: string; creado: Date; analisis: Weekly } | null; metrics: WeeklyMetrics | null; handoff?: HandoffPayload | null; defaultOpen?: boolean }
type Tab = "acciones" | "cambios" | "estado" | "aprendizajes" | "esperar";
const IMPACT: Record<string, { dot: string; label: string }> = {
  alto: { dot: "bg-bad", label: "Impacto alto" }, medio: { dot: "bg-warn", label: "Impacto medio" }, bajo: { dot: "bg-muted-foreground/50", label: "Impacto bajo" },
};
const CARD_METRICS = ["sessions", "key_events", "cpl"];

function Bullets({ items, empty = "Nada que reportar." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="divide-y divide-border">{items.map((x) => <li key={x} className="py-2.5 text-sm max-w-[70ch]">{x}</li>)}</ul>;
}

/** Contenido del pop-up: números con gráfica arriba, el texto en pestañas abajo. */
function WeeklyDetail({ a, metrics }: { a: Weekly; metrics: WeeklyMetrics | null }) {
  const [tab, setTab] = useState<Tab>("acciones");
  return (
    <div className="space-y-6">
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
        { key: "acciones", label: `Acciones · ${a.acciones.length}` },
        { key: "cambios", label: "Qué cambió" },
        { key: "estado", label: "Bien y riesgos" },
        { key: "aprendizajes", label: "Aprendizajes" },
        { key: "esperar", label: "Qué esperar" },
      ]} />
      <div key={tab} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        {tab === "acciones" && (
          <ol className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {a.acciones.map((x, i) => (
              <li key={x.accion} className="space-y-2 rounded-xl bg-background p-4">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase text-muted-foreground">
                  <span className="font-display text-lg leading-none text-foreground">{i + 1}</span>
                  <span className={cn("h-2 w-2 rounded-full", IMPACT[x.impacto].dot)} aria-hidden />{IMPACT[x.impacto].label} · {x.seccion}
                </p>
                <p className="font-medium leading-snug">{x.accion}</p>
                <p className="text-sm text-muted-foreground">{x.porQue}</p>
              </li>
            ))}
          </ol>
        )}
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
    </div>
  );
}

/** El último análisis semanal en corto; al tocarlo se abre completo en un pop-up ancho. */
export function WeeklyCard({ analysis, metrics, handoff = null, defaultOpen = false }: Props) {
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
        <h2 id="weekly-title" className="font-mono text-[11px] uppercase text-muted-foreground">Análisis semanal</h2>
        {analysis && <span className="font-mono text-[10px] text-muted-foreground">{analysis.periodo}</span>}
      </div>
      {a ? (
        <>
          <button type="button" onClick={() => setOpen(true)} className="group block w-full space-y-4 rounded-xl text-left transition-transform duration-150 active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p className="line-clamp-4 font-display text-xl leading-snug">{a.titular}</p>
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
            <ol className="space-y-2">
              {a.acciones.slice(0, 3).map((x) => (
                <li key={x.accion} className="flex items-start gap-2 text-sm">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", IMPACT[x.impacto].dot)} aria-label={IMPACT[x.impacto].label} /><span className="line-clamp-2">{x.accion}</span>
                </li>
              ))}
            </ol>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground group-hover:text-foreground">
              <Maximize2 className="h-3 w-3" aria-hidden /> Ver análisis completo
            </span>
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent initialFocus={headRef} className="max-h-[88dvh] overflow-y-auto p-6 sm:max-w-5xl md:p-8">
              <div ref={headRef} tabIndex={-1} className="space-y-1 pr-8 outline-none">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Análisis semanal · {analysis!.periodo}</p>
                <DialogTitle className="max-w-[60ch] font-display text-xl leading-snug md:text-2xl">{a.titular}</DialogTitle>
                <DialogDescription className="sr-only">Métricas de la semana contra la anterior y recomendaciones del analista.</DialogDescription>
              </div>
              {handoff && <CopyForClaude payload={handoff} className="mt-5" />}
              <WeeklyDetail a={a} metrics={metrics} />
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
