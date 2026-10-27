import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadSocial } from "@/lib/analytics/sections/social";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { forAnchor } from "@/lib/analytics/insights";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { Notice } from "@/components/layout/Notice";
import { OpenPlatform } from "@/components/dash/OpenPlatform";

export const dynamic = "force-dynamic";


export default async function PaidPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const gate = await pageGate(msg.pages["/social/paid"].title, "/social/paid");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadSocial(period); } catch (e) { console.error("[social]", e); return <LoadError title={msg.pages["/social/paid"].title} />; }
  const k = d.k;

  const campaignRows: Row[] = d.campaigns.map((c) => ({ id: c.name, campana: c.name.replace(/^Instagram post: /, "Promoción: "), gasto: c.spend, clics: c.linkClicks, cpc: c.cpc, ctr: c.ctr, leads: c.leads + c.conversations, cpl: c.cpl }));

  const insights = d.insights.filter((i) => i.anchor === "meta");
  return (
    <div className="space-y-8">
      <SectionHeader title={msg.pages["/social/paid"].title} question={msg.pages["/social/paid"].question} path="/social/paid" period={period} />
      {!d.metaConnected && <Notice><p>No hay campañas de Meta en este periodo. Las promociones de Instagram y los anuncios aparecen aquí en cuanto tengan gasto.</p></Notice>}
      <WithRail insights={insights}>
        {d.metaConnected && (
          <>
                        <KpiRow>
              <Kpi label="Inversión" value={k.metaSpend === null ? "-" : formatMoney(k.metaSpend)} current={k.metaSpend} previous={k.metaSpendPrev} higherIsBetter={false} />
              <Kpi label="Leads" value={formatNumber(k.metaLeads)} hint={k.metaLinkClicks ? `${formatNumber(k.metaLinkClicks)} clics a ${k.metaCpc === null ? "-" : formatMoney(k.metaCpc)} c/u` : "Formularios + conversaciones iniciadas"} />
              <Kpi label="Cost per lead" term="cpl" value={k.metaCpl === null ? "-" : formatMoney(k.metaCpl)} hint={k.googleCpl === null ? undefined : `Google: ${formatMoney(k.googleCpl)}`} />
              <Kpi label="Frequency" term="frequency" value={k.frequency === null ? "-" : k.frequency.toFixed(1)} hint={k.metaCtr === null ? undefined : `CTR ${formatPct(k.metaCtr, 2)}`} />
            </KpiRow>
            <Card id="meta" insights={forAnchor(insights, "meta")} title="Campañas de Meta">
              <div className="mb-3"><OpenPlatform platform="meta_ads" action="Pausar o ajustar en Meta Ads" /></div>
              <DataTable caption="Campañas de Meta Ads" rows={campaignRows} columns={[
                { key: "campana", label: "Campaña", type: "text" },
                { key: "gasto", label: "Gasto", type: "mxn" },
                { key: "clics", label: "Clics", type: "number" },
                { key: "cpc", label: "Costo por clic", type: "mxn" },
                { key: "ctr", label: "CTR", type: "pct", hideOnMobile: true },
                { key: "leads", label: "Leads", type: "number" },
                { key: "cpl", label: "Costo por lead", type: "mxn", term: "cpl" },
              ]} />
            </Card>
          </>
        )}
      </WithRail>
    </div>
  );
}
