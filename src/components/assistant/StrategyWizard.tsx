"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { cn } from "@/lib/utils";

/** Escalones de inversión mensual por moneda (en MXN los montos de una pyme mexicana; en otras, su equivalente aproximado). */
const TIERS: Record<string, readonly [number, number, number, number]> = { MXN: [5000, 10000, 20000, 40000] };
const DEFAULT_TIERS = [300, 600, 1200, 2500] as const;
const TIER_HINTS = [
  "Para probar un canal pagado con calma.",
  "Un canal pagado bien hecho, o dos chicos.",
  "Dos canales pagados y espacio para probar.",
  "Varios canales y crecer en más de una ciudad.",
] as const;

/** «auto» = que Claude proponga; «0» = solo orgánico; «custom» = monto propio; el resto, un escalón. */
type BudgetKey = string;
function budgetOptions(currency: string, locale: string) {
  const tiers = TIERS[currency] ?? DEFAULT_TIERS;
  const fmt = (n: number) => `$${n.toLocaleString(locale)}`;
  return [
    { key: "auto", label: "Propónme tú", hint: "Claude calcula un mínimo que funcione y uno para crecer." },
    { key: "0", label: "$0 · solo orgánico", hint: "Contenido, SEO, Google Maps y redes, sin pagar anuncios." },
    ...tiers.map((n, i) => ({ key: String(n), label: fmt(n), hint: TIER_HINTS[i] })),
    { key: "custom", label: "Otra cantidad", hint: "Escribe el monto que tienes en mente." },
  ];
}

const GOAL_EXAMPLES = [
  "Conseguir 10 clientes nuevos al mes",
  "Que me conozcan en CDMX además de mi ciudad",
  "Llenar mi agenda de citas",
  "Vender más del servicio que deja más margen",
];

const STEPS = ["Tu meta", "Inversión", "Contexto", "Revisar"] as const;

const card = "rounded-xl bg-background p-4 text-left transition-[box-shadow,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none";

/**
 * Arma la estrategia en pasos cortos: meta en palabras propias, cuánto invertir al mes y
 * contexto opcional. Al final se revisa todo y se genera (Opus, 2-3 min).
 */
