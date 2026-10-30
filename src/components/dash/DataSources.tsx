import { Check, Circle } from "lucide-react";
import { getSource } from "@/sources/registry";
import { SOURCE_LABELS, type SourceId } from "@/sources/contract";

type Item = SourceId | { label: string; on: boolean };
type Props = { intro: string; items: readonly Item[] };

/**
 * «De dónde sale esto»: las secciones que mezclan fuentes (Negocio, CRM, Estrategia)
 * dicen cuáles usan y cuáles están conectadas, para saber qué tan completo es lo que ves.
 */
export function DataSources({ intro, items }: Props) {
  const rows = items.map((it) => (typeof it === "string" ? { label: SOURCE_LABELS[it], on: Boolean(getSource(it)?.isConfigured()) } : it));
  return (
    <section aria-label="De dónde salen estos datos" className="space-y-2 rounded-2xl bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{intro}</p>
      <ul className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <li key={r.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${r.on ? "bg-background text-foreground" : "bg-background/50 text-muted-foreground"}`}>
            {r.on ? <Check className="h-3 w-3 text-good-ink" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
            {r.label}<span className="sr-only">{r.on ? " (conectada)" : " (sin conectar)"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
