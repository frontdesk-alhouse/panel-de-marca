"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Briefcase, Check, Eye, LayoutGrid, Puzzle, RefreshCw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { setViewMode, useViewMode, type ViewMode } from "@/components/layout/view-mode";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ah-panel-onboarding-v1";
/** Abre la guía desde cualquier botón («Guía del panel»). */
export const OPEN_GUIDE_EVENT = "ah-panel-open-guide";

const STEPS: { title: string; body: string; Icon: typeof Sparkles; points?: string[] }[] = [
  {
    title: "Tu marketing en un solo lugar",
    body: "El panel junta tu sitio, Google, anuncios, Instagram, tu competencia y tus clientes, y te dice qué conviene mover. Cada día se actualiza solo.",
    Icon: Sparkles,
  },
  {
    title: "Cómo está organizado",
    body: "El menú tiene grupos. Pasa el cursor sobre cualquier sección y toca «⋯» para ver qué hay ahí y para qué te sirve.",
    Icon: LayoutGrid,
    points: [
      "Negocio: clientes, ingreso y tu CRM. Lo que el marketing tiene que mover al final.",
      "Estrategia: el plan de medios que arma Claude con todos tus datos.",
      "Website: la calificación, el tráfico, Google y tu sitio.",
      "Social media: Instagram, anuncios en Meta y la competencia en redes.",
    ],
  },
  {
    title: "Empieza por la Calificación",
    body: "Una nota de 0 a 100 en siete áreas. Cada métrica dice si está bien o qué hacer, con qué tan confiable es el dato y cuánto puede subir tu nota.",
    Icon: Award,
  },
  {
    title: "Pásale el trabajo a tu IA",
    body: "«Copiar para Claude» arma las instrucciones con los skills correctos para Claude Code, la app de Claude, ChatGPT o Gemini. Al terminar, la IA te devuelve los cambios y los pegas en la bitácora para ver si movieron la nota.",
    Icon: Puzzle,
  },
  {
    title: "Datos al momento y un analista",
    body: "«Sincronizar ahora» (arriba a la derecha) trae todo sin esperar al día siguiente. En Inicio, el chat responde con tus datos y, si conectas la API de Claude, puede proponerte cambios al panel que tú apruebas.",
    Icon: RefreshCw,
  },
];

const MODES: { key: ViewMode; title: string; body: string }[] = [
  { key: "simple", title: "Vista simple", body: "Solo lo esencial: calificación, negocio, tráfico, redes y estrategia. Ideal si no eres de marketing." },
  { key: "full", title: "Vista completa", body: "Todo, incluido lo técnico (SEO, anuncios, analítica), marcado como «Técnico»." },
];

/** Guía de bienvenida: aparece la primera vez y se reabre con «Guía del panel». */
export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const mode = useViewMode();
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- se decide tras hidratar (localStorage)
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch { /* sin almacenamiento: no se insiste */ }
    const reopen = () => { setStep(0); setOpen(true); };
    window.addEventListener(OPEN_GUIDE_EVENT, reopen);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, reopen);
  }, []);
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* sin almacenamiento */ }
  };
  const isLast = step === STEPS.length;
  const s = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-xl md:p-8">
        <p className="font-mono text-[11px] uppercase text-muted-foreground">Guía del panel · {Math.min(step + 1, STEPS.length + 1)} de {STEPS.length + 1}</p>
        {!isLast ? (
          <div className="space-y-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><s.Icon className="h-5 w-5" aria-hidden /></span>
            <DialogTitle className="font-display text-2xl leading-tight md:text-3xl">{s.title}</DialogTitle>
            <DialogDescription className="text-[15px] text-foreground/80">{s.body}</DialogDescription>
            {s.points && <ul className="space-y-2 text-sm">{s.points.map((p) => <li key={p} className="flex gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />{p}</li>)}</ul>}
          </div>
        ) : (
          <div className="space-y-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><Eye className="h-5 w-5" aria-hidden /></span>
            <DialogTitle className="font-display text-2xl leading-tight md:text-3xl">¿Cómo lo quieres ver?</DialogTitle>
            <DialogDescription className="text-[15px] text-foreground/80">Puedes cambiarlo cuando quieras abajo del menú.</DialogDescription>
            <div role="radiogroup" aria-label="Vista del panel" className="grid gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} onClick={() => setViewMode(m.key)}
                  className={cn("relative rounded-xl border-2 p-4 text-left transition-colors", mode === m.key ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-secondary hover:border-border")}>
                  <span className="block font-medium">{m.title}</span>
                  <span className={cn("mt-1 block text-sm", mode === m.key ? "text-primary-foreground/80" : "text-muted-foreground")}>{m.body}</span>
                  {mode === m.key && <Check className="absolute right-3 top-3 h-4 w-4" aria-hidden />}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">¿Quieres leer qué es cada sección? <Link href="/guia" onClick={() => close(false)} className="underline underline-offset-2 hover:text-foreground">Ver la guía completa</Link>.</p>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          {step > 0
            ? <button type="button" onClick={() => setStep(step - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />Atrás</button>
            : <button type="button" onClick={() => close(false)} className="h-9 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">Saltar</button>}
          <div className="flex items-center gap-1.5" aria-hidden>
            {[...STEPS, null].map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-foreground" : "w-1.5 bg-border")} />)}
          </div>
          {!isLast
            ? <button type="button" onClick={() => setStep(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:opacity-90">Siguiente<ArrowRight className="h-4 w-4" aria-hidden /></button>
            : <Link href="/calificacion" onClick={() => close(false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:opacity-90">Ir a la calificación<ArrowRight className="h-4 w-4" aria-hidden /></Link>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
