import { getMessages } from "@/i18n/server";
import Link from "next/link";
import { pageGate, LoadError } from "@/lib/page-gate";
import { loadBusiness } from "@/lib/analytics/sections/business";
import type { BizMetric, BizStatus } from "@/lib/crm/business";
import type { GlossaryKey } from "@/lib/analytics/glossary";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { DataSources } from "@/components/dash/DataSources";
import { MetricTip } from "@/components/dash/MetricTip";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; note: string; keys: string[] }[] = [
  { title: "Conseguir clientes", note: "¿La inversión trae prospectos que sirven y se paga sola?", keys: ["qualified_rate", "cost_per_qualified_lead", "cac", "roas"] },
  { title: "Vender", note: "¿Cerramos lo que proponemos, a buen precio y rápido?", keys: ["win_rate", "proposal_win_rate", "avg_deal", "sales_cycle"] },
  { title: "Salud del negocio", note: "¿El ingreso es estable y no depende de un solo cliente?", keys: ["recurring_share", "client_concentration", "referral_rate"] },
];
const STATUS: Record<BizStatus, { dot: string; text: string }> = {
  good: { dot: "bg-good", text: "En meta" }, watch: { dot: "bg-warn", text: "Cerca" }, bad: { dot: "bg-bad", text: "Lejos de la meta" }, few: { dot: "bg-muted-foreground/40", text: "Pocos datos" }, nodata: { dot: "bg-muted-foreground/40", text: "Sin datos aún" },
};

function show(m: BizMetric) {
  if (m.value === null) return "-";
  if (m.format === "pct") return formatPct(m.value, 0);
  if (m.format === "mxn") return formatMoney(m.value);
  if (m.format === "days") return `${Math.round(m.value)} días`;
  if (m.format === "ratio") return `${m.value.toFixed(1)}×`;
  return formatNumber(m.value);
}

function BizTile({ m }: { m: BizMetric }) {
  const s = STATUS[m.status];
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-5">
      <p className="text-sm text-muted-foreground"><MetricTip term={m.key as GlossaryKey}>{m.label}</MetricTip></p>
      <p className="font-display text-3xl leading-none tabular-nums md:text-4xl">{show(m)}</p>
      <p className="flex items-center gap-1.5 text-xs"><span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden /><span className="font-medium">{s.text}</span><span className="text-muted-foreground">· meta {m.target}</span></p>
      <p className="mt-auto text-[11px] text-muted-foreground">{m.basis}</p>
    </div>
  );
}

/** Métricas de negocio: las que dicen si el marketing se convierte en clientes e ingreso. */
export default async function NegocioPage() {
  const msg = await getMessages();
  const TITLE = msg.pages["/negocio"].title;
  const gate = await pageGate(TITLE);
  if (gate) return gate;
  let b;
  try { b = await loadBusiness(); } catch (e) { console.error("[negocio]", e); return <LoadError title={TITLE} />; }
  const byKey = new Map(b.metrics.map((m) => [m.key, m]));
  const top = Math.max(b.funnel[0]?.value ?? 0, 1);

  return (
    <div className="space-y-10">
      <SectionHeader title={TITLE} question={msg.pages["/negocio"].question} path="/negocio" />
      <DataSources intro="Junta datos de varias fuentes: los clientes y el ingreso salen del CRM; la inversión, de Google Ads y Meta Ads; las visitas y los contactos, de Google Analytics." items={[{ label: "CRM del panel", on: true }, "gads", "meta", "ga4"]} />

      {b.totalLeads < 10 && (
        <p className="max-w-[70ch] rounded-xl bg-card px-4 py-3 text-sm">
          <span className="font-medium">Con {b.totalLeads} {b.totalLeads === 1 ? "prospecto" : "prospectos"} en el CRM estas cifras todavía son orientativas.</span>{" "}
          <span className="text-muted-foreground">Se vuelven confiables con 20 o más leads y 5 o más cierres. Registra cada contacto en el <Link href="/crm" className="underline underline-offset-2">CRM</Link>, con su canal y su etapa.</span>
        </p>
      )}

      <section aria-labelledby="embudo-negocio" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-2xl bg-card p-5 space-y-4">
          <h2 id="embudo-negocio" className="font-medium">De contacto a cliente · 90 días</h2>
          <ol className="space-y-3">
            {b.funnel.map((f, i) => {
              const prev = i > 0 ? b.funnel[i - 1].value : null;
              return (
                <li key={f.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{f.label}</span>
                    <span className="tabular-nums"><span className="font-medium">{formatNumber(f.value)}</span>{prev ? <span className="ml-2 text-xs text-muted-foreground">{formatPct(f.value / prev, 0)} del paso anterior</span> : null}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-background"><div className="h-full rounded-full bg-foreground origin-left" style={{ transform: `scaleX(${f.value / top})` }} /></div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="rounded-2xl bg-card p-5 space-y-4">
          <h2 className="font-medium"><MetricTip term="weighted_pipeline">Dinero en juego</MetricTip></h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted-foreground">Ponderado</dt><dd className="font-display text-2xl tabular-nums">{formatMoney(b.pipeline.weighted)}</dd></div>
            <div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted-foreground">Total abierto</dt><dd className="font-display text-2xl tabular-nums">{formatMoney(b.pipeline.raw)}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">{b.pipeline.open} {b.pipeline.open === 1 ? "prospecto abierto" : "prospectos abiertos"}. Ponderado = valor × probabilidad de su etapa (nuevo 10 %, calificado 25 %, propuesta 50 %). Lo sano es 3-4 veces la meta de ingreso del trimestre.</p>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`} className="space-y-3">
          <div><h2 id={`g-${g.title}`} className="font-display text-2xl">{g.title}</h2><p className="text-sm text-muted-foreground">{g.note}</p></div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))]">
            {g.keys.flatMap((k) => { const m = byKey.get(k); return m ? [<BizTile key={k} m={m} />] : []; })}
          </div>
        </section>
      ))}

      <details className="group rounded-2xl bg-card p-5">
        <summary className="cursor-pointer font-medium">Qué falta para medir el resto <span className="font-normal text-muted-foreground">(margen, utilización, LTV)</span></summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm max-w-[70ch]">
          <li><span className="font-medium">Margen por proyecto</span> (meta 50-60 %): registrar horas reales y costos externos (freelancers, impresión) por proyecto.</li>
          <li><span className="font-medium">Utilización</span> (meta 70-80 % de horas cobrables): requiere registro de tiempo.</li>
          <li><span className="font-medium">LTV y LTV:CAC</span> (meta ≥ 3:1): marcar en el CRM los clientes con iguala y su fee mensual; con unos meses de historia se calcula solo.</li>
          <li><span className="font-medium">Cobertura del pipeline</span>: definir una meta de ingreso mensual para compararla con el dinero en juego.</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Rangos de referencia de agencias en EE. UU. y Reino Unido (Promethean Research, Agency Management Institute, Parakeeto); no hay estudios públicos de agencias en México. La referencia que manda es la tendencia propia por trimestre.</p>
      </details>
    </div>
  );
}
