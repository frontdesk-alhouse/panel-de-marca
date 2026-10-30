import { getMessages } from "@/i18n/server";
import { ws } from "@/lib/workspace/store";
import { pageGate, LoadError } from "@/lib/page-gate";
import { latestStrategy } from "@/lib/assistant/strategy";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import { handoffFromStrategy } from "@/lib/handoff/from-panel";
import { formatMoney } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { DataSources } from "@/components/dash/DataSources";
import { Card } from "@/components/dash/Funnel";
import { DataTable } from "@/components/dash/DataTable";
import { StrategyForm } from "@/components/assistant/StrategyForm";
import { BudgetBar, FunnelTabs, PlanSteps, PlaybookTabs } from "@/components/assistant/StrategyView";

export const dynamic = "force-dynamic";

/**
 * Lectura en capas (Apple: lo común primero, el detalle un nivel abajo):
 * apuesta y metas → dónde estamos → embudo por etapa → dinero → plan → medición → guía.
 * Nada de columnas angostas con párrafos: textos cortos a ancho legible (≤ 65 caracteres).
 */
export default async function EstrategiaPage() {
  const msg = await getMessages();
  const TITLE = msg.pages["/estrategia"].title;
  const gate = await pageGate(TITLE, "/estrategia");
  if (gate) return gate;
  let latest;
  try { latest = await latestStrategy(); } catch (e) { console.error("[estrategia]", e); return <LoadError title={TITLE} />; }
  const s = latest?.strategy;
  const handoff = s ? await handoffFromStrategy(s, latest!.creado) : null;
  const total = s ? s.presupuesto.totalMensualMxn || s.presupuesto.reparto.reduce((t, r) => t + r.mxn, 0) : 0;

  return (
    <div className="space-y-10">
      <SectionHeader title={TITLE} question={msg.pages["/estrategia"].question(ws().brand.name)} path="/estrategia" />
      <DataSources intro="Claude arma esta estrategia leyendo todo el panel: tráfico, SEO, anuncios, redes, competencia, CRM y la calificación, más el contexto de la marca. Entre más fuentes conectadas, mejor la propuesta." items={["ga4", "gsc", "gads", "meta", "instagram", "clarity", "comp", "serp", { label: "CRM del panel", on: true }, { label: "Contexto de la marca", on: true }]} />
      <StrategyForm hasStrategy={Boolean(s)} />
      {!s ? <p className="text-sm text-muted-foreground">Todavía no hay estrategia. Genera la primera: tarda 2-3 minutos.</p> : (
        <>
          <section aria-labelledby="apuesta-h" className="space-y-6">
            <div className="space-y-3">
              <p className="font-mono text-[11px] uppercase text-muted-foreground">La apuesta · generada el {latest!.creado.toISOString().slice(0, 10)}</p>
              <h2 id="apuesta-h" className="max-w-[24ch] font-display text-3xl leading-[1.05] tracking-[-0.02em] md:text-5xl">{s.titular}</h2>
              <p className="max-w-[65ch] text-muted-foreground">{s.objetivo90Dias}</p>
            </div>
            {handoff && <CopyForClaude payload={handoff} className="max-w-xl" />}
            <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))]">
              <div className="rounded-2xl bg-card p-4">
                <dt className="font-mono text-[11px] uppercase text-muted-foreground">Inversión al mes</dt>
                <dd className="mt-1 font-display text-3xl tabular-nums">{formatMoney(total)}</dd>
              </div>
              {s.metas90.map((m) => (
                <div key={m.indicador} className="rounded-2xl bg-card p-4">
                  <dt className="font-mono text-[11px] uppercase text-muted-foreground">{m.indicador} · día 90</dt>
                  <dd className="mt-1 font-display text-3xl tabular-nums">{m.valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card id="diagnostico" title="Dónde estamos">
              <ul className="divide-y divide-border">{s.diagnostico.map((d) => <li key={d} className="py-2.5 text-sm max-w-[65ch]">{d}</li>)}</ul>
            </Card>
            <Card id="posicionamiento" title="Lo que todo debe decir">
              <p className="text-lg font-medium leading-snug max-w-[45ch]">{s.posicionamiento.mensajeCentral}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Para quién</p>
                  <ul className="mt-2 space-y-1.5 text-sm">{s.posicionamiento.publicos.map((p) => <li key={p}>{p}</li>)}</ul></div>
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Cómo lo probamos</p>
                  <ul className="mt-2 space-y-1.5 text-sm">{s.posicionamiento.pruebas.map((p) => <li key={p}>{p}</li>)}</ul></div>
              </div>
            </Card>
          </div>

          <Card id="embudo" title="El embudo, una etapa a la vez" note="De que nos conozcan a que nos escriban. Elige la etapa.">
            <FunnelTabs embudo={s.embudo} />
          </Card>

          <Card id="presupuesto" title={`Dónde va el dinero: ${formatMoney(total)} al mes`} note="Toca un canal para ver por qué.">
            <BudgetBar presupuesto={s.presupuesto} />
          </Card>

          <Card id="plan" title="Plan de 90 días" note="Elige la fase para ver sus acciones.">
            <PlanSteps plan={s.plan90Dias} />
          </Card>

          <Card id="kpis" title="Cómo se mide" note="Metas por etapa y de dónde sale cada dato.">
            <DataTable caption="KPIs del plan" rows={s.medicion.kpis.map((k, i) => ({ id: String(i), kpi: k.kpi, etapa: k.etapa, meta: k.meta, fuente: k.fuente }))} columns={[
              { key: "kpi", label: "KPI", type: "text" }, { key: "etapa", label: "Etapa", type: "text" },
              { key: "meta", label: "Meta", type: "text" }, { key: "fuente", label: "Fuente", type: "text", hideOnMobile: true },
            ]} />
            {s.medicion.huecos.length > 0 && (
              <details className="group mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Lo que falta medir · {s.medicion.huecos.length}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm max-w-[65ch]">{s.medicion.huecos.map((h) => <li key={h}>{h}</li>)}</ul>
              </details>
            )}
          </Card>

          <Card id="guia" title="Cómo decidir sobre la marcha">
            <PlaybookTabs s={s} />
          </Card>
        </>
      )}
    </div>
  );
}
