import { AlertTriangle, CircleCheck, CircleMinus, CircleDashed } from "lucide-react";
import type { Band, MetricStatus } from "@/lib/scorecard/types";
import { STATUS_TEXT } from "@/lib/format";

const BAND: Record<Band, { label: string; Icon: typeof CircleCheck; color: string }> = {
  green: { label: "Bien", Icon: CircleCheck, color: "text-good" },
  yellow: { label: "Mejorable", Icon: CircleMinus, color: "text-warn" },
  red: { label: "Atender", Icon: AlertTriangle, color: "text-bad" },
};

/** El color va en el ícono; el texto siempre en tinta normal (nunca solo color). */
export function BandBadge({ band, status }: { band?: Band; status: MetricStatus }) {
  if (status !== "scored" || !band) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
        <CircleDashed className="h-4 w-4 shrink-0" aria-hidden strokeWidth={1.75} />
        {STATUS_TEXT[status as Exclude<MetricStatus, "scored">]}
      </span>
    );
  }
  const { label, Icon, color } = BAND[band];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
      <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden strokeWidth={1.75} />
      {label}
    </span>
  );
}

export function scoreBand(score: number | null): Band | undefined {
  if (score === null) return undefined;
  return score >= 75 ? "green" : score >= 45 ? "yellow" : "red";
}
