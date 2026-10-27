import { getMessages } from "@/i18n/server";
import Link from "next/link";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadSocial } from "@/lib/analytics/sections/social";
import { loadIgCompetition } from "@/lib/analytics/sections/competition";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { rankInsights, type Insight } from "@/lib/analytics/insights";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const TONE_DOT = { bad: "bg-bad", watch: "bg-warn", good: "bg-good" } as const;

function Group({ title, href, insights }: { title: string; href: string; insights: Insight[] }) {
  return (
    <section className="rounded-2xl bg-card p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{title}</h2>
        <Link href={href} className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground">Ver detalle →</Link>
      </div>
      {insights.length ? (
        <ul className="space-y-2.5">
          {insights.slice(0, 4).map((i) => (
            <li key={i.title} className="flex gap-2 text-sm">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[i.tone])} aria-hidden />
              {i.detail ? (
                <details className="group min-w-0">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{i.title} <span className="text-xs text-muted-foreground group-open:hidden">Por qué</span></summary>
                  <p className="pt-1 text-muted-foreground">{i.detail}</p>
                </details>
              ) : <span>{i.title}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Sin hallazgos todavía.</p>}
    </section>
  );
}

/** General: lo más importante de Instagram orgánico, paid y competencia, en un vistazo. */
export default async function SocialPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/social"].title;
  const gate = await pageGate(TITLE, "/social");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d, comp;
  try { [d, comp] = await Promise.all([loadSocial(period), loadIgCompetition()]); } catch (e) { console.error("[social]", e); return <LoadError title={TITLE} />; }
  const k = d.k;
  const organic = d.insights.filter((i) => i.anchor !== "meta");
  const paid = d.insights.filter((i) => i.anchor === "meta");
  const priorities = rankInsights([...d.insights, ...comp.insights]).filter((i) => i.tone !== "good").slice(0, 3);
  const self = comp.rows.find((r) => r.self);
  const measured = comp.rows.filter((r) => r.followers !== null).sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/social"].question} path="/social" period={period} />
      <KpiRow>
        <Kpi label="Followers" value={k.followers === null ? "-" : formatNumber(k.followers)} hint={self && measured.length ? `Lugar ${measured.findIndex((r) => r.self) + 1} de ${measured.length} contra la competencia` : undefined} />
        <Kpi label="Engagement rate" term="ig_engagement" value={k.engagement === null ? "-" : formatPct(k.engagement, 1)} hint={`${k.postsCount} publicaciones en el periodo`} />
        <Kpi label="Inversión en Meta" value={k.metaSpend === null ? "$0" : formatMoney(k.metaSpend)} hint={k.metaLinkClicks ? `${formatNumber(k.metaLinkClicks)} clics` : undefined} />
        <Kpi label="Cost per lead (Meta)" term="cpl" value={k.metaCpl === null ? "-" : formatMoney(k.metaCpl)} hint={`${formatNumber(k.metaLeads)} leads`} />
      </KpiRow>
      {priorities.length > 0 && (
        <section className="rounded-2xl bg-card p-5 space-y-3">
          <h2 className="font-mono text-[11px] uppercase text-muted-foreground">Recomendaciones de la semana</h2>
          <ol className="space-y-2.5">
            {priorities.map((i, n) => (
              <li key={i.title} className="flex gap-3 text-sm">
                <span className="font-display text-xl leading-none text-muted-foreground">{n + 1}</span>
                <span className="max-w-[70ch]"><span className="font-medium">{i.title}</span>{i.detail && <span className="block text-muted-foreground">{i.detail}</span>}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <Group title="Instagram orgánico" href="/social/instagram" insights={organic} />
        <Group title="Instagram paid" href="/social/paid" insights={paid} />
        <Group title="Competencia" href="/social/competencia" insights={comp.insights} />
      </div>
    </div>
  );
}
