import { formatNumber, formatPct } from "@/lib/format";
import type { Insight } from "@/lib/analytics/insights";
import { InsightCallouts } from "./InsightCallouts";

/** Embudo de pasos con la conversión entre cada uno. */
export function Funnel({ steps }: { steps: { step: string; value: number }[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        return (
          <li key={s.step} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{s.step}</span>
              <span className="tabular-nums">
                {formatNumber(s.value)}
                {prev !== null && <span className="text-muted-foreground"> · {prev ? formatPct(s.value / prev, 0) : "-"} del paso anterior</span>}
              </span>
            </div>
            <div className="h-3 rounded bg-background overflow-hidden">
              <div className="h-full rounded bg-foreground" style={{ width: `${Math.max((s.value / top) * 100, s.value ? 1.5 : 0)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Card({ title, children, note, className, id, insights }: { title: string; children: React.ReactNode; note?: string; className?: string; id?: string; insights?: Insight[] }) {
  return (
    <section id={id} className={`rounded-xl bg-card p-5 space-y-4 min-w-0 scroll-mt-4 ${className ?? ""}`}>
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <InsightCallouts insights={insights} />
      {children}
    </section>
  );
}
