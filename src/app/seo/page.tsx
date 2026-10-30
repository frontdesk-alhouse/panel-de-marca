import { getMessages } from "@/i18n/server";
import { ws } from "@/lib/workspace/store";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadSeo, type QueryFlag } from "@/lib/analytics/sections/seo";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatNumber, formatPct } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { forAnchor } from "@/lib/analytics/insights";
import { CopyForClaude } from "@/components/handoff/CopyForClaude";
import { handoffFromInsights } from "@/lib/handoff/from-panel";
import { todayIso } from "@/lib/dates";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { TrendChart } from "@/components/dash/TrendChart";
import { BarList } from "@/components/dash/BarList";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";

export const dynamic = "force-dynamic";

const FLAG: Record<QueryFlag, { text: string; tone: "neutral" | "good" | "bad" | "watch" }> = {
  marca: { text: "Tu nombre", tone: "neutral" },
  cerca: { text: "Cerca de pág. 1", tone: "watch" },
  poco_clic: { text: "Poco clic", tone: "bad" },
  nueva: { text: "Nueva", tone: "good" },
};

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/seo"].title;
  const gate = await pageGate(TITLE, "/seo");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadSeo(period); } catch (e) { console.error("[seo]", e); return <LoadError title={TITLE} />; }

  const queryRows: Row[] = d.queries.map((q) => ({
    id: q.key, busqueda: q.key, clics: q.clicks, apariciones: q.impressions, ctr: q.ctr, posicion: q.position,
    senal: q.flags.map((f) => FLAG[f]),
  }));
  const pageRows: Row[] = d.pages.map((p) => ({
    id: p.key, pagina: p.key.replace(new RegExp(`^https?://(www\\.)?${ws().brand.domain.replace(/\./g, "\\.")}`), "").replace(/^https?:\/\//, "") || "/", clics: p.clicks, apariciones: p.impressions,
    ctr: p.ctr, posicion: p.position, senal: p.outdated ? [{ text: "Sitio anterior", tone: "bad" as const }] : [],
  }));
  const targetRows: Row[] = d.targets.map((t) => ({
    id: t.query, busqueda: t.query, posicion: t.row?.position ?? null, apariciones: t.row?.impressions ?? 0,
    estado: [t.row ? (t.row.position !== null && t.row.position <= 10 ? { text: "Primera página", tone: "good" as const } : { text: "Apareces, lejos", tone: "watch" as const }) : { text: "No apareces", tone: "bad" as const }],
  }));
  const totalImpr = d.split.brand.impressions + d.split.nonBrand.impressions;
  const missingTargets = d.targets.filter((t) => !t.row).map((t) => t.query);
  const handoff = await handoffFromInsights("SEO", d.trend.at(-1)?.date ?? todayIso(), [
    ...d.insights,
    ...(missingTargets.length ? [{ tone: "bad" as const, weight: 2 as const, title: `No apareces en ${missingTargets.length} búsquedas objetivo`, detail: `Crear o reforzar páginas para: ${missingTargets.slice(0, 12).join(", ")}.` }] : []),
  ], ["seo-geo"]);

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/seo"].question} path="/seo" period={period} />
      <CopyForClaude payload={handoff} className="max-w-xl" />
      <WithRail insights={d.insights}>
      <KpiRow>
        <Kpi comparable={d.comparable} refs={d.refs.clicks} term="clicks" label="Organic clicks" value={formatNumber(d.kpis.clicks[0] ?? 0)} current={d.kpis.clicks[0]} previous={d.kpis.clicks[1]} spark={d.trend.map((t) => t.clicks)} />
        <Kpi comparable={d.comparable} refs={d.refs.impressions} term="impressions" label="Impressions" value={formatNumber(d.kpis.impressions[0] ?? 0)} current={d.kpis.impressions[0]} previous={d.kpis.impressions[1]} spark={d.trend.map((t) => t.impressions)} hint="Veces que saliste en resultados" />
        <Kpi comparable={d.comparable} refs={d.refs.ctr} term="ctr" label="CTR" value={d.kpis.ctr[0] === null ? "-" : formatPct(d.kpis.ctr[0], 1)} current={d.kpis.ctr[0]} previous={d.kpis.ctr[1]} hint="Clics por cada 100 apariciones" />
        <Kpi comparable={d.comparable} refs={d.refs.position} term="avg_position" label="Avg. position" value={d.kpis.position[0] === null ? "-" : formatNumber(d.kpis.position[0], 1)} current={d.kpis.position[0]} previous={d.kpis.position[1]} higherIsBetter={false} hint="1 = primer resultado" />
      </KpiRow>

      <div className="grid gap-2 lg:grid-cols-[2fr_1fr]">
        <Card id="tendencia" insights={forAnchor(d.insights, "tendencia")} title="Clics y apariciones por día">
          <TrendChart points={d.trend} keys={["impressions", "clicks"]} labels={{ impressions: "Apariciones", clicks: "Clics" }} />
        </Card>
        <BarList id="marca" insights={forAnchor(d.insights, "marca")} title="¿Te buscan por nombre o por servicio?" items={[
          { key: "marca", label: `Buscan «${ws().brand.name}»`, value: d.split.brand.impressions, note: `${formatNumber(d.split.brand.clicks)} clics` },
          { key: "servicio", label: "Buscan el servicio", value: d.split.nonBrand.impressions, note: `${formatNumber(d.split.nonBrand.clicks)} clics` },
        ]} emptyText={totalImpr ? undefined : "Google aún no te muestra."} />
      </div>

      <Card id="objetivo" insights={forAnchor(d.insights, "objetivo")} title="Dónde te conviene aparecer" note="Búsquedas objetivo por servicio y ciudad. Cada «No apareces» es una página por crear o reforzar. La lista vive en la configuración del panel.">
        <DataTable caption="Búsquedas objetivo" rows={targetRows} limit={20} columns={[
          { key: "busqueda", label: "Búsqueda", type: "text" },
          { key: "estado", label: "Estado", type: "chips" },
          { key: "posicion", label: "Position", type: "position", term: "avg_position" },
          { key: "apariciones", label: "Impressions", type: "number", hideOnMobile: true, term: "impressions" },
        ]} />
      </Card>

      <Card id="busquedas" insights={forAnchor(d.insights, "busquedas")} title="Con qué búsquedas apareces" note="«Cerca de pág. 1» = posición 8 a 20: lo más fácil de subir. «Poco clic» = sales arriba pero no convences.">
        <DataTable caption="Búsquedas" initialSort={{ key: "apariciones", dir: "desc" }} rows={queryRows} columns={[
          { key: "busqueda", label: "Búsqueda", type: "text" },
          { key: "apariciones", label: "Impressions", type: "number", term: "impressions" },
          { key: "clics", label: "Clicks", type: "number", term: "clicks" },
          { key: "ctr", label: "CTR", type: "pct", hideOnMobile: true, term: "ctr" },
          { key: "posicion", label: "Position", type: "position", term: "avg_position" },
          { key: "senal", label: "Señal", type: "chips", hideOnMobile: true },
        ]} />
      </Card>

      <Card id="paginas" insights={forAnchor(d.insights, "paginas")} title="Qué páginas muestra Google" note={d.hasSitemap ? "«Sitio anterior» = la URL no está en tu sitemap actual; conviene redirigirla." : undefined}>
        <DataTable caption="Páginas" initialSort={{ key: "apariciones", dir: "desc" }} rows={pageRows} columns={[
          { key: "pagina", label: "Página", type: "text" },
          { key: "apariciones", label: "Impressions", type: "number", term: "impressions" },
          { key: "clics", label: "Clicks", type: "number", term: "clicks" },
          { key: "posicion", label: "Position", type: "position", hideOnMobile: true, term: "avg_position" },
          { key: "senal", label: "Señal", type: "chips" },
        ]} />
      </Card>
      </WithRail>
    </div>
  );
}
