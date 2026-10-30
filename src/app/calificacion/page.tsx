import { SectionInfo } from "@/components/layout/SectionInfo";
import { getMessages } from "@/i18n/server";
import { loadDashboardState } from "@/lib/dashboard";
import { MockNotice, StateNotice } from "@/components/layout/StateNotice";
import { ScoreHeadline } from "@/components/scorecard/ScoreHeadline";
import { MetricItem } from "@/components/scorecard/MetricItem";
import { BandBadge, scoreBand } from "@/components/scorecard/BandBadge";
import { formatNumber } from "@/lib/format";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import { handoffFromScorecard, pointsIfGreen } from "@/lib/handoff/from-panel";
import { ChangeLogSection } from "@/components/scorecard/ChangeLogSection";
import { AreaGrid, type AreaEntry } from "@/components/scorecard/AreaGrid";
import { DIMENSION_EXPLAIN } from "@/lib/scorecard/explain";
import type { MetricResult } from "@/lib/scorecard/types";

export const dynamic = "force-dynamic";

const BAND_COLOR: Record<string, string> = { green: "var(--good)", yellow: "var(--warn)", red: "var(--bad)", none: "var(--muted-foreground)" };

/** Cuántas métricas están bien, por mejorar, por atender o sin datos. */
function tally(metrics: readonly MetricResult[]) {
  const scored = metrics.filter((m) => m.status === "scored");
  return {
    good: scored.filter((m) => m.band === "green").length,
    meh: scored.filter((m) => m.band === "yellow").length,
    bad: scored.filter((m) => m.band === "red").length,
    none: metrics.length - scored.length,
  };
}

function Tally({ t }: { t: ReturnType<typeof tally> }) {
  const parts = [
    t.good && <span key="g" className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-good" />{t.good} bien</span>,
    t.meh && <span key="m" className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warn" />{t.meh} mejorable</span>,
    t.bad && <span key="b" className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-bad" />{t.bad} por atender</span>,
    t.none && <span key="n" className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{t.none} sin datos</span>,
  ].filter(Boolean);
  return <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{parts}</span>;
}

export default async function CalificacionPage() {
  const state = await loadDashboardState();
  const t = await getMessages();
  const title = t.pages["/calificacion"].title;
  if (state.kind !== "ok" || !state.data.firstDate) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl">{title}</h1>
        <StateNotice state={state} />
        <ChangeLogSection />
      </div>
    );
  }
  const { scorecard, isBaseline, hasMock, windowFrom, endDate } = state.data;
  const [overallHandoff, ...dimHandoffs] = await Promise.all([
    handoffFromScorecard(scorecard, endDate),
    ...scorecard.dimensions.map((d) => handoffFromScorecard(scorecard, endDate, d.definition.id)),
  ]);
  const skillNames = Object.fromEntries(Object.entries(t.skills.items).map(([id, s]) => [id, s.name]));
  const dims = scorecard.dimensions.map((dim, i) => {
    const metrics = scorecard.metrics.filter((m) => m.definition.dimension === dim.definition.id);
    // Lo que está peor arriba: primero atender, luego mejorable, luego bien, al final sin datos.
    const order = (m: MetricResult) => (m.status !== "scored" ? 3 : m.band === "red" ? 0 : m.band === "yellow" ? 1 : 2);
    return { dim, metrics: [...metrics].sort((a, b) => order(a) - order(b)), tally: tally(metrics), handoff: dimHandoffs[i] };
  });

  const areas: AreaEntry[] = dims.map(({ dim, metrics, tally: tl, handoff }) => {
    const ex = DIMENSION_EXPLAIN[dim.definition.id];
    const weak = metrics.some((m) => m.status === "scored" && m.band !== "green");
    return {
      id: dim.definition.id,
      title: dim.definition.label,
      card: (
        <>
          <span className="flex items-start justify-between gap-3">
            <span className="leading-snug"><span className="block font-medium">{dim.definition.label}</span><span className="font-mono text-[10px] uppercase text-muted-foreground">pesa {dim.definition.weight} de 100</span></span>
            <span className="font-display text-3xl leading-none tabular-nums">{dim.score === null ? "–" : formatNumber(dim.score)}</span>
          </span>
          <span className="line-clamp-3 text-xs text-muted-foreground">{ex.what}</span>
          {/* Barra de la nota con el color de su banda: se lee el estado sin leer el número. */}
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-background" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${dim.score ?? 0}%`, background: BAND_COLOR[scoreBand(dim.score) ?? "none"] }} />
          </span>
          <span className="mt-auto pt-1"><Tally t={tl} /></span>
        </>
      ),
      detail: (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase text-muted-foreground">Área · pesa {dim.definition.weight} de 100</p>
              <h2 className="font-display text-3xl leading-tight md:text-4xl">{dim.definition.label}</h2>
              <Tally t={tl} />
            </div>
            <span className="flex items-center gap-4">
              <BandBadge band={scoreBand(dim.score)} status={dim.score === null ? "no_data" : "scored"} />
              <span className="font-display text-5xl leading-none tabular-nums">{dim.score === null ? "–" : formatNumber(dim.score)}</span>
            </span>
          </div>
          <dl className="grid gap-4 rounded-xl bg-card p-4 text-sm md:grid-cols-3">
            <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">Qué es</dt><dd className="mt-1">{ex.what}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">Por qué importa</dt><dd className="mt-1">{ex.why}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase text-muted-foreground">Qué la sube</dt><dd className="mt-1">{ex.how}</dd></div>
          </dl>
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] uppercase text-muted-foreground">Métricas · lo que está peor, primero</h3>
            <ul className="divide-y divide-border">
              {metrics.map((m) => <MetricItem key={m.definition.id} metric={m} points={pointsIfGreen(m, scorecard)} skillNames={skillNames} />)}
            </ul>
          </div>
          {weak && <CopyForClaude payload={handoff} />}
          <p className="text-xs text-muted-foreground">{dim.definition.question}</p>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-14">
      {hasMock && <MockNotice />}
      <header className="space-y-5">
        <div className="flex items-center gap-2"><h1 className="font-display text-4xl md:text-5xl">{title}</h1><SectionInfo href="/calificacion" label={title} className="h-8 w-8" /></div>
        <p className="max-w-[65ch] text-muted-foreground">
          Una nota de 0 a 100 de qué tan bien está funcionando tu marketing, en siete áreas. Cada métrica se compara con la industria
          o con una meta propia y queda en verde, amarillo o rojo. Toca cualquier área para ver qué la sube.
        </p>
        <ScoreHeadline overall={scorecard.overall} weightCoverage={scorecard.weightCoverage} dimensions={scorecard.dimensions} isBaseline={isBaseline} windowFrom={windowFrom} endDate={endDate} />
      </header>

      <ChangeLogSection />

      <section aria-labelledby="areas-h" className="space-y-4">
        <h2 id="areas-h" className="sr-only">Las siete áreas</h2>
        <AreaGrid areas={areas} />
      </section>

      <section aria-labelledby="ia-h" className="space-y-3">
        <div className="space-y-1">
          <h2 id="ia-h" className="font-display text-2xl md:text-3xl">Pásale lo pendiente a tu IA</h2>
          <p className="max-w-[65ch] text-sm text-muted-foreground">Elige dónde lo vas a trabajar, revisa qué acciones van (cada una con su evidencia) y copia. Al terminar, la IA te devuelve los cambios para pegarlos en la bitácora.</p>
        </div>
        <CopyForClaude payload={overallHandoff} className="max-w-3xl" defaultOpen />
      </section>

    </div>
  );
}
