import { getMessages } from "@/i18n/server";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadIdeas } from "@/lib/analytics/sections/ideas";
import { forAnchor } from "@/lib/analytics/insights";
import { INTENT_LABELS } from "@/lib/ideas/intent";
import { LoadError, pageGate } from "@/lib/page-gate";
import { countryName } from "@/lib/workspace/patterns";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { WithRail } from "@/components/dash/InsightRail";
import { BarList } from "@/components/dash/BarList";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { Notice } from "@/components/layout/Notice";

export const dynamic = "force-dynamic";
const googleLink = (q: string) => ({ text: q, href: `https://www.google.com.mx/search?q=${encodeURIComponent(q)}` });
const INTENT_TONE = { precio: "good", dudas: "neutral", comparativa: "watch", quejas: "bad", local: "neutral", ia: "watch", general: "neutral" } as const;

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/ideas"].title;
  const gate = await pageGate(TITLE);
  if (gate) return gate;
  const country = countryName();
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadIdeas(period); } catch (e) { console.error("[ideas]", e); return <LoadError title={TITLE} />; }
  const ins = (a: string) => forAnchor(d.insights, a);

  const searchRows: Row[] = d.searches.map((s) => ({
    id: s.text, busqueda: googleLink(s.text), tema: [{ text: INTENT_LABELS[s.intent], tone: INTENT_TONE[s.intent] }],
    lugar: s.bestRank, dias: s.timesSeen, fuerza: Math.round(s.score * 10) / 10,
    estado: [...(s.covered ? [{ text: "Ya apareces", tone: "good" as const }] : [{ text: "Sin contenido", tone: "bad" as const }]), ...(s.isNew ? [{ text: "Nueva", tone: "watch" as const }] : [])],
  }));
  const ideaRows: Row[] = d.suggestions.map((s) => ({
    id: s.text, busqueda: googleLink(s.text), tema: [{ text: INTENT_LABELS[s.intent], tone: INTENT_TONE[s.intent] }], enfoque: s.angle,
  }));
  const redditRows: Row[] = d.reddit.map((r) => ({
    id: r.url ?? r.text, conversacion: r.url ? { text: r.text, href: r.url } : r.text, comunidad: `r/${r.subreddit}`,
    votos: r.score, comentarios: r.comments, tema: [{ text: INTENT_LABELS[r.intent], tone: INTENT_TONE[r.intent] }], fecha: r.published,
  }));
  const compRows: Row[] = d.competitor.map((c) => ({
    id: c.url ?? c.title, estudio: c.name, articulo: c.url ? { text: c.title, href: c.url } : c.title, visto: c.firstSeen,
    estado: c.isNew ? [{ text: "Nuevo", tone: "watch" as const }] : [],
  }));

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/ideas"].question} path="/ideas" period={period} />
      <WithRail insights={d.insights}>
        <Card id="ideas" insights={ins("ideas")} title="Artículos sugeridos" note="Lo más buscado de cada tipo de intención donde todavía no apareces en Google, con el enfoque recomendado. Toca la búsqueda para ver qué muestra Google hoy.">
          <DataTable caption="Artículos sugeridos" rows={ideaRows} limit={10} columns={[
            { key: "busqueda", label: "Búsqueda a responder", type: "link" },
            { key: "tema", label: "Intención", type: "chips" },
            { key: "enfoque", label: "Enfoque", type: "text", hideOnMobile: true },
          ]} />
        </Card>

        <div className="grid gap-2 lg:grid-cols-2">
          <BarList id="temas" insights={ins("temas")} title="Qué tipo de cosas busca la gente" items={d.byIntent.map((x) => ({ key: x.intent, label: INTENT_LABELS[x.intent], value: x.count }))} />
          <BarList id="competencia" insights={ins("competencia")} title="Artículos publicados por la competencia" items={d.competitorCounts.map(([name, n]) => ({ key: name, label: name, value: n }))} emptyText="La competencia no tiene blog detectado en su sitemap." />
        </div>

        <Card id="busquedas" insights={[...ins("busquedas"), ...ins("nuevas")]} title="Lo que la gente busca" note={`Sugerencias del autocompletado de Google${country ? ` en ${country}` : ""} para tus servicios. «Lugar» = posición en la sugerencia (1 = la más buscada). «Días» = días seguidos que aparece. «Fuerza» combina ambos.`}>
          <DataTable caption="Búsquedas" initialSort={{ key: "fuerza", dir: "desc" }} rows={searchRows} limit={15} columns={[
            { key: "busqueda", label: "Búsqueda", type: "link" },
            { key: "tema", label: "Intención", type: "chips" },
            { key: "lugar", label: "Lugar", type: "number", hideOnMobile: true },
            { key: "dias", label: "Días", type: "number", hideOnMobile: true },
            { key: "fuerza", label: "Fuerza", type: "number" },
            { key: "estado", label: "Estado", type: "chips", hideOnMobile: true },
          ]} />
        </Card>

        <Card id="reddit" insights={ins("reddit")} title="Lo que se conversa en Reddit" note="Conversaciones más votadas del último mes sobre tus temas. Útil para ver dudas e inconformidades reales en las propias palabras de la gente.">
          {!d.hasRedditApi && (
            <Notice><p>Reddit limita las consultas sin cuenta. Con una app gratuita de Reddit se traen más conversaciones, con votos y comentarios.</p></Notice>
          )}
          <DataTable caption="Reddit" rows={redditRows} limit={10} emptyText="Sin conversaciones recolectadas todavía." columns={[
            { key: "conversacion", label: "Conversación", type: "link" },
            { key: "comunidad", label: "Comunidad", type: "text", hideOnMobile: true },
            { key: "votos", label: "Votos", type: "number" },
            { key: "comentarios", label: "Comentarios", type: "number", hideOnMobile: true },
            { key: "tema", label: "Intención", type: "chips", hideOnMobile: true },
          ]} />
        </Card>

        <Card title="Qué publica la competencia" note="Artículos del blog de cada competidor (de su sitemap), con link. No hay forma gratuita de saber cuáles les traen más tráfico; úsalos para ver qué temas cubren.">
          <DataTable caption="Artículos de la competencia" rows={compRows} limit={12} columns={[
            { key: "estudio", label: "Competidor", type: "text" },
            { key: "articulo", label: "Artículo", type: "link" },
            { key: "visto", label: "Detectado", type: "text", hideOnMobile: true },
            { key: "estado", label: "", type: "chips", hideOnMobile: true },
          ]} />
        </Card>
      </WithRail>
    </div>
  );
}
