import Link from "next/link";
import { PERIOD_OPTIONS, type PeriodDays } from "@/lib/analytics/period";
import { cn } from "@/lib/utils";

/** Periodo en la URL (?p=): se puede compartir y sobrevive al recargar. */
export function PeriodPicker({ path, active }: { path: string; active: PeriodDays }) {
  return (
    <nav aria-label="Periodo" className="inline-flex rounded-md bg-card p-0.5">
      {PERIOD_OPTIONS.map((d) => (
        <Link
          key={d}
          href={`${path}?p=${d}`}
          aria-current={d === active ? "true" : undefined}
          className={cn(
            "h-7 inline-flex items-center rounded-[5px] px-3 font-mono text-[11px] uppercase transition",
            d === active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {d} días
        </Link>
      ))}
    </nav>
  );
}
