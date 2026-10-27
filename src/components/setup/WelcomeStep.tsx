"use client";

import { INTEGRATIONS } from "@/lib/integrations/catalog";
import { useT } from "@/i18n/client";
import { Button, StepHeader } from "./ui";

/** Paso 0: qué va a pasar, cuánto tarda y qué cuesta. */
export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  const w = t.setup.welcome;
  return (
    <div className="space-y-10">
      <StepHeader eyebrow={w.eyebrow} title={w.title}><p>{w.intro}</p></StepHeader>
      <ol className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-5">
        {w.plan.map(([title, text, time], i) => (
          <li key={title} className="space-y-2 bg-background p-4">
            <p className="font-mono text-[11px] uppercase text-muted-foreground">{String(i + 1).padStart(2, "0")} · {time}</p>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <section aria-labelledby="costs" className="space-y-3">
        <h2 id="costs" className="text-lg font-medium">{w.costsTitle}</h2>
        <p className="text-sm text-muted-foreground">{w.costsIntro}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {INTEGRATIONS.map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-card px-4 py-2.5 text-sm">
              <span>{t.integrations[it.id].name}</span>
              <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{t.cost[it.cost]}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex justify-end"><Button onClick={onNext}>{w.start}</Button></div>
    </div>
  );
}
