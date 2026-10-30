import { formatNumber, formatPct } from "@/lib/format";
import type { DimensionResult } from "@/lib/scorecard/types";

interface Props {
  overall: number | null;
  /** Peso (0 a 1) de las áreas que sí se calificaron */
  weightCoverage: number;
  dimensions: readonly DimensionResult[];
  isBaseline: boolean;
  windowFrom: string;
  endDate: string;
}

/** Cifra protagonista: la calificación general y, sobre todo, de qué está hecha y qué falta. */
export function ScoreHeadline({ overall, weightCoverage, dimensions, isBaseline, windowFrom, endDate }: Props) {
  const rated = dimensions.filter((d) => d.score !== null);
  const pending = dimensions.filter((d) => d.score === null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="font-display leading-[0.9] text-[clamp(4.5rem,11vw,8.5rem)] tracking-tight text-foreground">
          {overall === null ? "–" : formatNumber(overall)}
          <span className="text-[0.3em] text-muted-foreground align-top ml-1.5">/100</span>
        </p>
        <div className="pb-3 space-y-1 text-sm text-muted-foreground max-w-[44ch]">
          {overall === null
            ? <p><strong className="font-medium text-foreground">Todavía no hay base para dar una nota.</strong> Solo hay datos suficientes en {rated.length} de {dimensions.length} áreas ({formatPct(weightCoverage, 0)} del peso) y hace falta al menos el 60 %. Una nota sobre tan poco sería engañosa.</p>
            : <p>Se califica con {rated.length} de {dimensions.length} áreas, que suman el {formatPct(weightCoverage, 0)} del peso. {pending.length > 0 && "Lo que falta no se da por bueno ni por malo: no cuenta hasta que haya datos."}</p>}
          {isBaseline && <p>Es línea base: todavía no hay dos periodos completos para comparar.</p>}
          <p>Del {windowFrom} al {endDate}.</p>
        </div>
      </div>
      <dl className="grid gap-4 text-sm md:grid-cols-2">
        <div className="space-y-1.5 rounded-xl bg-card p-4">
          <dt className="font-mono text-[11px] uppercase text-muted-foreground">Lo que sí se califica</dt>
          <dd>
            {rated.length === 0 ? <span className="text-muted-foreground">Ninguna área todavía.</span> : (
              <ul className="space-y-0.5">
                {rated.map((d) => <li key={d.definition.id} className="flex justify-between gap-3"><span>{d.definition.label}</span><span className="tabular-nums">{formatNumber(d.score as number)} <span className="text-xs text-muted-foreground">· {d.scored} de {d.total} métricas</span></span></li>)}
              </ul>
            )}
          </dd>
        </div>
        <div className="space-y-1.5 rounded-xl bg-card p-4">
          <dt className="font-mono text-[11px] uppercase text-muted-foreground">Lo que todavía no se puede calificar</dt>
          <dd>
            {pending.length === 0 ? <span className="text-muted-foreground">Todas las áreas tienen base suficiente.</span> : (
              <ul className="space-y-0.5">
                {pending.map((d) => (
                  <li key={d.definition.id} className="flex justify-between gap-3">
                    <span>{d.definition.label}</span>
                    <span className="text-xs text-muted-foreground">{d.scored} de {d.total} métricas con datos{d.partial !== null && ` · parcial ${formatNumber(d.partial)}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
