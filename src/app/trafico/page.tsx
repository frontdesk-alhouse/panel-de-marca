import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadTraffic } from "@/lib/analytics/sections/traffic";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatDuration, formatNumber, formatPct } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { forAnchor } from "@/lib/analytics/insights";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { TrendChart } from "@/components/dash/TrendChart";
import { BarList } from "@/components/dash/BarList";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { label, seriesColor } from "@/components/dash/colors";

export const dynamic = "force-dynamic";
const DEVICE: Record<string, string> = { mobile: "Celular", desktop: "Escritorio", tablet: "Tablet" };
const VISITOR: Record<string, string> = { new: "Primera vez", returning: "Regresan" };

export default async function TraficoPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/trafico"].title;
  const gate = await pageGate(TITLE, "/trafico");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadTraffic(period); } catch (e) { console.error("[trafico]", e); return <LoadError title={TITLE} />; }

  const rate = (r: { cur: Record<string, number> }) => (r.cur.sessions ? (r.cur.engaged_sessions ?? 0) / r.cur.sessions : 0);
  const channelRows: Row[] = d.channels.map((r) => ({
    id: r.key, canal: label(r.key), visitas: r.cur.sessions ?? 0, previo: r.prev.sessions ?? null,
    interaccion: r.cur.sessions ? rate(r) : null, tiempo: r.cur.sessions ? (r.cur.engagement_seconds ?? 0) / r.cur.sessions : null,
    nuevos: r.cur.new_users ?? 0, leads: r.cur.key_events ?? 0,
  }));
  const sourceRows: Row[] = d.sources.map((r) => ({
    id: r.key, fuente: r.key, visitas: r.cur.sessions ?? 0, interaccion: r.cur.sessions ? rate(r) : null, leads: r.cur.key_events ?? 0,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/trafico"].question} path="/trafico" period={period} />
      <WithRail insights={d.insights}>
      <KpiRow>
        <Kpi comparable={d.comparable} refs={d.refs.sessions} term="sessions" label="Sessions" value={formatNumber(d.kpis.sessions[0] ?? 0)} current={d.kpis.sessions[0]} previous={d.kpis.sessions[1]} spark={d.channelSeries.points.map((p) => d.channelSeries.keys.reduce((a, k) => a + (p[k] ?? 0), 0))} />
        <Kpi comparable={d.comparable} refs={d.refs.newShare} term="new_visitors" label="New visitors" value={d.kpis.newShare[0] === null ? "-" : formatPct(d.kpis.newShare[0], 0)} current={d.kpis.newShare[0]} previous={d.kpis.newShare[1]} hint="De cada 100 visitas, cuántas son primera vez" />
        <Kpi comparable={d.comparable} refs={d.refs.engagement} term="engagement_rate" label="Engagement rate" value={d.kpis.engagementRate[0] === null ? "-" : formatPct(d.kpis.engagementRate[0], 0)} current={d.kpis.engagementRate[0]} previous={d.kpis.engagementRate[1]} hint="Más de 10 s, 2 páginas o una acción" />
        <Kpi comparable={d.comparable} refs={d.refs.avgTime} term="avg_engagement_time" label="Avg. engagement time" value={formatDuration(d.kpis.avgSeconds[0])} current={d.kpis.avgSeconds[0]} previous={d.kpis.avgSeconds[1]} hint="Tiempo activo por visita" />
      </KpiRow>

      <Card id="visitas" insights={forAnchor(d.insights, "visitas")} title="Visitas por día y canal" note="Pasa el cursor sobre la gráfica para ver el detalle del día.">
        <TrendChart points={d.channelSeries.points} keys={d.channelSeries.keys} stacked />
      </Card>

      <div className="grid gap-2 lg:grid-cols-2">
        <BarList id="canales" insights={forAnchor(d.insights, "canales")} title="De dónde llegan" items={d.channels.map((r, i) => ({ key: r.key, label: label(r.key), value: r.cur.sessions ?? 0, color: seriesColor(r.key, i), note: `${formatPct(rate(r), 0)} con interacción` }))} />
        <BarList id="dispositivos" insights={forAnchor(d.insights, "dispositivos")} title="Desde qué dispositivo" items={d.devices.map((r) => ({ key: r.key, label: DEVICE[r.key] ?? r.key, value: r.cur.sessions ?? 0, note: `${formatPct(rate(r), 0)} con interacción` }))} />
        <BarList id="ciudades" insights={forAnchor(d.insights, "ciudades")} title="Desde qué ciudad" items={d.cities.map((r) => ({ key: r.key, label: r.key, value: r.cur.sessions ?? 0 }))} max={10} />
        <div className="grid gap-2">
          <BarList id="visitantes" insights={forAnchor(d.insights, "visitantes")} title="Primera vez o regresan" items={d.visitors.filter((r) => VISITOR[r.key]).map((r) => ({ key: r.key, label: VISITOR[r.key], value: r.cur.sessions ?? 0 }))} />
          <BarList id="edad" insights={forAnchor(d.insights, "edad")} title="Edad" items={d.ages.map((r) => ({ key: r.key, label: r.key, value: r.cur.sessions ?? 0 }))} emptyText="Sin datos: hay que activar Google Signals en GA4." />
        </div>
      </div>

      <Card id="detalle-canales" insights={forAnchor(d.insights, "detalle-canales")} title="Canales en detalle" note="Toca un encabezado para ordenar.">
        <DataTable caption="Canales" initialSort={{ key: "visitas", dir: "desc" }} rows={channelRows} columns={[
          { key: "canal", label: "Canal", type: "text" },
          { key: "visitas", label: "Sessions", type: "number", term: "sessions" },
          { key: "previo", label: "Periodo previo", type: "number", hideOnMobile: true },
          { key: "interaccion", label: "Engagement", type: "pct", term: "engagement_rate" },
          { key: "tiempo", label: "Avg. time", type: "duration", hideOnMobile: true, term: "avg_engagement_time" },
          { key: "leads", label: "Leads", type: "number", term: "leads" },
        ]} />
      </Card>
      <Card title="Fuente exacta" note="Sitio o campaña que mandó la visita (google / cpc = Google Ads).">
        <DataTable caption="Fuentes" initialSort={{ key: "visitas", dir: "desc" }} rows={sourceRows} columns={[
          { key: "fuente", label: "Source / medium", type: "text" },
          { key: "visitas", label: "Sessions", type: "number", term: "sessions" },
          { key: "interaccion", label: "Engagement", type: "pct", term: "engagement_rate" },
          { key: "leads", label: "Leads", type: "number", term: "leads" },
        ]} />
      </Card>
      </WithRail>
    </div>
  );
}
