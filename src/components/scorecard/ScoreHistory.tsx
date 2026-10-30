"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/dash/Segmented";
import { formatNumber, formatShortDate } from "@/lib/format";
import { explainChange, type ExplainMeta } from "@/lib/scorecard/explain-change";
import { aggregate, bucketLabel, bucketStart, PERIOD_LABEL, PERIODS, type Period, type PeriodPoint } from "@/lib/scorecard/periods";

export interface HistoryPoint { date: string; overall: number | null; dimensions: Record<string, number | null>; metrics: Record<string, number | null> }
export interface ChangeMark { id: number; n: number; date: string; kind: "propio" | "externo"; title: string; area: string }

type Props = {
  points: HistoryPoint[];
  changes: ChangeMark[];
  dimensions: { id: string; label: string }[];
  meta: ExplainMeta;
};

const toneFor = (v: number | null) => (v === null ? "var(--series-1)" : v >= 75 ? "var(--good)" : v >= 45 ? "var(--warn)" : "var(--bad)");
const DIRECTION_MARK = { up: "▲", down: "▼", neutral: "•" } as const;
const DIRECTION_CLASS = { up: "text-good-ink", down: "text-bad-ink", neutral: "text-muted-foreground" } as const;

const KIND_STROKE: Record<ChangeMark["kind"], { stroke: string; dash?: string; label: string }> = {
  propio: { stroke: "var(--foreground)", label: "Cambio propio" },
  externo: { stroke: "var(--muted-foreground)", dash: "4 4", label: "Cambio externo" },
};

