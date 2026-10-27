import { getMessages } from "@/i18n/server";
import { ws } from "@/lib/workspace/store";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, ChevronDown, CircleCheck, Eye, Inbox, MessageSquare, MousePointerClick, Percent, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { Progress } from "@/components/dash/Progress";
import { resolvePeriod } from "@/lib/analytics/period";
import { loadOverview } from "@/lib/analytics/sections/overview";
import { LoadError, pageGate } from "@/lib/page-gate";
import { formatNumber, formatPct, formatShortDate } from "@/lib/format";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { Kpi, KpiRow } from "@/components/dash/Kpi";
import { TrendChart } from "@/components/dash/TrendChart";
import { Card } from "@/components/dash/Funnel";
import { Notice } from "@/components/layout/Notice";
import { MockNotice } from "@/components/layout/StateNotice";

export const dynamic = "force-dynamic";
const ACTIVITY_ICON = { lead: UserPlus, crm: MessageSquare, web_lead: MousePointerClick, post: Camera, analysis: Sparkles } as const;
const ICON = { bad: { Icon: AlertTriangle, c: "text-bad", t: "Atender" }, watch: { Icon: Eye, c: "text-warn", t: "Vigilar" }, good: { Icon: CircleCheck, c: "text-good", t: "Va bien" } };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/resumen"].title;
  const gate = await pageGate(TITLE);
  if (gate) return gate;
  const period = resolvePeriod((await searchParams).p);
  let d;
  try { d = await loadOverview(period); } catch (e) { console.error("[resumen]", e); return <LoadError title={TITLE} />; }
  const q = `?p=${period.days}`;

  return (
    <div className="space-y-10">
      {d.score.hasMock && <MockNotice />}
      <SectionHeader title={TITLE} question={msg.pages["/resumen"].question(ws().brand.name)} path="/resumen" period={period} />

      {d.leadsNotTracked && (
        <Notice>
          <p className="font-medium">Todavía no se registran envíos del formulario.</p>
          <p className="text-muted-foreground">El evento se agregó al sitio el 23 de octubre de 2026. Cuando el sitio esté publicado y lleguen envíos, los leads aparecerán aquí.</p>
        </Notice>
      )}

      <KpiRow>
        <Kpi comparable={d.comparable.traffic} refs={d.refs.sessions} term="sessions" icon={Users} label="Sessions" value={formatNumber(d.kpis.sessions[0] ?? 0)} current={d.kpis.sessions[0]} previous={d.kpis.sessions[1]} />
        <Kpi comparable={d.comparable.site} refs={d.refs.contacts} term="leads" icon={Inbox} label="Leads" value={formatNumber(d.kpis.contacts[0])} current={d.kpis.contacts[0]} previous={d.kpis.contacts[1]} hint={`Form ${d.contactsDetail.form} · WA ${d.contactsDetail.whatsapp} · llamada ${d.contactsDetail.call}`} />
        <Kpi comparable={d.comparable.seo} refs={d.refs.clicks} term="clicks" icon={Search} label="Organic clicks" value={formatNumber(d.kpis.organicClicks[0] ?? 0)} current={d.kpis.organicClicks[0]} previous={d.kpis.organicClicks[1]} hint="Sin pagar" />
        <Kpi refs={d.refs.paidShare} term="paid_share" icon={Percent} label="Paid traffic share" value={d.kpis.paidShare === null ? "-" : formatPct(d.kpis.paidShare, 0)} hint="Del total de visitas" />
      </KpiRow>

      <details open className="group space-y-4">
        <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="space-y-1">
            <h2 className="font-display text-2xl md:text-3xl">En qué concentrarte</h2>
            <span className="block text-sm text-muted-foreground">Lo más importante de todas las secciones. Toca un punto para ver la gráfica que lo respalda.</span>
          </span>
          <ChevronDown className="h-5 w-5 text-muted-foreground transition group-open:rotate-180" aria-hidden />
        </summary>
        <ol className="grid gap-2 mt-4">
          {d.focus.map((f, i) => {
            const { Icon, c, t } = ICON[f.tone];
            return (
              <li key={f.title}>
                <Link href={`${f.href}${q}${f.anchor ? `#${f.anchor}` : ""}`} className="group grid gap-2 rounded-xl bg-card p-4 md:p-5 md:grid-cols-[2rem_1fr_auto] hover:bg-secondary transition">
                  <span className="font-display text-2xl leading-none text-muted-foreground" aria-hidden>{i + 1}</span>
                  <span className="space-y-1">
                    <span className="block font-medium leading-snug">{f.title}</span>
                    {f.detail && <span className="block text-sm text-muted-foreground leading-snug">{f.detail}</span>}
                  </span>
                  <span className="flex md:flex-col items-center md:items-end gap-2 text-xs">
                    <span className="inline-flex items-center gap-1"><Icon className={`h-3.5 w-3.5 ${c}`} aria-hidden />{t}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{f.section}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </details>


      <Card title="Visitas por canal" note="Qué parte de tu tráfico es pagada y cuál llega sola.">
        <TrendChart points={d.traffic.channelSeries.points} keys={d.traffic.channelSeries.keys} stacked height={220} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="metas" title="Metas" note="Avance hacia lo que más mueve la llegada de clientes. Toca una para ver el detalle.">
          {d.goals.length ? (
            <ul className="space-y-5">
              {d.goals.map((g) => (
                <li key={g.id}>
                  <Link href={`${g.href.split("#")[0]}${q}${g.href.includes("#") ? `#${g.href.split("#")[1]}` : ""}`} className="group block space-y-2 rounded-lg -mx-2 px-2 py-1 hover:bg-background">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"><span className="text-foreground">{g.current}</span> / {g.target}</span>
                    </div>
                    <Progress value={g.pct} tone={g.tone} label={g.name} />
                    <span className="block text-xs text-muted-foreground">{g.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Las metas aparecen en cuanto haya datos de cada fuente.</p>}
        </Card>
        <Card id="actividad" title="Actividad reciente" note="Lo último que pasó: prospectos, seguimiento, contactos del sitio, publicaciones y análisis.">
          {d.activity.length ? (
            <ol className="space-y-4">
              {d.activity.map((a, i) => {
                const AIcon = ACTIVITY_ICON[a.kind];
                const body = (
                  <>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background text-muted-foreground"><AIcon className="h-4 w-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">{a.title}</span>
                      {a.detail && <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{formatShortDate(a.date)}</span>
                  </>
                );
                return <li key={`${a.kind}-${i}`}>{a.href ? <Link href={a.href} className="flex items-start gap-3 rounded-lg -mx-2 px-2 py-1 hover:bg-background">{body}</Link> : <div className="flex items-start gap-3">{body}</div>}</li>;
              })}
            </ol>
          ) : <p className="text-sm text-muted-foreground">Sin actividad en los últimos 30 días.</p>}
        </Card>
      </div>

      <section aria-labelledby="sections-h" className="space-y-4">
        <h2 id="sections-h" className="font-display text-2xl md:text-3xl">Por sección</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {d.sections.map((s) => {
            const count = (t: string) => s.insights.filter((i) => i.tone === t).length;
            const lead = s.insights[0];
            return (
              <Link key={s.id} href={`${s.href}${q}`} className="group rounded-xl bg-card p-5 flex flex-col gap-3 hover:bg-secondary transition">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl">{s.title}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" aria-hidden />
                </span>
                <span className="text-sm text-muted-foreground">{s.question}</span>
                {lead && <span className="text-sm leading-snug">{lead.title}</span>}
                <span className="mt-auto flex gap-3 text-xs">
                  {(["bad", "watch", "good"] as const).map((t) => { const { Icon, c, t: name } = ICON[t]; return <span key={t} className="inline-flex items-center gap-1"><Icon className={`h-3.5 w-3.5 ${c}`} aria-hidden />{count(t)} {name.toLowerCase()}</span>; })}
                </span>
              </Link>
            );
          })}
          <Link href="/calificacion" className="group rounded-xl bg-card p-5 flex flex-col gap-3 hover:bg-secondary transition">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xl">Calificación</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </span>
            <span className="font-display text-5xl leading-none">{d.score.scorecard.overall === null ? "-" : formatNumber(d.score.scorecard.overall)}<span className="text-lg text-muted-foreground">/100</span></span>
            <span className="text-sm text-muted-foreground">Sobre el {formatPct(d.score.scorecard.coverage, 0)} de las métricas contra benchmarks de industria. Sube conforme se conecten más fuentes.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
