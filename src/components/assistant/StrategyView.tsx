"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Strategy } from "@/lib/assistant/strategy";
import { formatMoney } from "@/lib/format";
import { Segmented } from "@/components/dash/Segmented";
import { cn } from "@/lib/utils";

type Stage = Strategy["embudo"][number]["etapa"];
/** El embudo en palabras simples: qué le pasa al cliente en cada etapa. */
const STAGE: Record<Stage, string> = { reconocimiento: "Te conocen", consideracion: "Te comparan", conversion: "Te escriben", relacion: "Regresan y recomiendan" };
export const STAGE_EXPLAIN: Record<Stage, string> = {
  reconocimiento: "Gente que aún no sabe que existes empieza a verte.",
  consideracion: "Ya te conocen y te comparan con otras opciones.",
  conversion: "Deciden contactarte: formulario, WhatsApp o llamada.",
  relacion: "Ya son clientes: vuelven a comprar y te recomiendan.",
};
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)"];

/** Detalle que se abre al tocarlo: lo común a la vista, lo demás un nivel abajo. */
function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        {label}<ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/** El embudo, una etapa a la vez y a todo el ancho. */
export function FunnelTabs({ embudo }: { embudo: Strategy["embudo"] }) {
  const [stage, setStage] = useState<Stage>(embudo[0]?.etapa ?? "reconocimiento");
  const current = embudo.find((e) => e.etapa === stage) ?? embudo[0];
  if (!current) return null;
  const budget = (e: Strategy["embudo"][number]) => e.canales.reduce((s, c) => s + c.presupuestoMensualMxn, 0);
  return (
    <div className="space-y-5">
      <Segmented label="Etapa del embudo" value={stage} onChange={setStage}
        items={embudo.map((e, i) => ({ key: e.etapa, label: `${i + 1}. ${STAGE[e.etapa]}`, meta: budget(e) ? `${formatMoney(budget(e))}/mes` : "Orgánico" }))} />
      <div key={stage} className="space-y-4 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        <p className="text-sm text-muted-foreground">{STAGE_EXPLAIN[current.etapa]}</p>
        <div className="grid gap-2 md:grid-cols-[auto_1fr] md:gap-x-6">
          <p className="font-mono text-[11px] uppercase text-muted-foreground md:pt-1">Objetivo</p>
          <p className="max-w-[65ch] text-lg leading-snug">{current.objetivo}</p>
          <p className="font-mono text-[11px] uppercase text-muted-foreground md:pt-0.5">Público</p>
          <p className="max-w-[65ch] text-sm text-muted-foreground">{current.publico}</p>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {current.canales.map((c) => (
            <article key={c.canal} className="flex flex-col gap-2 rounded-xl bg-background p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">{c.canal}</h3>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{c.presupuestoMensualMxn ? formatMoney(c.presupuestoMensualMxn) : "Orgánico"}</span>
              </div>
              <p className="text-sm text-muted-foreground">{c.rol}</p>
              <p className="mt-auto pt-1 text-sm"><span className="text-muted-foreground">Meta:</span> <span className="font-medium">{c.meta90Dias}</span></p>
              <More label="Formatos y KPI">
                <p className="text-xs text-muted-foreground">KPI: {c.kpi}</p>
                {c.formatos.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{c.formatos.map((f) => <li key={f} className="rounded-full bg-card px-2.5 py-0.5 text-xs">{f}</li>)}</ul>}
              </More>
            </article>
          ))}
        </div>
        {current.mensajes.length > 0 && (
          <More label="Mensajes de esta etapa">
            <ul className="list-disc space-y-1 pl-5 text-sm">{current.mensajes.map((m) => <li key={m}>{m}</li>)}</ul>
          </More>
        )}
      </div>
    </div>
  );
}

