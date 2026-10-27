"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pointValue, type TrendKind, type TrendSeries } from "@/lib/analytics/sections/comptrend-shared";
import { FACTORS } from "@/lib/analytics/seofactors";
import { formatNumber, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** El sitio propio siempre en rosa; cada competidor conserva su color en todas las vistas. */
const SELF_COLOR = "var(--series-5)";
const RIVAL_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-6)", "var(--series-7)", "var(--series-8)", "var(--series-9)", "var(--series-10)", "var(--series-11)", "var(--series-other)"];

const FACTOR_NOTES: Record<string, string> = {
  content: "Páginas publicadas, artículos, páginas por servicio o ciudad y qué tan reciente es lo último que publicaron.",
  authority: "Cuántos sitios distintos los enlazan y su puntaje de dominio. Google usa los enlaces para medir autoridad (PageRank).",
  local: "Perfil en Google Maps, calificación y número de reseñas. Pesa en búsquedas con ciudad.",
  technical: "Que Google pueda rastrear y entender el sitio: HTTPS, sitemap, indexable, canonical, descripción, schema, un solo H1, servicio en el título.",
  experience: "Performance móvil (Core Web Vitals). Google dice que ayuda cuando hay contenido parecido, pero no garantiza el primer lugar.",
  trust: "Páginas que generan confianza: quiénes son, contacto y proyectos.",
};

const KINDS: { key: TrendKind; label: string; note: string }[] = [
  { key: "strength", label: "Fuerza SEO", note: "Qué tan bien cumple cada sitio los factores que Google usa para ordenar resultados (0-100). Pesos: contenido 30, autoridad 25, local 15, técnico 15, velocidad 10, confianza 5." },
  { key: "visibility", label: "Visibilidad en Google", note: "El resultado: qué tan arriba sale cada estudio en tus 10 búsquedas objetivo. Lugar 1 en todas = 100; fuera del top 30 = 0." },
  ...FACTORS.map((f) => ({ key: f.key as TrendKind, label: `${f.label} · ${f.weight}`, note: FACTOR_NOTES[f.key] })),
];

function colorsFor(series: TrendSeries[]): Record<string, string> {
  let i = 0;
  return Object.fromEntries(series.map((s) => [s.domain, s.self ? SELF_COLOR : RIVAL_COLORS[i++ % RIVAL_COLORS.length]]));
}

interface TipProps { active?: boolean; label?: string; payload?: { dataKey: string; value: number | null; color: string }[]; names: Record<string, string> }
function Tip({ active, label, payload, names }: TipProps) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].filter((p) => p.value !== null && p.value !== undefined).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="rounded-lg bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs space-y-1 min-w-44">
      <p className="font-mono uppercase text-muted-foreground">{label ? formatShortDate(label) : ""}</p>
      {sorted.map((p, i) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-3 text-muted-foreground tabular-nums">{i + 1}</span><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{names[p.dataKey]}</span>
          <span className="tabular-nums font-medium">{formatNumber(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/** Línea por estudio con su calificación a lo largo del tiempo; la leyenda prende y apaga líneas. */
export function CompetitorTrend({ series, dates }: { series: TrendSeries[]; dates: string[] }) {
  const [kind, setKind] = useState<TrendKind>("strength");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const colors = colorsFor(series);
  const names = Object.fromEntries(series.map((s) => [s.domain, s.self ? `${s.name} (tú)` : s.name]));
  const data = dates.map((date, i) => ({ date, ...Object.fromEntries(series.map((s) => [s.domain, pointValue(s.points[i], kind)])) }));
  const hasData = data.some((row) => series.some((s) => (row as Record<string, unknown>)[s.domain] !== null));
  const legend = [...series].sort((a, b) => (pointValue(b.current, kind) ?? -1) - (pointValue(a.current, kind) ?? -1));
  const toggle = (d: string) => setHidden((prev) => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; });
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
  const active = KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Calificación" className="flex flex-wrap gap-0.5 rounded-md bg-background p-0.5 w-fit max-w-full">
        {KINDS.map((k) => (
          <button key={k.key} role="tab" aria-selected={k.key === kind} onClick={() => setKind(k.key)}
            className={cn("h-7 rounded-[5px] px-3 font-mono text-[11px] uppercase transition", k.key === kind ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{active.note}</p>

      {hasData ? (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} minTickGap={28} padding={{ left: 16, right: 16 }} {...axis} />
              <YAxis width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
              <Tooltip content={<Tip names={names} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
              {/* El sitio propio al final para que su línea quede encima. */}
              {[...series].sort((a, b) => Number(a.self) - Number(b.self)).filter((s) => !hidden.has(s.domain)).map((s) => (
                <Line key={s.domain} type="linear" dataKey={s.domain} name={names[s.domain]} stroke={colors[s.domain]} connectNulls
                  strokeWidth={s.self ? 3.5 : 2} strokeOpacity={s.self ? 1 : 0.85}
                  dot={{ r: s.self ? 5 : 3.5, fill: colors[s.domain], stroke: "var(--card)", strokeWidth: 1.5 }} activeDot={{ r: s.self ? 7 : 5 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          {kind === "visibility" ? "Las posiciones en Google llegan con la primera corrida de Apify (cada 3 días)."
            : kind === "authority" || kind === "local" ? kind === "local" ? "Google Maps se mide cada semana con Apify; llega con la primera corrida." : "Los enlaces se miden una vez al mes con Apify; llegan con la primera corrida."
            : "Aún no hay mediciones para este factor."}
        </p>
      )}

      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Estudios">
        {legend.map((s, i) => {
          const now = pointValue(s.current, kind);
          const start = pointValue(s.start, kind);
          const diff = now !== null && start !== null && s.start?.date !== s.current?.date ? now - start : null;
          const off = hidden.has(s.domain);
          return (
            <li key={s.domain}>
              <button onClick={() => toggle(s.domain)} aria-pressed={!off}
                className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition hover:bg-background", off && "opacity-40", s.self && "bg-background")}>
                <span className="w-4 font-mono text-[11px] text-muted-foreground tabular-nums">{now === null ? "–" : i + 1}</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[s.domain] }} />
                <span className={cn("min-w-0 flex-1 truncate", s.self && "font-semibold")}>{names[s.domain]}</span>
                <span className="tabular-nums font-medium">{now === null ? "sin dato" : formatNumber(now)}</span>
                {diff !== null && Math.abs(diff) >= 0.5 && (
                  <span className={cn("w-12 text-right text-xs tabular-nums", diff > 0 ? "text-good" : "text-bad")}>{diff > 0 ? "▲" : "▼"} {formatNumber(Math.abs(diff))}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Toca un estudio para ocultar o mostrar su línea. Cada punto es una medición; la línea se alarga con cada corrida.</p>
    </div>
  );
}
