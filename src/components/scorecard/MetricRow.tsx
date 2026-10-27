import type { MetricResult } from "@/lib/scorecard/types";
import { formatBands, formatMetric, formatNumber } from "@/lib/format";
import { BandBadge } from "./BandBadge";

export function MetricRow({ metric }: { metric: MetricResult }) {
  const def = metric.definition;
  const showLever = metric.status === "scored" && metric.band !== "green";
  return (
    <li id={def.id} className="scroll-mt-6 grid gap-x-8 gap-y-2 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] border-b border-border last:border-b-0">
      <div className="space-y-1">
        <h3 className="font-medium">{def.label}</h3>
        <p className="font-display text-3xl leading-tight">{formatMetric(def.unit, metric.value)}</p>
        <BandBadge band={metric.band} status={metric.status} />
      </div>
      <div className="space-y-2 text-sm">
        <p>{formatBands(def)}{metric.sample !== undefined && def.minSample !== undefined && (
          <span className="text-muted-foreground"> (muestra {formatNumber(metric.sample)}, mínimo {formatNumber(def.minSample)})</span>
        )}</p>
        <p className="text-muted-foreground">
          {def.own && !def.source.startsWith("Umbral propio") ? "Umbral propio. " : def.own ? "" : "Fuente: "}{def.source}. {def.asOf}.
        </p>
        {showLever && <p><span className="font-medium">Qué hacer: </span>{def.lever}.</p>}
      </div>
    </li>
  );
}
