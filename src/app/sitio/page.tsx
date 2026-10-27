import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadSite } from "@/lib/analytics/sections/site";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatDuration, formatNumber, formatPct } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { forAnchor } from "@/lib/analytics/insights";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { Card, Funnel } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";

export const dynamic = "force-dynamic";

const speedTone = (lcp?: number) => (lcp === undefined ? null : lcp <= 2500 ? "good" : lcp <= 4000 ? "watch" : "bad") as "good" | "watch" | "bad" | null;

export default async function SitioPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/sitio"].title;
  const gate = await pageGate(TITLE, "/sitio");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadSite(period); } catch (e) { console.error("[sitio]", e); return <LoadError title={TITLE} />; }

  const pageRows: Row[] = d.pages.map((x) => ({
    id: x.key, pagina: x.key, vistas: x.views, tiempo: x.avgSeconds, scroll: x.scrollRate, formularios: x.formStarts, leads: x.leads,
    senal: [
      ...(x.views >= 15 && (x.scrollRate ?? 1) < 0.25 ? [{ text: "Casi no se recorre", tone: "watch" as const }] : []),
      ...(x.views >= 15 && (x.avgSeconds ?? 0) >= 60 ? [{ text: "Engancha", tone: "good" as const }] : []),
    ],
  }));
  const landingRows: Row[] = d.landings.map((x) => ({
    id: x.key, entrada: x.key, visitas: x.sessions, rebote: x.bounceRate, tiempo: x.avgSeconds, leads: x.conversions,
    senal: x.sessions >= 15 && (x.bounceRate ?? 0) > 0.6 ? [{ text: "Bounce rate alto", tone: "bad" as const }] : [],
  }));
  const speedRows: Row[] = d.speed.map((s) => {
    const tone = speedTone(s.lcp);
    return {
      id: s.key, pagina: `${s.path} · ${s.strategy}`, rendimiento: s.perf ?? null, carga: s.lcp === undefined ? null : `${formatNumber(s.lcp / 1000, 1)} s`,
      seo: s.seo ?? null, accesibilidad: s.a11y ?? null,
      estado: [...(tone ? [{ text: tone === "good" ? "Rápida" : tone === "watch" ? "Mejorable" : "Lenta", tone }] : []), { text: s.measurement === "lab" ? "Laboratorio" : "Usuarios reales", tone: "neutral" as const }],
    };
  });

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/sitio"].question} path="/sitio" period={period} />
      <WithRail insights={d.insights}>
      <KpiRow>
        <Kpi comparable={d.comparable} refs={d.refs.bounce} term="bounce_rate" label="Bounce rate" value={d.kpis.engagementRate[0] === null ? "-" : formatPct(1 - d.kpis.engagementRate[0], 0)} current={d.kpis.engagementRate[0] === null ? null : 1 - d.kpis.engagementRate[0]} previous={d.kpis.engagementRate[1] === null ? null : 1 - d.kpis.engagementRate[1]} higherIsBetter={false} />
        <Kpi comparable={d.comparable} refs={d.refs.avgTime} term="avg_engagement_time" label="Avg. engagement time" value={formatDuration(d.kpis.avgSeconds[0])} current={d.kpis.avgSeconds[0]} previous={d.kpis.avgSeconds[1]} />
        <Kpi comparable={d.comparable} refs={d.refs.scroll} term="scroll_depth" label="Scroll depth (90 %)" value={d.kpis.scrollRate[0] === null ? "-" : formatPct(d.kpis.scrollRate[0], 0)} current={d.kpis.scrollRate[0]} previous={d.kpis.scrollRate[1]} />
        <Kpi comparable={d.comparable} refs={d.refs.contacts} term="leads" label="Leads" value={formatNumber(d.kpis.contacts[0])} current={d.kpis.contacts[0]} previous={d.kpis.contacts[1]} hint={`Formulario ${d.contactsDetail.form} · WhatsApp ${d.contactsDetail.whatsapp} · llamada ${d.contactsDetail.call}`} />
      </KpiRow>

      <Card id="embudo" insights={forAnchor(d.insights, "embudo")} title="Del clic al contacto" note="Cuánta gente avanza en cada paso hacia un lead. El envío del formulario se empezó a medir el 23 de octubre de 2026.">
        <Funnel steps={d.funnel} />
      </Card>

      <Card id="paginas" insights={forAnchor(d.insights, "paginas")} title="Páginas" note="Tiempo activo por vista y qué tanto se recorre cada página.">
        <DataTable caption="Páginas" initialSort={{ key: "vistas", dir: "desc" }} rows={pageRows} columns={[
          { key: "pagina", label: "Página", type: "text" },
          { key: "vistas", label: "Page views", type: "number", term: "page_views" },
          { key: "tiempo", label: "Avg. time", type: "duration", term: "avg_engagement_time" },
          { key: "scroll", label: "Scroll 90 %", type: "pct", term: "scroll_depth" },
          { key: "formularios", label: "Form. iniciados", type: "number", hideOnMobile: true },
          { key: "senal", label: "Señal", type: "chips", hideOnMobile: true },
        ]} />
      </Card>

      <Card id="entradas" insights={forAnchor(d.insights, "entradas")} title="Landing pages" note="La primera página que ve cada visita y cuánta gente rebota desde ahí.">
        <DataTable caption="Páginas de entrada" initialSort={{ key: "visitas", dir: "desc" }} rows={landingRows} columns={[
          { key: "entrada", label: "Landing page", type: "text", term: "landing_page" },
          { key: "visitas", label: "Sessions", type: "number", term: "sessions" },
          { key: "rebote", label: "Bounce rate", type: "pct", term: "bounce_rate" },
          { key: "tiempo", label: "Avg. time", type: "duration", hideOnMobile: true, term: "avg_engagement_time" },
          { key: "senal", label: "Señal", type: "chips", hideOnMobile: true },
        ]} />
      </Card>

      <Card id="velocidad" insights={forAnchor(d.insights, "velocidad")} title="Velocidad" note="PageSpeed Insights mide la Home en celular cada día y rota otra página. «Carga» = tiempo hasta ver lo principal (bueno < 2.5 s).">
        <DataTable caption="Velocidad" rows={speedRows} columns={[
          { key: "pagina", label: "Página", type: "text" },
          { key: "carga", label: "LCP", type: "text", term: "lcp" },
          { key: "rendimiento", label: "Performance", type: "number", term: "performance" },
          { key: "seo", label: "SEO", type: "number", hideOnMobile: true },
          { key: "accesibilidad", label: "Accesib.", type: "number", hideOnMobile: true },
          { key: "estado", label: "Estado", type: "chips" },
        ]} />
      </Card>
      </WithRail>
    </div>
  );
}
