import { getMessages } from "@/i18n/server";
import { loadIgCompetition } from "@/lib/analytics/sections/competition";
import { LoadError, pageGate } from "@/lib/page-gate";
import { forAnchor } from "@/lib/analytics/insights";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { Card } from "@/components/dash/Funnel";
import { DataTable } from "@/components/dash/DataTable";

export const dynamic = "force-dynamic";

export default async function SocialCompetenciaPage() {
  const msg = await getMessages();
  const TITLE = msg.pages["/social/competencia"].title;
  const gate = await pageGate(TITLE, "/social/competencia");
  if (gate) return gate;
  let d;
  try { d = await loadIgCompetition(); } catch (e) { console.error("[social/competencia]", e); return <LoadError title={TITLE} />; }
  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/social/competencia"].question} path="/social/competencia" />
      <WithRail insights={d.insights}>
        <Card id="instagram" insights={forAnchor(d.insights, "instagram")} title="Tú contra la competencia"
          note="Datos públicos de cada cuenta, medidos cada semana con Apify. Engagement = interacciones promedio por publicación entre seguidores: la forma justa de comparar cuentas de distinto tamaño.">
          <DataTable caption="Instagram de la competencia" initialSort={{ key: "seguidores", dir: "desc" }} rows={d.rows.map((r) => ({
            id: r.domain, estudio: { text: r.self ? `${r.name} (tú)` : r.name, href: `https://instagram.com/${r.handle}` },
            seguidores: r.followers, posts: r.posts30, interacciones: r.avgInteractions, engagement: r.engagement, medido: r.date,
          }))} limit={20} columns={[
            { key: "estudio", label: "Marca", type: "link" },
            { key: "seguidores", label: "Seguidores", type: "number" },
            { key: "posts", label: "Posts 30 días", type: "number" },
            { key: "interacciones", label: "Interacciones por post", type: "number", hideOnMobile: true },
            { key: "engagement", label: "Engagement", type: "pct", term: "ig_engagement" },
            { key: "medido", label: "Medido", type: "text", hideOnMobile: true },
          ]} />
        </Card>
      </WithRail>
    </div>
  );
}
