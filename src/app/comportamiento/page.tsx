import { ws } from "@/lib/workspace/store";
import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadBehavior, type BehaviorRow } from "@/lib/analytics/sections/behavior";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatDuration, formatNumber, formatPct } from "@/lib/format";
import { forAnchor } from "@/lib/analytics/insights";
import { label as channelLabel } from "@/lib/analytics/labels";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Column, type Row } from "@/components/dash/DataTable";
import { Notice } from "@/components/layout/Notice";

export const dynamic = "force-dynamic";

const toRow = (r: BehaviorRow, name = r.key): Row => ({
  id: r.key, nombre: name, visitas: r.sessions, scroll: r.scroll, activo: r.activeSeconds,
  rage: r.rage, dead: r.dead, quickback: r.quickback, excesivo: r.excessive,
});

const columns = (first: string): Column[] => [
  { key: "nombre", label: first, type: "text" },
  { key: "visitas", label: "Visitas", type: "number" },
  { key: "scroll", label: "Scroll", type: "pct", term: "scroll_depth_clarity" },
  { key: "activo", label: "Active time", type: "duration", term: "active_time", hideOnMobile: true },
  { key: "rage", label: "Rage", type: "pct", term: "rage_clicks" },
  { key: "dead", label: "Dead", type: "pct", term: "dead_clicks", hideOnMobile: true },
  { key: "quickback", label: "Quick back", type: "pct", term: "quickbacks" },
  { key: "excesivo", label: "Scroll excesivo", type: "pct", hideOnMobile: true },
];

export default async function ComportamientoPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/comportamiento"].title;
  const gate = await pageGate(TITLE, "/comportamiento");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadBehavior(period); } catch (e) { console.error("[comportamiento]", e); return <LoadError title={TITLE} />; }
  const t = d.total;
  const pct = (v: number | null) => (v === null ? "-" : formatPct(v, 0));

  return (
    <div className="space-y-8">
      <a href={ws().platforms.clarityProjectId ? `https://clarity.microsoft.com/projects/view/${ws().platforms.clarityProjectId}/dashboard` : "https://clarity.microsoft.com/projects"} target="_blank" rel="noopener noreferrer"
        className="float-right mt-2 h-8 inline-flex items-center rounded-md bg-card px-3 font-mono text-[11px] uppercase hover:bg-secondary">Abrir grabaciones en Clarity ↗</a>
      <SectionHeader title={TITLE} question={msg.pages["/comportamiento"].question} path="/comportamiento" period={period} />
      {!d.connected && (
        <Notice>
          <p className="font-medium">Microsoft Clarity aún no está conectado.</p>
          <p className="text-muted-foreground">En cuanto cargues el token, cada día se guarda una foto de las últimas 24 horas (Clarity solo permite 10 consultas al día y 3 días hacia atrás). La historia se arma desde ese día.</p>
        </Notice>
      )}
      <WithRail insights={d.insights}>
        {d.connected && (
          <>
            <KpiRow>
              <Kpi label="Scroll depth" term="scroll_depth_clarity" value={pct(t.scroll)} current={t.scroll} previous={d.before.scroll} hint={`${formatNumber(t.sessions)} visitas grabadas`} />
              <Kpi label="Active time" term="active_time" value={formatDuration(t.activeSeconds)} current={t.activeSeconds} previous={d.before.activeSeconds} />
              <Kpi label="Rage clicks" term="rage_clicks" value={pct(t.rage)} current={t.rage} previous={d.before.rage} higherIsBetter={false} hint="De las visitas" />
              <Kpi label="Quick backs" term="quickbacks" value={pct(t.quickback)} current={t.quickback} previous={d.before.quickback} higherIsBetter={false} hint={`Dead clicks: ${pct(t.dead)}`} />
            </KpiRow>
            <Card id="paginas" insights={forAnchor(d.insights, "paginas")} title="Por página" note="Dónde se frustra la gente y hasta dónde baja. Para ver el porqué, abre las grabaciones de esa página en Clarity.">
              <DataTable caption="Comportamiento por página" initialSort={{ key: "visitas", dir: "desc" }} rows={d.byPage.map((r) => toRow(r))} limit={15} columns={columns("Página")} />
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card id="dispositivos" insights={forAnchor(d.insights, "dispositivos")} title="Por dispositivo">
                <DataTable caption="Comportamiento por dispositivo" rows={d.byDevice.map((r) => toRow(r))} columns={columns("Dispositivo").slice(0, 6)} />
              </Card>
              <Card id="canales" insights={forAnchor(d.insights, "canales")} title="Por canal" note="Compara cómo se comporta quien llega por anuncio contra quien llega solo.">
                <DataTable caption="Comportamiento por canal" rows={d.byChannel.map((r) => toRow(r, channelLabel(r.key.replace(/([a-z])([A-Z])/g, "$1 $2"))))} columns={columns("Canal").slice(0, 6)} />
              </Card>
            </div>
          </>
        )}
      </WithRail>
    </div>
  );
}
