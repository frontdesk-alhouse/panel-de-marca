"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { WeeklyMetric } from "@/lib/analytics/sections/weekly-metrics";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const MIN_BASE = 20;

export function fmt(m: Pick<WeeklyMetric, "format">, v: number | null) {
  if (v === null) return "-";
  return m.format === "mxn" ? formatMoney(v) : m.format === "pct" ? formatPct(v, 1) : formatNumber(v);
}

/** Cambio contra el periodo anterior, con color según si subir es bueno o malo. */
export function Delta({ m }: { m: WeeklyMetric }) {
  // Con una base muy chica (p. ej. de 3 a 282 visitas) el porcentaje engaña más de lo que informa.
  const tinyBase = m.format === "number" && m.previous !== null && m.previous < MIN_BASE;
  if (m.current === null || m.previous === null || m.previous === 0 || tinyBase) return <span className="text-xs text-muted-foreground">sin base para comparar</span>;
  const change = (m.current - m.previous) / Math.abs(m.previous);
  const flat = Math.abs(change) < 0.005;
  const good = flat ? null : (change > 0) === m.higherIsBetter;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", good === null ? "text-muted-foreground" : good ? "text-good" : "text-bad")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{flat ? "igual" : formatPct(Math.abs(change), 0)}
      <span className="sr-only">{good === null ? "" : good ? " (mejor)" : " (peor)"}</span>
    </span>
  );
}

/** Esta semana contra la anterior en dos barras: se lee de un vistazo, sin restar. */
export function MetricTile({ m }: { m: WeeklyMetric }) {
  const top = Math.max(m.current ?? 0, m.previous ?? 0, 1);
  return (
    <div className="space-y-2 rounded-xl bg-background p-4">
      <p className="text-xs text-muted-foreground">{m.label}</p>
      <p className="font-display text-2xl tabular-nums">{fmt(m, m.current)}</p>
      <Delta m={m} />
      <div className="space-y-1" aria-hidden>
        <div className="h-1.5 rounded-full bg-foreground origin-left" style={{ transform: `scaleX(${(m.current ?? 0) / top})` }} />
        <div className="h-1.5 rounded-full bg-foreground/25 origin-left" style={{ transform: `scaleX(${(m.previous ?? 0) / top})` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">Semana anterior: {fmt(m, m.previous)}</p>
    </div>
  );
}
