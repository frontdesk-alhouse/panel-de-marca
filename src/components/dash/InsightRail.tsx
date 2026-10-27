import { ChevronDown } from "lucide-react";
import type { Insight, Tone } from "@/lib/analytics/insights";
import { TONE } from "./InsightCallouts";

const ORDER: Tone[] = ["bad", "watch", "good"];

function Counts({ insights }: { insights: Insight[] }) {
  return (
    <span className="flex flex-wrap gap-3 text-xs">
      {ORDER.map((t) => {
        const { Icon, color, label } = TONE[t];
        return <span key={t} className="inline-flex items-center gap-1"><Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden />{insights.filter((i) => i.tone === t).length} {label.toLowerCase()}</span>;
      })}
    </span>
  );
}

function List({ insights }: { insights: Insight[] }) {
  return (
    <div className="space-y-4 pt-3">
      {ORDER.map((t) => {
        const items = insights.filter((i) => i.tone === t);
        if (!items.length) return null;
        const { Icon, color, label } = TONE[t];
        return (
          <div key={t} className="space-y-1.5">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground"><Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden />{label}</p>
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.title}>
                  <a href={i.anchor ? `#${i.anchor}` : undefined} className="block rounded-md px-2 py-1.5 -mx-2 text-sm leading-snug hover:bg-background transition">
                    {i.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Panel({ insights, open }: { insights: Insight[]; open: boolean }) {
  return (
    <details open={open} className="group rounded-xl bg-card p-4">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="space-y-1.5">
          <span className="block font-mono text-[11px] uppercase text-muted-foreground">Hallazgos de la sección</span>
          <Counts insights={insights} />
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>
      <List insights={insights} />
    </details>
  );
}

/**
 * Contenido + barra lateral de hallazgos. En pantalla grande la barra queda fija
 * a la derecha (abierta, se puede plegar); en pantallas chicas va arriba, plegada.
 */
export function WithRail({ insights, children }: { insights: Insight[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start">
      <div className="xl:hidden"><Panel insights={insights} open={false} /></div>
      <div className="space-y-8 min-w-0">{children}</div>
      <aside aria-label="Hallazgos" className="hidden xl:block sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <Panel insights={insights} open />
      </aside>
    </div>
  );
}
