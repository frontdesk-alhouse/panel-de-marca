import { AlertTriangle, ChevronDown, CircleCheck, Eye } from "lucide-react";
import type { Insight, Tone } from "@/lib/analytics/insights";

export const TONE: Record<Tone, { label: string; Icon: typeof CircleCheck; color: string }> = {
  bad: { label: "Atender", Icon: AlertTriangle, color: "text-bad" },
  watch: { label: "Vigilar", Icon: Eye, color: "text-warn" },
  good: { label: "Va bien", Icon: CircleCheck, color: "text-good" },
};

/** Hallazgos pegados a una gráfica: una línea cada uno; el porqué se despliega. */
export function InsightCallouts({ insights }: { insights?: Insight[] }) {
  if (!insights?.length) return null;
  return (
    <ul className="space-y-1.5">
      {insights.map((i) => {
        const { Icon, color, label } = TONE[i.tone];
        const head = (
          <span className="flex items-start gap-2 text-sm leading-snug">
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} aria-label={label} strokeWidth={1.75} />
            <span className="font-medium">{i.title}</span>
          </span>
        );
        return (
          <li key={i.title} className="rounded-lg bg-background px-3 py-2">
            {i.detail ? (
              <details className="group">
                <summary className="flex items-start justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  {head}
                  <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
                </summary>
                <p className="text-sm text-muted-foreground leading-snug mt-1.5 pl-6">{i.detail}</p>
              </details>
            ) : head}
          </li>
        );
      })}
    </ul>
  );
}
