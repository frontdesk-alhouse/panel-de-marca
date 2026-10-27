"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY, type GlossaryKey } from "@/lib/analytics/glossary";

/** Nombre de métrica con explicación al pasar el cursor (o tocar en celular). */
export function MetricTip({ term, children }: { term: GlossaryKey; children?: React.ReactNode }) {
  const g = GLOSSARY[term];
  return (
    <Popover>
      <PopoverTrigger openOnHover delay={120} closeDelay={80}
        className="inline-flex items-center gap-1 text-left cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded-sm">
        {children ?? g.term}
        <Info className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 p-4 gap-3">
        <p className="font-medium">{g.term}</p>
        <dl className="space-y-2.5 text-sm">
          <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">Qué es</dt><dd className="leading-snug">{g.what}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">En qué impacta</dt><dd className="leading-snug">{g.impact}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">En qué fijarse</dt><dd className="leading-snug">{g.watch}</dd></div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
