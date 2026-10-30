"use client";

import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/i18n/client";
import { isTechnical } from "@/lib/nav/guide";
import { cn } from "@/lib/utils";

type Props = { href: string; label: string; className?: string };

/** «⋯» de una sección: qué vas a ver ahí y para qué te sirve, y si es técnica. */
export function SectionInfo({ href, label, className = "" }: Props) {
  const t = useT();
  const g = t.guide;
  const item = g.items[href];
  if (!item) return null;
  return (
    <Popover>
      <PopoverTrigger aria-label={`${g.more}: ${label}`} title={g.more}
        className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground data-[popup-open]:bg-background data-[popup-open]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className="w-72 space-y-3 rounded-2xl p-4 text-sm">
        <p className="flex items-center justify-between gap-2 font-medium">
          {label}
          {isTechnical(href) && <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{g.technical}</span>}
        </p>
        <div><p className="font-mono text-[10px] uppercase text-muted-foreground">{g.see}</p><p className="mt-1">{item.what}</p></div>
        <div><p className="font-mono text-[10px] uppercase text-muted-foreground">{g.use}</p><p className="mt-1">{item.use}</p></div>
        {isTechnical(href) && <p className="text-xs text-muted-foreground">{g.technicalHint}</p>}
      </PopoverContent>
    </Popover>
  );
}