/** Presupuesto: una barra apilada y su leyenda; el porqué de cada canal se abre al tocarlo. */
export function BudgetBar({ presupuesto }: { presupuesto: Strategy["presupuesto"] }) {
  const total = presupuesto.totalMensualMxn || presupuesto.reparto.reduce((s, r) => s + r.mxn, 0);
  const paid = presupuesto.reparto.filter((r) => r.mxn > 0);
  const organic = presupuesto.reparto.filter((r) => r.mxn <= 0);
  return (
    <div className="space-y-5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-background" role="img"
        aria-label={paid.map((r) => `${r.canal} ${Math.round((r.mxn / total) * 100)} %`).join(", ")}>
        {paid.map((r, i) => <div key={r.canal} style={{ width: `${(r.mxn / total) * 100}%`, background: SERIES[i % SERIES.length] }} />)}
      </div>
      <ul className="divide-y divide-border">
        {paid.map((r, i) => (
          <li key={r.canal} className="py-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.canal}</span>
                <span className="font-mono text-sm tabular-nums">{formatMoney(r.mxn)}</span>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{Math.round((r.mxn / total) * 100)} %</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <p className="pl-5.5 pt-2 text-sm text-muted-foreground max-w-[65ch]">{r.porQue}</p>
            </details>
          </li>
        ))}
      </ul>
      {organic.length > 0 && <p className="text-xs text-muted-foreground">Sin pauta: {organic.map((r) => r.canal).join(" · ")}</p>}
      <More label="Supuestos y cuándo escalar"><p className="max-w-[65ch] text-sm text-muted-foreground">{presupuesto.nota}</p></More>
    </div>
  );
}

/** Plan de 90 días como pasos: una fase a la vez. */
export function PlanSteps({ plan }: { plan: Strategy["plan90Dias"] }) {
  const [i, setI] = useState(0);
  const phase = plan[i];
  if (!phase) return null;
  return (
    <div className="space-y-5">
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Fases del plan">
        {plan.map((p, n) => (
          <li key={p.fase}>
            <button type="button" onClick={() => setI(n)} aria-current={n === i ? "step" : undefined}
              className={cn("w-full rounded-xl p-3 text-left transition-[background-color,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none",
                n === i ? "bg-background shadow-[inset_0_0_0_1px_var(--border)]" : "hover:bg-background/60")}>
              <span className="flex items-center gap-2">
                <span className={cn("grid h-6 w-6 place-items-center rounded-full font-mono text-[11px]", n === i ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>{n + 1}</span>
                <span className="font-mono text-[11px] uppercase text-muted-foreground">{p.fase}</span>
              </span>
              <span className="mt-1.5 block text-sm font-medium leading-snug">{p.foco}</span>
            </button>
          </li>
        ))}
      </ol>
      <ul key={i} className="grid gap-x-8 gap-y-2.5 md:grid-cols-2 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        {phase.acciones.map((a) => (
          <li key={a} className="flex gap-2.5 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" aria-hidden /><span className="max-w-[60ch]">{a}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Reglas, experimentos y qué dejar de hacer: una pestaña a la vez. */
export function PlaybookTabs({ s }: { s: Strategy }) {
  const [tab, setTab] = useState<"reglas" | "experimentos" | "dejar">("reglas");
  return (
    <div className="space-y-4">
      <Segmented label="Guía de decisiones" size="sm" value={tab} onChange={setTab} items={[
        { key: "reglas", label: `Reglas · ${s.reglas.length}` },
        { key: "experimentos", label: `Experimentos · ${s.experimentos.length}` },
        { key: "dejar", label: `Dejar de hacer · ${s.dejarDeHacer.length}` },
      ]} />
      <div key={tab} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        {tab === "reglas" && (
          <dl className="divide-y divide-border">
            {s.reglas.map((r) => (
              <div key={r.situacion} className="grid gap-1 py-3 md:grid-cols-2 md:gap-8">
                <dt className="text-sm text-muted-foreground">{r.situacion}</dt>
                <dd className="text-sm font-medium">→ {r.decision}</dd>
              </div>
            ))}
          </dl>
        )}
        {tab === "experimentos" && (
          <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {s.experimentos.map((x) => (
              <li key={x.hipotesis} className="space-y-1.5 rounded-xl bg-background p-4 text-sm">
                <p className="font-medium">{x.hipotesis}</p>
                <p className="text-muted-foreground">{x.prueba}</p>
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Éxito: <span className="normal-case font-sans text-foreground">{x.criterioDeExito}</span></p>
              </li>
            ))}
          </ul>
        )}
        {tab === "dejar" && (
          <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {s.dejarDeHacer.map((d) => <li key={d} className="flex gap-2.5 text-sm"><span className="mt-0.5 text-bad" aria-hidden>×</span><span className="max-w-[60ch]">{d}</span></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