export function StrategyWizard({ hasStrategy, onCancel }: { hasStrategy: boolean; onCancel?: () => void }) {
  const router = useRouter();
  const brand = useWorkspace().brand.name;
  const { currency, locale } = useWorkspace().locale;
  const BUDGETS = budgetOptions(currency, locale);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState<BudgetKey>("auto");
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const customOk = /^\s*\$?\s*[\d,]+(\.\d+)?\s*$/.test(custom);
  const canNext = step === 0 ? goal.trim().length >= 5 : step === 1 ? budget !== "custom" || customOk : true;
  const budgetLabel = budget === "custom" ? `$${custom.trim().replace(/^\$/, "")}` : BUDGETS.find((b) => b.key === budget)!.label;

  function submit() {
    const amount = budget === "auto" ? "" : budget === "custom" ? custom : budget === "0" ? "" : budget;
    // $0 = sin pauta: se dice en el contexto, porque un presupuesto vacío significa «propónme».
    const extra = budget === "0" ? "No hay presupuesto para anuncios: el plan debe ser solo con canales orgánicos." : "";
    start(async () => {
      setError(null);
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), budget: amount, notes: [extra, notes.trim()].filter(Boolean).join(" ") }),
      });
      if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo generar."); return; }
      router.refresh();
      onCancel?.();
    });
  }

  return (
    <section aria-labelledby="wizard-h" className="space-y-6 rounded-2xl bg-card p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap gap-2" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined}
              className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase",
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-background text-foreground" : "text-muted-foreground")}>
              {i < step ? <Check className="h-3 w-3" aria-hidden /> : <span aria-hidden>{i + 1}</span>}{s}
            </li>
          ))}
        </ol>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">Cancelar</button>}
      </div>

      <div key={step} className="space-y-5 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        {step === 0 && (
          <>
            <div className="space-y-2">
              {!hasStrategy && <p className="font-mono text-[11px] uppercase text-muted-foreground">Todavía no tienes una estrategia</p>}
              <h2 id="wizard-h" className="font-display text-3xl leading-tight md:text-4xl">¿Cuál es tu meta?</h2>
              <p className="max-w-[60ch] text-muted-foreground">Escríbela como se la dirías a alguien de tu equipo. La estrategia se arma para cumplirla en 90 días.</p>
            </div>
            <label htmlFor="goal" className="sr-only">Tu meta</label>
            <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={500} rows={3} autoFocus
              placeholder={`Ej. Que ${brand} consiga 10 clientes nuevos al mes`}
              className="w-full resize-none rounded-xl bg-background p-4 text-lg outline-none ring-ring placeholder:text-muted-foreground/70 focus-visible:ring-2" />
            <div className="flex flex-wrap gap-2">
              {GOAL_EXAMPLES.map((g) => (
                <button key={g} type="button" onClick={() => setGoal(g)}
                  className="rounded-full bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground active:scale-95">{g}</button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <h2 id="wizard-h" className="font-display text-3xl leading-tight md:text-4xl">¿Cuánto quieres invertir al mes?</h2>
              <p className="max-w-[60ch] text-muted-foreground">Solo lo que pagas en anuncios (Google, Meta…), en {currency}. No incluye producción de contenido ni tu tiempo. Si no sabes, deja que te proponga.</p>
            </div>
            <div role="radiogroup" aria-label="Inversión mensual" className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
              {BUDGETS.map((b) => {
                const on = b.key === budget;
                return (
                  <button key={b.key} type="button" role="radio" aria-checked={on} onClick={() => setBudget(b.key)}
                    className={cn(card, on ? "shadow-[inset_0_0_0_2px_var(--foreground)]" : "hover:shadow-[inset_0_0_0_1px_var(--border)]")}>
                    <span className="flex items-center justify-between gap-2 font-medium">{b.label}{on && <Check className="h-4 w-4" aria-hidden />}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{b.hint}</span>
                  </button>
                );
              })}
            </div>
            {budget === "custom" && (
              <div className="max-w-xs space-y-1">
                <label htmlFor="custom" className="text-sm">Monto al mes ({currency})</label>
                <input id="custom" value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="decimal" autoFocus placeholder="15,000"
                  className="h-10 w-full rounded-lg bg-background px-3 outline-none ring-ring focus-visible:ring-2" />
                {custom && !customOk && <p className="text-xs text-bad">Solo el número, por ejemplo 15,000.</p>}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <h2 id="wizard-h" className="font-display text-3xl leading-tight md:text-4xl">¿Algo que debamos saber?</h2>
              <p className="max-w-[60ch] text-muted-foreground">Opcional. Por ejemplo: a quién le quieres vender, en qué ciudad, qué ya probaste o qué no quieres usar.</p>
            </div>
            <label htmlFor="notes" className="sr-only">Contexto</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1200} rows={4}
              placeholder="Ej. Enfocarnos en médicos, abrir CDMX, no usar TikTok"
              className="w-full resize-none rounded-xl bg-background p-4 outline-none ring-ring placeholder:text-muted-foreground/70 focus-visible:ring-2" />
          </>
        )}

        {step === 3 && (
          <>
            <h2 id="wizard-h" className="font-display text-3xl leading-tight md:text-4xl">Revisa y genera</h2>
            <dl className="divide-y divide-border rounded-xl bg-background">
              {[["Meta", goal.trim()], ["Inversión al mes", budgetLabel], ["Contexto", notes.trim() || "Sin notas"]].map(([k, v], i) => (
                <div key={k} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0"><dt className="font-mono text-[11px] uppercase text-muted-foreground">{k}</dt><dd className="mt-1 break-words">{v}</dd></div>
                  <button type="button" onClick={() => setStep(i)} className="shrink-0 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Cambiar</button>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">Claude lee todo tu panel (tráfico, anuncios, redes, competencia y CRM) y arma el plan. Tarda 2-3 minutos; puedes seguir usando el panel.</p>
          </>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-bad">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition hover:text-foreground disabled:invisible">
          <ArrowLeft className="h-4 w-4" aria-hidden />Atrás
        </button>
        {step < 3 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
            {step === 2 && !notes.trim() ? "Saltar" : "Siguiente"}<ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {pending ? "Armando tu estrategia… (2-3 min)" : hasStrategy ? "Generar nueva estrategia" : "Generar estrategia"}
          </button>
        )}
      </div>
    </section>
  );
}
