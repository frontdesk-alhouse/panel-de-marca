import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadAds } from "@/lib/analytics/sections/ads";
import { loadGoogleAds } from "@/lib/analytics/sections/gads";
import { rankInsights } from "@/lib/analytics/insights";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatDuration, formatMoney, formatNumber, formatPct } from "@/lib/format";
import { OpenPlatform } from "@/components/dash/OpenPlatform";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { forAnchor } from "@/lib/analytics/insights";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { Notice } from "@/components/layout/Notice";
import { label } from "@/components/dash/colors";

export const dynamic = "force-dynamic";

export default async function AnunciosPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/anuncios"].title;
  const gate = await pageGate(TITLE, "/anuncios");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d, g;
  try { [d, g] = await Promise.all([loadAds(period), loadGoogleAds(period)]); } catch (e) { console.error("[anuncios]", e); return <LoadError title={TITLE} />; }
  const insights = rankInsights([...g.insights, ...d.insights.filter((i) => !(g.connected && i.anchor === "origen"))]);
  const VERDICT: Record<string, { text: string; tone: "good" | "watch" | "bad" | "neutral" }> = {
    esperar: { text: "Esperar", tone: "watch" }, mantener: { text: "Mantener", tone: "good" }, ajustar: { text: "Ajustar", tone: "watch" },
    escalar: { text: "Escalar", tone: "good" }, pausar: { text: "Pausar", tone: "bad" }, medir: { text: "Medir primero", tone: "bad" }, pausada: { text: "Pausada", tone: "neutral" },
  };
  const campaignRows: Row[] = g.campaigns.map((c) => ({
    id: c.name, campana: c.name, accion: [VERDICT[c.advice.verdict]], gasto: c.cost, clics: c.clicks, leads: c.conversions, cpl: c.cpl,
    alcance: c.impressionShare,
  }));
  const termRows: Row[] = g.terms.slice(0, 100).map((t) => ({
    id: t.term, termino: t.term, gasto: t.cost, clics: t.clicks, leads: t.conversions,
    estado: g.wasted.some((w) => w.term === t.term) ? [{ text: "Candidato a negativo", tone: "bad" as const }] : [],
  }));

  const { paid, organic } = d.compare;
  const compareRows: Row[] = [
    { id: "paid", tipo: "Anuncios", visitas: paid.sessions, interaccion: paid.engagementRate, tiempo: paid.avgSeconds, leads: paid.conversions },
    { id: "org", tipo: "Todo lo demás", visitas: organic.sessions, interaccion: organic.engagementRate, tiempo: organic.avgSeconds, leads: organic.conversions },
  ];
  const sourceRows: Row[] = [...d.paid.map((r) => ({ key: label(r.key), r })), ...d.paidSources.map((r) => ({ key: r.key, r }))].map(({ key, r }) => ({
    id: key, origen: key, visitas: r.cur.sessions ?? 0, previo: r.prev.sessions ?? null,
    interaccion: r.cur.sessions ? (r.cur.engaged_sessions ?? 0) / r.cur.sessions : null, leads: r.cur.key_events ?? 0,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/anuncios"].question} path="/anuncios" period={period} />
      {!g.connected && (
        <Notice>
          <p className="font-medium">Google Ads aún no está conectado.</p>
          <p className="text-muted-foreground">Por ahora esta vista usa lo que Google Analytics ve de las visitas pagadas. Gasto, costo por lead, términos de búsqueda y recomendaciones por campaña llegan al conectarlo.</p>
        </Notice>
      )}
      <WithRail insights={insights}>
      {g.connected && (
        <>
          <KpiRow>
            <Kpi label="Inversión" value={g.kpis.cost === null ? "-" : formatMoney(g.kpis.cost)} current={g.kpis.cost} previous={g.kpis.prevCost} higherIsBetter={false} />
            <Kpi label="CPC" value={g.kpis.cpc === null ? "-" : formatMoney(g.kpis.cpc)} hint={`${formatNumber(g.kpis.clicks ?? 0)} clics`} />
            <Kpi label="CTR" term="ctr" value={g.kpis.ctr === null ? "-" : formatPct(g.kpis.ctr, 1)} hint={`${formatNumber(g.kpis.impressions ?? 0)} impresiones`} />
            <Kpi label="Costo por lead" value={g.kpis.cpl === null ? "-" : formatMoney(g.kpis.cpl)} hint={`${formatNumber(g.kpis.conversions ?? 0)} conversiones en Google Ads`} />
          </KpiRow>
          <Card id="campanas" insights={forAnchor(insights, "campanas")} title="Campañas: qué hacer con cada una"
            note="Esperar = está aprendiendo o faltan datos, no la toques. Ajustar = cuesta de más. Escalar = funciona y tiene espacio. Pausar = gastó sin resultados.">
            <DataTable caption="Campañas de Google Ads" rows={campaignRows} columns={[
              { key: "campana", label: "Campaña", type: "text" },
              { key: "accion", label: "Acción", type: "chips" },
              { key: "gasto", label: "Gasto", type: "mxn" },
              { key: "clics", label: "Clics", type: "number", hideOnMobile: true },
              { key: "leads", label: "Leads", type: "number" },
              { key: "cpl", label: "Costo por lead", type: "mxn" },
              { key: "alcance", label: "Impression share", type: "pct", hideOnMobile: true },
            ]} />
            <ul className="mt-5 divide-y divide-border" aria-label="Qué hacer con cada campaña">
              {g.campaigns.map((c) => (
                <li key={c.name} className="py-3">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                      <span className="font-mono text-[11px] uppercase text-muted-foreground">{VERDICT[c.advice.verdict].text}</span>
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="basis-full text-sm max-w-[65ch]">{c.advice.title}</span>
                      <span className="text-xs text-muted-foreground group-open:hidden">Por qué →</span>
                    </summary>
                    <p className="pt-2 text-sm text-muted-foreground max-w-[65ch]">{c.advice.detail}{c.advice.until && <span className="block pt-1 text-foreground">Hasta: {c.advice.until}</span>}</p>
                  </details>
                </li>
              ))}
            </ul>
            <div className="mt-4"><OpenPlatform platform="google_ads" action="Pausar o ajustar en Google Ads" /></div>
          </Card>
          <Card id="terminos" insights={forAnchor(insights, "terminos")} title="Qué buscó la gente que hizo clic" note="Términos reales de búsqueda. Los que gastan sin traer leads son candidatos a palabra negativa.">
            <DataTable caption="Términos de búsqueda" initialSort={{ key: "gasto", dir: "desc" }} rows={termRows} limit={15} columns={[
              { key: "termino", label: "Término", type: "text" },
              { key: "gasto", label: "Gasto", type: "mxn" },
              { key: "clics", label: "Clics", type: "number" },
              { key: "leads", label: "Leads", type: "number" },
              { key: "estado", label: "", type: "chips" },
            ]} />
          </Card>
        </>
      )}
      <KpiRow>
        <Kpi refs={d.refs.sessions} term="sessions" label="Paid sessions" value={formatNumber(paid.sessions)} />
        <Kpi refs={d.refs.engagement} term="engagement_rate" label="Paid engagement rate" value={paid.engagementRate === null ? "-" : formatPct(paid.engagementRate, 0)} hint={`Resto del sitio: ${organic.engagementRate === null ? "-" : formatPct(organic.engagementRate, 0)}`} />
        <Kpi refs={d.refs.avgTime} term="avg_engagement_time" label="Paid avg. engagement time" value={formatDuration(paid.avgSeconds)} hint={`Resto del sitio: ${formatDuration(organic.avgSeconds)}`} />
        <Kpi refs={d.refs.leads} term="leads" label="Paid leads" value={formatNumber(paid.conversions)} hint="Desde el evento de envío" />
      </KpiRow>
      <Card id="comparacion" insights={forAnchor(insights, "comparacion")} title="En el sitio: anuncios contra el resto del tráfico" note="Qué hace en tu sitio la gente que llega por anuncio (Google Analytics).">
        <DataTable caption="Comparación" rows={compareRows} columns={[
          { key: "tipo", label: "Tráfico", type: "text" },
          { key: "visitas", label: "Visitas", type: "number" },
          { key: "interaccion", label: "Interacción", type: "pct" },
          { key: "tiempo", label: "Tiempo", type: "duration" },
          { key: "leads", label: "Leads", type: "number" },
        ]} />
      </Card>
      <Card id="origen" insights={forAnchor(insights, "origen")} title="Canales y campañas pagadas">
        <DataTable caption="Origen pagado" initialSort={{ key: "visitas", dir: "desc" }} rows={sourceRows} columns={[
          { key: "origen", label: "Origen", type: "text" },
          { key: "visitas", label: "Visitas", type: "number" },
          { key: "previo", label: "Periodo previo", type: "number", hideOnMobile: true },
          { key: "interaccion", label: "Interacción", type: "pct" },
          { key: "leads", label: "Leads", type: "number" },
        ]} />
      </Card>
      </WithRail>
    </div>
  );
}
