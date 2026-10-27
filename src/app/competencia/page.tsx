import { getMessages } from "@/i18n/server";
import Link from "next/link";
import { loadCompetition } from "@/lib/analytics/sections/competition";
import { loadCompetitorTrend, TREND_PERIODS, type TrendPeriod } from "@/lib/analytics/sections/comptrend";
import { CompetitorTrend } from "@/components/dash/CompetitorTrend";
import { rankInsights } from "@/lib/analytics/insights";
import { competitors } from "@/lib/scorecard/config";
import { FACTORS } from "@/lib/analytics/seofactors";
import { cn } from "@/lib/utils";
import { LoadError, pageGate } from "@/lib/page-gate";
import { countryName } from "@/lib/workspace/patterns";
import { formatNumber } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { Plus } from "lucide-react";
import { isLocalMode } from "@/lib/mode";
import { WithRail } from "@/components/dash/InsightRail";
import { forAnchor } from "@/lib/analytics/insights";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";

export const dynamic = "force-dynamic";
const yes = (v?: number) => (v === undefined ? [] : [{ text: v ? "Sí" : "No", tone: v ? ("good" as const) : ("bad" as const) }]);

export default async function CompetenciaPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/competencia"].title;
  const gate = await pageGate(TITLE, "/competencia");
  if (gate) return gate;
  const country = countryName();
  const c = (await searchParams).c;
  const period: TrendPeriod = c && c in TREND_PERIODS ? (c as TrendPeriod) : "mes";
  let d, trend;
  try { [d, trend] = await Promise.all([loadCompetition(), loadCompetitorTrend(period)]); } catch (e) { console.error("[competencia]", e); return <LoadError title={TITLE} />; }
  const insights = rankInsights([...trend.insights, ...d.insights]);

  const delta = (now?: number | null, then?: number | null, same?: boolean) => (now === null || now === undefined || then === null || then === undefined || same ? null : Math.round(now - then) || 0);
  const scoreRows: Row[] = [...trend.series]
    .sort((a, b) => (b.current?.strength ?? -1) - (a.current?.strength ?? -1))
    .map((s) => ({
      id: s.domain, sitio: { text: s.self ? `${s.name} (tú)` : s.name, href: `https://${s.domain}` },
      fuerza: s.current?.strength ?? null,
      ...Object.fromEntries(FACTORS.map((f) => [f.key, s.current?.factors[f.key] ?? null])),
      visibilidad: s.current?.visibility ?? null,
      medido: s.current ? `${Math.round(s.current.coverage * 100)} %` : null,
      cambio: delta(s.current?.strength, s.start?.strength, s.start?.date === s.current?.date),
    }));
  const queryRows: Row[] = trend.queries.map((q) => ({
    id: q.query, busqueda: q.query,
    lider: q.top[0] ? { text: q.top[0].domain, href: q.top[0].url } : "—",
    ...Object.fromEntries(competitors().map((x) => [x.domain, q.bySite[x.domain]])),
  }));

  const rows: Row[] = d.rows.map((r) => ({
    id: r.domain, sitio: { text: r.self ? `${r.name} (tú)` : r.name, href: `https://${r.domain}` }, ciudad: r.city,
    rendimiento: r.perf ?? null, carga: r.lcp === undefined ? null : `${formatNumber(r.lcp / 1000, 1)} s`, seo: r.seo ?? null,
    paginas: r.pages ?? null, articulos: r.blog ?? null, schema: yes(r.schema), descripcion: yes(r.meta), medido: r.date,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader title={TITLE} question={msg.pages["/competencia"].question} path="/competencia" />
      {isLocalMode() && (
        <Link href="/ajustes?tab=mercado" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:bg-card">
          <Plus className="h-4 w-4" aria-hidden />{msg.competencia.addCompetitor}
        </Link>
      )}
      <WithRail insights={insights}>
        <Card id="evolucion" insights={forAnchor(insights, "evolucion")} title="Posicionamiento en el tiempo" note="Cómo se mueve cada competidor contra los demás. Tu marca va resaltada.">
          <nav aria-label="Periodo" className="inline-flex rounded-md bg-background p-0.5">
            {(Object.keys(TREND_PERIODS) as TrendPeriod[]).map((k) => (
              <Link key={k} href={`/competencia?c=${k}`} aria-current={k === period ? "true" : undefined} scroll={false}
                className={cn("h-7 inline-flex items-center rounded-[5px] px-3 font-mono text-[11px] uppercase transition", k === period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {k}
              </Link>
            ))}
          </nav>
          <CompetitorTrend series={trend.series} dates={trend.dates} />
        </Card>
        <Card id="factores" insights={forAnchor(insights, "factores")} title="Factores de posicionamiento" note="Cada factor va de 0 a 100. La fuerza SEO los suma con su peso; «Medido» dice qué parte del peso ya tiene datos. La visibilidad es el resultado real en Google, no entra en la suma.">
          <DataTable caption="Factores de posicionamiento por competidor" rows={scoreRows} limit={20} columns={[
            { key: "sitio", label: "Estudio", type: "link" },
            { key: "fuerza", label: "Fuerza SEO", type: "number", term: "seo_strength" },
            ...FACTORS.map((f) => ({ key: f.key, label: `${f.label} ${f.weight}`, type: "number" as const, hideOnMobile: f.weight < 25 })),
            { key: "visibilidad", label: "Visibilidad", type: "number", term: "visibility" },
            { key: "medido", label: "Medido", type: "text", hideOnMobile: true },
            { key: "cambio", label: "Cambio", type: "number", hideOnMobile: true },
          ]} />
          <details className="mt-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-mono text-[11px] uppercase">Cómo se califica</summary>
            <ul className="mt-2 space-y-1.5 max-w-[75ch]">
              <li><b className="text-foreground">Contenido 30.</b> Google siempre prioriza la página más relevante para la búsqueda. Se mide: páginas publicadas, artículos, páginas por servicio o ciudad y frescura del último cambio.</li>
              <li><b className="text-foreground">Autoridad 25.</b> Google sigue usando los enlaces (PageRank) para medir qué tan confiable es un sitio. Se mide: dominios distintos que te enlazan y su puntaje de dominio.</li>
              <li><b className="text-foreground">Local 15.</b> En búsquedas con ciudad, Google ordena por relevancia, distancia y prominencia; las reseñas cuentan. Se mide: perfil en Google Maps, calificación y reseñas.</li>
              <li><b className="text-foreground">Técnico 15.</b> Que Google pueda rastrear, indexar y entender la página: HTTPS, sitemap, sin noindex, canonical, descripción, schema, un H1 y el servicio en el título.</li>
              <li><b className="text-foreground">Velocidad 10.</b> Core Web Vitals. Google dice que ayudan cuando hay mucho contenido parecido, pero no garantizan el primer lugar.</li>
              <li><b className="text-foreground">Confianza 5.</b> Señales de E-E-A-T visibles: página de nosotros, contacto y proyectos.</li>
              <li>Google no publica pesos. El orden sigue su documentación (Search Central y Business Profile) y los pesos, estudios de la industria como First Page Sage.</li>
            </ul>
          </details>
        </Card>
        <Card id="busquedas" insights={forAnchor(insights, "busquedas")} title="Quién aparece en tus búsquedas objetivo"
          note={trend.serpDate ? `Lugar en Google (celular${country ? `, ${country}` : ""}) el ${trend.serpDate}. Vacío = fuera del top 30. Se mide cada 3 días con Apify.` : "Se llena con la primera medición de Apify (cada 3 días)."}>
          {queryRows.length ? (
            <DataTable caption="Posiciones por búsqueda" rows={queryRows} limit={10} columns={[
              { key: "busqueda", label: "Búsqueda", type: "text" },
              { key: "lider", label: "Primer lugar", type: "link", hideOnMobile: true },
              ...competitors().map((x) => ({ key: x.domain, label: x.self ? "Tú" : x.name, type: "position" as const, hideOnMobile: !x.self })),
            ]} />
          ) : <p className="text-sm text-muted-foreground">Sin mediciones todavía.</p>}
        </Card>
      <Card id="tabla" insights={forAnchor(d.insights, "tabla")} title="Tú contra la competencia" note="Se mide un sitio por día con las mismas herramientas (PageSpeed en celular y su sitemap). La lista se edita en la configuración.">
        <DataTable caption="Competencia" initialSort={{ key: "rendimiento", dir: "desc" }} rows={rows} limit={20} columns={[
          { key: "sitio", label: "Estudio", type: "link" },
          { key: "ciudad", label: "Ciudad", type: "text", hideOnMobile: true },
          { key: "rendimiento", label: "Performance", type: "number", term: "performance" },
          { key: "carga", label: "LCP", type: "text", hideOnMobile: true, term: "lcp" },
          { key: "seo", label: "SEO técnico", type: "number", hideOnMobile: true },
          { key: "paginas", label: "Páginas", type: "number" },
          { key: "articulos", label: "Artículos", type: "number" },
          { key: "schema", label: "Schema", type: "chips", hideOnMobile: true },
          { key: "medido", label: "Medido", type: "text", hideOnMobile: true },
        ]} />
      </Card>
      </WithRail>
    </div>
  );
}
