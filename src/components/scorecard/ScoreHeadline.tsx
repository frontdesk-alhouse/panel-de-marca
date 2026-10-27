import { formatNumber, formatPct } from "@/lib/format";

interface Props {
  overall: number | null;
  coverage: number;
  isBaseline: boolean;
  windowFrom: string;
  endDate: string;
}

/** Cifra protagonista: calificación general con su cobertura y periodo. */
export function ScoreHeadline({ overall, coverage, isBaseline, windowFrom, endDate }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
      <p className="font-display leading-[0.9] text-[clamp(4.5rem,11vw,8.5rem)] tracking-tight text-foreground">
        {overall === null ? "-" : formatNumber(overall)}
        <span className="text-[0.3em] text-muted-foreground align-top ml-1.5">/100</span>
      </p>
      <div className="pb-3 space-y-1 text-sm text-muted-foreground max-w-[34ch]">
        <p>
          Calificada sobre el {formatPct(coverage, 0)} de las métricas.
          {isBaseline && " Es línea base: todavía no hay dos periodos completos para comparar."}
        </p>
        <p>Del {windowFrom} al {endDate}.</p>
      </div>
    </div>
  );
}
