import { cn } from "@/lib/utils";

type Tone = "good" | "watch" | "bad" | "neutral";
const FILL: Record<Tone, string> = { good: "bg-good", watch: "bg-warn", bad: "bg-bad", neutral: "bg-foreground/70" };

/** Barra de avance hacia una meta (0-100). La anima solo transform, nunca el ancho. */
export function Progress({ value, tone = "neutral", label, className }: { value: number; tone?: Tone; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-background", className)}>
      <div className={cn("h-full w-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none", FILL[tone])} style={{ transform: `scaleX(${v / 100})` }} />
    </div>
  );
}
