import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadSocial } from "@/lib/analytics/sections/social";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatNumber, formatPct } from "@/lib/format";
import { forAnchor } from "@/lib/analytics/insights";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { Card } from "@/components/dash/Funnel";
import { TrendChart } from "@/components/dash/TrendChart";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { Notice } from "@/components/layout/Notice";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = { reel: "Reel", carrusel: "Carrusel", imagen: "Imagen", video: "Video", historia: "Historia", otro: "Otro" };

export default async function InstagramPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const gate = await pageGate(msg.pages["/social/instagram"].title, "/social/instagram");
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadSocial(period); } catch (e) { console.error("[social]", e); return <LoadError title={msg.pages["/social/instagram"].title} />; }
  const k = d.k;
  const n = (v: number | null) => (v === null ? "-" : formatNumber(v));

  const postRows: Row[] = d.posts.map((p) => ({
    id: p.id, publicacion: p.permalink ? { text: p.caption.slice(0, 70) || "(sin texto)", href: p.permalink } : p.caption.slice(0, 70),
    formato: FORMAT_LABEL[p.format] ?? p.format, fecha: p.date, alcance: p.reach, interacciones: p.interactions,
    guardados: p.saved, compartidos: p.shares, engagement: p.reach ? p.interactions / p.reach : null,
  }));
  const formatRows: Row[] = d.formats.map((f) => ({ id: f.format, formato: FORMAT_LABEL[f.format] ?? f.format, posts: f.posts, alcance: f.posts ? f.reach / f.posts : null, interacciones: f.posts ? f.interactions / f.posts : null, engagement: f.engagement }));

  const insights = d.insights.filter((i) => i.anchor !== "meta");
  return (
    <div className="space-y-8">
      <SectionHeader title={msg.pages["/social/instagram"].title} question={msg.pages["/social/instagram"].question} path="/social/instagram" period={period} />
      {!d.igConnected && <Notice><p>Instagram aún no tiene datos; llegan con la sincronización diaria.</p></Notice>}
      <WithRail insights={insights}>
        {d.igConnected && (
          <>
                        <KpiRow>
              <Kpi label="Followers" value={n(k.followers)} hint={k.followersDelta === null ? undefined : `${k.followersDelta >= 0 ? "+" : ""}${formatNumber(k.followersDelta)} en el periodo`} />
              <Kpi label="Reach" term="reach" value={n(k.reach)} current={k.reach} previous={k.reachPrev} hint={k.views === null ? undefined : `${formatNumber(k.views)} views`} />
              <Kpi label="Engagement rate" term="ig_engagement" value={k.engagement === null ? "-" : formatPct(k.engagement, 1)} hint={`${n(k.interactions)} interacciones`} />
              <Kpi label="Link taps" value={n(k.linkTaps)} hint="Toques al link del perfil" />
            </KpiRow>
            <Card id="crecimiento" insights={forAnchor(insights, "crecimiento")} title="Alcance e interacción por día">
              <TrendChart points={d.reachSeries as never} keys={["reach", "total_interactions"]} labels={{ reach: "Alcance", total_interactions: "Interacciones" }} />
            </Card>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Card id="formatos" insights={forAnchor(insights, "formatos")} title="Qué formato funciona" note="Promedio por publicación del periodo.">
                <DataTable caption="Rendimiento por formato" rows={formatRows} columns={[
                  { key: "formato", label: "Formato", type: "text" },
                  { key: "posts", label: "Posts", type: "number" },
                  { key: "alcance", label: "Alcance", type: "number" },
                  { key: "engagement", label: "Engagement", type: "pct", term: "ig_engagement" },
                ]} />
              </Card>
              <Card id="publicaciones" insights={forAnchor(insights, "publicaciones")} title="Publicaciones" note="Guardados y compartidos son las señales que más pesan para que Instagram muestre tu contenido.">
                <DataTable caption="Publicaciones del periodo" initialSort={{ key: "interacciones", dir: "desc" }} rows={postRows} limit={10} columns={[
                  { key: "publicacion", label: "Publicación", type: "link" },
                  { key: "formato", label: "Formato", type: "text", hideOnMobile: true },
                  { key: "alcance", label: "Alcance", type: "number" },
                  { key: "interacciones", label: "Interacciones", type: "number" },
                  { key: "guardados", label: "Guardados", type: "number", hideOnMobile: true },
                  { key: "compartidos", label: "Compartidos", type: "number", hideOnMobile: true },
                ]} />
              </Card>
            </div>
          </>
        )}
      </WithRail>
    </div>
  );
}
