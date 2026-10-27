import { formatNumber, formatPct } from "@/lib/format";
import type { Insight } from "@/lib/analytics/insights";
import { InsightCallouts } from "./InsightCallouts";

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Texto secundario a la derecha (p. ej. tasa de interacción) */
  note?: string;
  color?: string;
}

/** Barras horizontales con valor y porcentaje: comparación rápida y legible en celular. */
export function BarList({ items, title, emptyText = "Sin datos en el periodo.", max = 8, id, insights }: { items: BarItem[]; title: string; emptyText?: string; max?: number; id?: string; insights?: Insight[] }) {
  const shown = items.slice(0, max);
  const total = items.reduce((a, i) => a + i.value, 0);
  const top = Math.max(...shown.map((i) => i.value), 1);
  return (
    <section id={id} className="rounded-xl bg-card p-5 space-y-4 min-w-0 scroll-mt-4">
      <h3 className="font-medium">{title}</h3>
      <InsightCallouts insights={insights} />
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((i) => (
            <li key={i.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{i.label}</span>
                <span className="shrink-0 tabular-nums">
                  {formatNumber(i.value)} <span className="text-muted-foreground">· {formatPct(total ? i.value / total : 0, 0)}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(i.value / top) * 100}%`, background: i.color ?? "var(--foreground)" }} />
              </div>
              {i.note && <p className="text-xs text-muted-foreground">{i.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
