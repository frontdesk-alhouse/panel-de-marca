import { useId } from "react";
import {
  Activity, ArrowDownRight, ArrowDownToLine, ArrowUpRight, BadgeDollarSign, Eye, Factory, Flame, Gauge, Heart, Inbox, ListOrdered,
  LogOut, MousePointerClick, Percent, Radio, Repeat, Timer, Undo2, User, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { formatSignedPct } from "@/lib/format";
import type { KpiRefs, Ref } from "@/lib/analytics/refs";
import type { GlossaryKey } from "@/lib/analytics/glossary";
import { MetricTip } from "./MetricTip";

interface Props {
  label: string;
  value: string;
  current?: number | null;
  previous?: number | null;
  /** Subir es bueno (true) o malo (false, p. ej. rebote o costo) */
  higherIsBetter?: boolean;
  hint?: string;
  spark?: number[];
  /** false si el periodo anterior tiene muy pocos datos para comparar */
  comparable?: boolean;
  /** Estándar de la industria y tu propio estándar */
  refs?: KpiRefs;
  /** Entrada del glosario: explica la métrica al pasar el cursor */
  term?: GlossaryKey;
  /** Ícono de la métrica, arriba a la derecha */
  icon?: LucideIcon;
}

/** Ícono por tipo de métrica: cada KPI del panel lleva el suyo sin tener que pasarlo. */
const TERM_ICON: Partial<Record<GlossaryKey, LucideIcon>> = {
  sessions: Users, new_visitors: UserPlus, engagement_rate: Activity, avg_engagement_time: Timer, bounce_rate: LogOut,
  scroll_depth: ArrowDownToLine, leads: Inbox, conversion_rate: Percent, clicks: MousePointerClick, impressions: Eye, ctr: Percent,
  avg_position: ListOrdered, paid_share: Percent, lcp: Gauge, performance: Gauge, page_views: Eye, reach: Radio, ig_engagement: Heart,
  frequency: Repeat, cpl: BadgeDollarSign, rage_clicks: Flame, dead_clicks: MousePointerClick, quickbacks: Undo2,
  scroll_depth_clarity: ArrowDownToLine, active_time: Timer,
};

const TONE_DOT: Record<NonNullable<Ref["tone"]>, string> = { good: "bg-good", watch: "bg-warn", bad: "bg-bad", neutral: "bg-muted-foreground/50" };
const TONE_WORD: Record<NonNullable<Ref["tone"]>, string> = { good: "Bien", watch: "Mejorable", bad: "Atender", neutral: "" };

function RefLine({ icon: Icon, who, r }: { icon: typeof User; who: string; r: Ref }) {
  const tone = r.tone ?? "neutral";
  return (
    <p className="flex items-start gap-1.5 text-xs leading-snug" title={r.source}>
      <Icon className="h-3.5 w-3.5 mt-px shrink-0 text-muted-foreground" aria-hidden />
      <span>
        <span className="text-muted-foreground">{who}: </span>
        {tone !== "neutral" && (
          <span className="inline-flex items-center gap-1 mr-1 font-medium"><span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden />{TONE_WORD[tone]}.</span>
        )}
        {r.text}
      </span>
    </p>
  );
}

/** Mini tendencia con degradado bajo la curva; el color dice si va bien (verde), mal (rojo) o sin juicio (azul). */
function Sparkline({ values, tone = "neutral" }: { values: number[]; tone?: "good" | "bad" | "neutral" }) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 28;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / max) * (h - 2) - 1] as const);
  const line = xy.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const color = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--series-1)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Cifra con su cambio contra el periodo anterior y la tendencia diaria. */
export function Kpi({ label, value, current, previous, higherIsBetter = true, hint, spark, comparable = true, refs, term, icon }: Props) {
  const Icon = icon ?? (term ? TERM_ICON[term] : undefined);
  const change = comparable && current != null && previous != null && previous > 0 ? (current - previous) / previous : null;
  const up = (change ?? 0) >= 0;
  const good = up === higherIsBetter;
  return (
    <div className="rounded-xl bg-card p-4 md:p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{term ? <MetricTip term={term}>{label}</MetricTip> : label}</p>
        {Icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground"><Icon className="h-4 w-4" aria-hidden /></span>}
      </div>
      <p className="font-display text-3xl md:text-4xl leading-none">{value}</p>
      {refs ? (
        <div className="space-y-1.5 pt-1">
          <RefLine icon={Factory} who="Industria" r={refs.industry ?? { text: "Sin estándar confiable para esta cifra", tone: "neutral" }} />
          <RefLine icon={User} who="Tuyo" r={refs.own} />
        </div>
      ) : (
      <p className="text-xs flex items-center gap-1 min-h-4">
        {change === null ? (
          <span className="text-muted-foreground">Sin periodo previo comparable</span>
        ) : (
          <>
            {up ? <ArrowUpRight className={`h-3.5 w-3.5 ${good ? "text-good" : "text-bad"}`} aria-hidden /> : <ArrowDownRight className={`h-3.5 w-3.5 ${good ? "text-good" : "text-bad"}`} aria-hidden />}
            {formatSignedPct(change)} vs periodo anterior
          </>
        )}
      </p>
      )}
      {spark && <Sparkline values={spark} tone={change === null ? "neutral" : good ? "good" : "bad"} />}
      {hint && <p className="font-mono text-[10px] uppercase text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function KpiRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{children}</div>;
}
