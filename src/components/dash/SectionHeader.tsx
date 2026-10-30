import { SectionInfo } from "@/components/layout/SectionInfo";
import type { Period } from "@/lib/analytics/period";
import { PeriodPicker } from "./PeriodPicker";

export function SectionHeader({ title, question, path, period }: { title: string; question: string; path: string; period?: Period }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2"><h1 className="font-display text-4xl md:text-5xl leading-none">{title}</h1><SectionInfo href={path} label={title} className="h-8 w-8" /></div>
        <p className="text-muted-foreground max-w-[60ch]">{question}</p>
      </div>
      {period && (
        <div className="space-y-1 text-right">
          <PeriodPicker path={path} active={period.days} />
          <p className="font-mono text-[10px] uppercase text-muted-foreground">{period.current.from} a {period.current.to}</p>
        </div>
      )}
    </header>
  );
}
