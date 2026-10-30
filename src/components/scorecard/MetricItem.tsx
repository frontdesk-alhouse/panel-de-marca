import Link from "next/link";
import { ChevronDown, Puzzle } from "lucide-react";
import type { MetricResult } from "@/lib/scorecard/types";
import { formatBands, formatMetric, formatNumber } from "@/lib/format";
import { skillsForMetric } from "@/lib/skills/catalog";
import { BandBadge } from "./BandBadge";

type Props = { metric: MetricResult; points?: number; skillNames: Record<string, string> };

/**
 * Una métrica, siempre con la misma forma: nombre, valor y estado a la vista; meta, de
 * dónde sale y qué hacer al abrirla. Así la calificación se lee igual en cada dimensión.
 */
export function MetricItem({ metric, points, skillNames }: Props) {
  const def = metric.definition;
  const isWeak = metric.status === "scored" && metric.band !== "green";
  const skills = isWeak ? skillsForMetric(def) : [];
  return (
    <li id={def.id} className="scroll-mt-6">
      <details className="group/metric">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 text-sm">{def.label}</span>
          <span className="flex items-center gap-3">
            <span className="font-display text-lg tabular-nums">{formatMetric(def.unit, metric.value)}</span>
            <BandBadge band={metric.band} status={metric.status} />
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/metric:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        <div className="space-y-2 pb-4 text-sm">
          <p><span className="text-muted-foreground">Meta: </span>{formatBands(def)}
            {metric.sample !== undefined && def.minSample !== undefined && <span className="text-muted-foreground"> (muestra {formatNumber(metric.sample)}, mínimo {formatNumber(def.minSample)})</span>}
          </p>
          <p className="text-muted-foreground">{def.own ? "Umbral propio (se ajusta con tu línea base)" : "Benchmark de industria"}: {def.source}. {def.asOf}.</p>
          {isWeak && (
            <p className="rounded-lg bg-background p-3">
              <span className="font-medium">Qué hacer: </span>{def.lever}.
              {points ? <span className="text-muted-foreground"> Si llega a verde, la calificación general puede subir hasta +{points} pts.</span> : null}
            </p>
          )}
          {metric.status !== "scored" && (
            <p className="text-muted-foreground">No cuenta en la calificación hasta que tenga datos suficientes; su peso se reparte entre las demás.</p>
          )}
          {skills.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">Te ayuda:
              {skills.map((id) => (
                <Link key={id} href={`/skills#${id}`} className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-foreground hover:bg-primary hover:text-primary-foreground">
                  <Puzzle className="h-3 w-3" aria-hidden />{skillNames[id] ?? id}
                </Link>
              ))}
            </p>
          )}
        </div>
      </details>
    </li>
  );
}
