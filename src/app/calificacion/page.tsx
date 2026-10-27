import { getMessages } from "@/i18n/server";
import { loadDashboardState } from "@/lib/dashboard";
import { MockNotice, StateNotice } from "@/components/layout/StateNotice";
import { ScoreHeadline } from "@/components/scorecard/ScoreHeadline";
import { MetricRow } from "@/components/scorecard/MetricRow";
import { BandBadge, scoreBand } from "@/components/scorecard/BandBadge";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CalificacionPage() {
  const state = await loadDashboardState();
  const title = (await getMessages()).pages["/calificacion"].title;
  if (state.kind !== "ok" || !state.data.firstDate) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl">{title}</h1>
        <StateNotice state={state} />
      </div>
    );
  }
  const { scorecard, isBaseline, hasMock, windowFrom, endDate } = state.data;

  return (
    <div className="space-y-14">
      {hasMock && <MockNotice />}
      <header className="space-y-4">
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        <p className="text-muted-foreground max-w-[65ch]">
          Cada métrica se compara con un benchmark de industria o con un umbral propio, y cae en verde, amarillo o rojo.
          Las que no tienen datos, muestra suficiente u objetivo propio no cuentan, y el peso se reparte entre las demás.
        </p>
        <ScoreHeadline
          overall={scorecard.overall} coverage={scorecard.coverage} isBaseline={isBaseline}
          windowFrom={windowFrom} endDate={endDate}
        />
      </header>

      {scorecard.dimensions.map((dim) => {
        const metrics = scorecard.metrics.filter((m) => m.definition.dimension === dim.definition.id);
        return (
          <section key={dim.definition.id} id={dim.definition.id} aria-labelledby={`${dim.definition.id}-h`} className="scroll-mt-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4 px-1">
              <div className="space-y-1">
                <h2 id={`${dim.definition.id}-h`} className="font-display text-2xl md:text-3xl">{dim.definition.label}</h2>
                <p className="text-sm text-muted-foreground">{dim.definition.question} Peso {dim.definition.weight} de 100.</p>
              </div>
              <div className="flex items-center gap-4">
                <BandBadge band={scoreBand(dim.score)} status={dim.score === null ? "no_data" : "scored"} />
                <span className="font-display text-4xl leading-none">{dim.score === null ? "-" : formatNumber(dim.score)}</span>
              </div>
            </div>
            <ul className="bg-card rounded-xl px-5 md:px-6">
              {metrics.map((m) => <MetricRow key={m.definition.id} metric={m} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
