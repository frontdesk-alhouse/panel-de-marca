"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, formatShortDate } from "@/lib/format";
import { label as channelLabel, seriesColor } from "./colors";

interface Props {
  points: ({ date: string } & Record<string, number>)[];
  keys: string[];
  stacked?: boolean;
  labels?: Record<string, string>;
  height?: number;
}

function TooltipBox({ active, payload, label, names }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string; names: (k: string) => string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs space-y-1 min-w-40">
      <p className="font-mono uppercase text-muted-foreground">{label ? formatShortDate(label) : ""}</p>
      {[...payload].reverse().map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{names(p.dataKey)}</span>
          <span className="tabular-nums">{formatNumber(p.value)}</span>
        </p>
      ))}
      {payload.length > 1 && <p className="flex justify-between border-t border-border pt-1"><span>Total</span><span className="tabular-nums">{formatNumber(total)}</span></p>}
    </div>
  );
}

/** Tendencia diaria con tooltip; apilada para mostrar la mezcla por canal. */
export function TrendChart({ points, keys, stacked = false, labels, height = 260 }: Props) {
  const gid = `trend-${useId().replace(/:/g, "")}`;
  const names = (k: string) => labels?.[k] ?? channelLabel(k);
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
  const common = (
    <>
      <CartesianGrid stroke="var(--grid)" vertical={false} />
      <XAxis dataKey="date" tickFormatter={formatShortDate} minTickGap={28} {...axis} />
      <YAxis width={36} allowDecimals={false} {...axis} />
      <Tooltip content={<TooltipBox names={names} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
    </>
  );
  return (
    <div className="space-y-3">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* Degradado bajo cada curva: misma tinta que la línea, de visible arriba a transparente abajo. */}
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {keys.map((k, i) => (
                <linearGradient key={k} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColor(k, i)} stopOpacity={stacked ? 0.9 : keys.length > 2 ? 0.14 : 0.3} />
                  <stop offset="100%" stopColor={seriesColor(k, i)} stopOpacity={stacked ? 0.55 : 0} />
                </linearGradient>
              ))}
            </defs>
            {common}
            {keys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stackId={stacked ? "1" : undefined} stroke={seriesColor(k, i)} strokeWidth={stacked ? 0 : 2}
                fill={`url(#${gid}-${i})`} fillOpacity={1} activeDot={stacked ? false : { r: 4 }} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {keys.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Leyenda">
          {keys.map((k, i) => (
            <li key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: seriesColor(k, i) }} />{names(k)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