function TooltipBox({ active, payload, label, changes, period }: { active?: boolean; payload?: { value: number | null }[]; label?: string; changes: ChangeMark[]; period: Period }) {
  if (!active || !label) return null;
  const value = payload?.[0]?.value;
  const here = changes.filter((c) => bucketStart(c.date, period) === label);
  return (
    <div className="min-w-44 max-w-72 space-y-1 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-mono uppercase text-muted-foreground">{period === "day" ? formatShortDate(label) : bucketLabel(label, period)}</p>
      <p className="flex justify-between gap-4"><span>Calificación</span><span className="tabular-nums">{value === null || value === undefined ? "-" : formatNumber(value)}</span></p>
      {here.map((c) => <p key={c.id} className="border-t border-border pt-1"><span className="font-mono">#{c.n}</span> {c.title} <span className="text-muted-foreground">({KIND_STROKE[c.kind].label.toLowerCase()})</span></p>)}
    </div>
  );
}

/**
 * La calificación día a día con los cambios encima: ver si una subida coincide con algo
 * que hizo la marca, con algo de afuera, o con nada.
 */
export function ScoreHistory({ points, changes, dimensions, meta }: Props) {
  const [series, setSeries] = useState("overall");
  const [picked, setPicked] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("day");
  const gid = `score-${useId().replace(/:/g, "")}`;
  const valueOf = (p: HistoryPoint, key: string) => (key === "overall" ? p.overall : p.dimensions[key] ?? null);
  const lastDay = points[points.length - 1]?.date ?? "";
  // Día = cada calificación guardada; los demás periodos promedian esos días (sin huecos: un área sin datos vale 0).
  const shownPoints: PeriodPoint[] = period === "day" ? points.map((p) => ({ ...p, days: 1, inProgress: false })) : aggregate(points, period, lastDay);
  const data = shownPoints.map((p) => ({ date: p.date, value: valueOf(p, series) }));
  const dateText = (d: string) => (period === "day" ? formatShortDate(d) : bucketLabel(d, period));
  const current = shownPoints.find((p) => p.date === date);
  // El día que se explica: el que se tocó en la gráfica o, por defecto, el más reciente con nota.
  const lastDated = [...data].reverse().find((d) => d.value !== null);
  const date = picked && data.some((d) => d.date === picked) ? picked : lastDated?.date ?? data[data.length - 1]?.date;
  const shown = data.find((d) => d.date === date)?.value ?? null;
  // El color sigue a la nota del día elegido: verde ≥ 75, ámbar ≥ 45, rojo debajo (mismas bandas que las tarjetas).
  const tone = toneFor(shown);
  const explanation = date ? explainChange(shownPoints, date, series, meta, { previousPoint: period !== "day" }) : null;
  const seriesLabel = series === "overall" ? "General" : dimensions.find((d) => d.id === series)?.label ?? series;
  const visible = changes.filter((c) => series === "overall" || c.area === "general" || c.area === series);
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
  // Cada pestaña lleva su nota del día elegido: cambiar de área no obliga a buscarla abajo.
  const noteOn = (key: string) => {
    const p = shownPoints.find((x) => x.date === date);
    const v = p ? valueOf(p, key) : null;
    return v === null ? "–" : formatNumber(v);
  };
  const items = [{ key: "overall", label: "General", meta: noteOn("overall") }, ...dimensions.map((d) => ({ key: d.id, label: d.label, meta: noteOn(d.id) }))];

  if (points.length < 2) {
    return <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">La gráfica aparece cuando haya al menos dos días de calificación guardada. Se guarda una por día.</p>;
  }
  return (
    <div className="space-y-4 rounded-2xl bg-card p-5">
      <Segmented items={PERIODS.map((p) => ({ key: p, label: PERIOD_LABEL[p] }))} value={period} onChange={(p) => { setPeriod(p); setPicked(null); }} label="Periodo" size="sm" />
      <Segmented items={items} value={series} onChange={setSeries} label="Qué calificación ver" size="sm" />
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3" aria-live="polite">
        <div>
          <p className="font-mono text-[11px] uppercase text-muted-foreground">{seriesLabel} · {date ? dateText(date) : ""}{period !== "day" && current ? ` · promedio de ${current.days} ${current.days === 1 ? "día" : "días"}${current.inProgress ? ", en curso" : ""}` : ""}</p>
          <p className="font-display text-6xl leading-none tabular-nums" style={{ color: shown === null ? "var(--muted-foreground)" : tone }}>
            {shown === null ? "–" : formatNumber(shown)}<span className="ml-1 align-top text-2xl text-muted-foreground">/100</span>
          </p>
          {shown === 0 && series !== "overall" && <p className="mt-1 max-w-[40ch] text-xs text-muted-foreground">Vale 0: o está en rojo en todo, o no hubo datos suficientes para medirla.</p>}
        </div>
        {explanation && explanation.previousDate && (
          <div className="min-w-0 max-w-[60ch] flex-1 space-y-1.5 text-sm">
            <p>
              {explanation.delta === null
                ? <span className="text-muted-foreground">Sin nota comparable con {dateText(explanation.previousDate)}.</span>
                : explanation.delta === 0
                  ? <span className="text-muted-foreground">Igual que {dateText(explanation.previousDate)} ({formatNumber(explanation.previousValue as number)}).</span>
                  : <><span className={explanation.delta > 0 ? "font-medium text-good-ink" : "font-medium text-bad-ink"}>{explanation.delta > 0 ? "Mejoró" : "Empeoró"} {formatNumber(Math.abs(explanation.delta), 1)} puntos</span> <span className="text-muted-foreground">desde {dateText(explanation.previousDate)} ({formatNumber(explanation.previousValue as number)}).</span></>}
            </p>
            {explanation.drivers.length > 0
              ? <ul className="space-y-0.5">
                  {explanation.drivers.map((d) => (
                    <li key={d.label} className="flex gap-2"><span aria-hidden className={DIRECTION_CLASS[d.direction]}>{DIRECTION_MARK[d.direction]}</span><span><span className="font-medium">{d.label}</span> <span className="text-muted-foreground">{d.change}</span></span></li>
                  ))}
                </ul>
              : <p className="text-xs text-muted-foreground">Ninguna métrica cambió de color en ese lapso.</p>}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Toca un punto de la gráfica para ver su nota y qué la movió. Semana, mes, Q, semestre y año son el promedio de sus días.</p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }} style={{ cursor: "pointer" }}
            onClick={(e) => { if (e?.activeLabel) setPicked(String(e.activeLabel)); }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
                <stop offset="100%" stopColor={tone} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateText} minTickGap={28} {...axis} />
            <YAxis width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
            <Tooltip content={<TooltipBox changes={visible} period={period} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            {date && <ReferenceLine x={date} stroke={tone} strokeWidth={2} />}
            {visible.map((c) => (
              <ReferenceLine key={c.id} x={bucketStart(c.date, period)} stroke={KIND_STROKE[c.kind].stroke} strokeDasharray={KIND_STROKE[c.kind].dash} strokeWidth={1}
                label={{ value: `#${c.n}`, position: "top", fontSize: 10, fill: "var(--muted-foreground)" }} />
            ))}
            <Area type="monotone" dataKey="value" stroke={tone} strokeWidth={2.25} fill={`url(#${gid})`} fillOpacity={1} dot={{ r: 2.5, strokeWidth: 0, fill: tone }} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: tone }} />Calificación (0 a 100; el color sigue a la nota del día elegido). Un área sin datos suficientes vale 0, no deja huecos</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0 border-l border-foreground" />{KIND_STROKE.propio.label}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0 border-l border-dashed border-muted-foreground" />{KIND_STROKE.externo.label}</li>
      </ul>
    </div>
  );
}
