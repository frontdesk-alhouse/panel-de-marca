"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/dash/Segmented";
import { formatNumber, formatShortDate } from "@/lib/format";

export interface HistoryPoint { date: string; overall: number | null; dimensions: Record<string, number | null> }
export interface ChangeMark { id: number; n: number; date: string; kind: "propio" | "externo"; title: string; area: string }

type Props = {
  points: HistoryPoint[];
  changes: ChangeMark[];
  dimensions: { id: string; label: string }[];
};

const KIND_STROKE: Record<ChangeMark["kind"], { stroke: string; dash?: string; label: string }> = {
  propio: { stroke: "var(--foreground)", label: "Cambio propio" },
  externo: { stroke: "var(--muted-foreground)", dash: "4 4", label: "Cambio externo" },
};

function TooltipBox({ active, payload, label, changes }: { active?: boolean; payload?: { value: number | null }[]; label?: string; changes: ChangeMark[] }) {
  if (!active || !label) return null;
  const value = payload?.[0]?.value;
  const here = changes.filter((c) => c.date === label);
  return (
    <div className="min-w-44 max-w-72 space-y-1 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-mono uppercase text-muted-foreground">{formatShortDate(label)}</p>
      <p className="flex justify-between gap-4"><span>Calificación</span><span className="tabular-nums">{value === null || value === undefined ? "-" : formatNumber(value)}</span></p>
      {here.map((c) => <p key={c.id} className="border-t border-border pt-1"><span className="font-mono">#{c.n}</span> {c.title} <span className="text-muted-foreground">({KIND_STROKE[c.kind].label.toLowerCase()})</span></p>)}
    </div>
  );
}

/**
 * La calificación día a día con los cambios encima: ver si una subida coincide con algo
 * que hizo la marca, con algo de afuera, o con nada.
 */
export function ScoreHistory({ points, changes, dimensions }: Props) {
  const [series, setSeries] = useState("overall");
  const gid = `score-${useId().replace(/:/g, "")}`;
  const data = points.map((p) => ({ date: p.date, value: series === "overall" ? p.overall : p.dimensions[series] ?? null }));
  // El color sigue a la nota actual: verde ≥ 75, ámbar ≥ 45, rojo debajo (mismas bandas que las tarjetas).
  const last = [...data].reverse().find((d) => d.value !== null)?.value ?? null;
  const tone = last === null ? "var(--series-1)" : last >= 75 ? "var(--good)" : last >= 45 ? "var(--warn)" : "var(--bad)";
  const visible = changes.filter((c) => series === "overall" || c.area === "general" || c.area === series);
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
  const items = [{ key: "overall", label: "General" }, ...dimensions.map((d) => ({ key: d.id, label: d.label }))];

  if (points.length < 2) {
    return <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">La gráfica aparece cuando haya al menos dos días de calificación guardada. Se guarda una por día.</p>;
  }
  return (
    <div className="space-y-4 rounded-2xl bg-card p-5">
      <Segmented items={items} value={series} onChange={setSeries} label="Qué calificación ver" size="sm" />
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
                <stop offset="100%" stopColor={tone} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatShortDate} minTickGap={28} {...axis} />
            <YAxis width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
            <Tooltip content={<TooltipBox changes={visible} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            {visible.map((c) => (
              <ReferenceLine key={c.id} x={c.date} stroke={KIND_STROKE[c.kind].stroke} strokeDasharray={KIND_STROKE[c.kind].dash} strokeWidth={1}
                label={{ value: `#${c.n}`, position: "top", fontSize: 10, fill: "var(--muted-foreground)" }} />
            ))}
            <Area type="monotone" dataKey="value" stroke={tone} strokeWidth={2.25} fill={`url(#${gid})`} fillOpacity={1} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: tone }} />Calificación (0 a 100; el color sigue a la nota actual)</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0 border-l border-foreground" />{KIND_STROKE.propio.label}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0 border-l border-dashed border-muted-foreground" />{KIND_STROKE.externo.label}</li>
      </ul>
    </div>
  );
}
