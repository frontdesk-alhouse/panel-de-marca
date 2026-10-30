import { getMessages } from "@/i18n/server";
import Link from "next/link";
import { pageGate, LoadError } from "@/lib/page-gate";
import { listLeads, type LeadFilters } from "@/lib/crm/store";
import { summarize, crmInsights } from "@/lib/crm/summary";
import { CHANNEL_LABELS, INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { isOverdue } from "@/lib/crm/transitions";
import { LEAD_STAGES } from "@/db/schema";
import { todayIso } from "@/lib/dates";
import { formatMoney, formatPct, formatShortDate } from "@/lib/format";
import { rankInsights, forAnchor } from "@/lib/analytics/insights";
import { SectionHeader } from "@/components/dash/SectionHeader";
import { DataSources } from "@/components/dash/DataSources";
import { WithRail } from "@/components/dash/InsightRail";
import { Card } from "@/components/dash/Funnel";
import { DataTable, type Row } from "@/components/dash/DataTable";
import { cn } from "@/lib/utils";
import { pendingProposals } from "@/lib/crm/meetings";
import { MeetingInbox } from "@/components/crm/MeetingInbox";

export const dynamic = "force-dynamic";
const FILTERS = [{ key: "abiertos", label: "Abiertos" }, { key: "", label: "Todos" }, ...LEAD_STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] }))];

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const msg = await getMessages();
  const TITLE = msg.pages["/crm"].title;
  const gate = await pageGate(TITLE);
  if (gate) return gate;
  const e = (await searchParams).e ?? "abiertos";
  const stage = (FILTERS.some((f) => f.key === e) ? e : "abiertos") as LeadFilters["stage"] | "";
  const today = todayIso();
  let all, shown, inbox;
  try {
    all = (await listLeads()).map((r) => r.lead);
    shown = await listLeads(stage ? { stage } : {});
    inbox = await pendingProposals().catch((err) => { console.error("[crm] bandeja", err); return []; });
  } catch (err) { console.error("[crm]", err); return <LoadError title={TITLE} />; }
  const s = summarize(all, today);
  const insights = rankInsights(crmInsights(all, today));

  const rows: Row[] = shown.map(({ lead: l, lastActivityAt }) => ({
    id: String(l.id),
    empresa: { text: l.company ?? l.contactName ?? `#${l.id}`, href: `/crm/${l.id}` },
    contacto: l.company ? [l.title, l.contactName].filter(Boolean).join(" ") || null : null,
    industria: l.industry ? INDUSTRY_LABELS[l.industry] : null,
    etapa: [{ text: STAGE_LABELS[l.stage], tone: l.stage === "cerrado" ? "good" : l.stage === "perdido" ? "bad" : l.stage === "propuesta" ? "watch" : "neutral" }],
    siguiente: l.nextStep ? `${l.nextStep}${l.nextStepAt ? ` · ${formatShortDate(l.nextStepAt)}` : ""}` : null,
    vencido: [
      ...(isOverdue(l.nextStepAt, l.stage, today) && !l.doNotNurture ? [{ text: "Vencido", tone: "bad" as const }] : []),
      ...(l.doNotNurture ? [{ text: "No nutrir", tone: "neutral" as const }] : []),
    ],
    responsable: l.owner,
    canal: CHANNEL_LABELS[l.channel],
    valor: l.value,
    ultima: lastActivityAt ? new Date(lastActivityAt).toISOString().slice(0, 10) : null,
  }));

  const stat = (label: string, value: string, tone?: "bad") => (
    <div className="rounded-xl bg-card p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">{label}</p><p className={cn("mt-1 font-display text-3xl", tone === "bad" && "text-bad")}>{value}</p></div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader title={TITLE} question={msg.pages["/crm"].question} path="/crm" />
        <DataSources intro="Los prospectos se capturan aquí (a mano, desde el formulario o reuniones). Su canal de origen se cruza con Google Analytics, Google Ads y Meta Ads para saber qué canal trae clientes." items={[{ label: "CRM del panel", on: true }, "ga4", "gads", "meta"]} />
        <Link href="/crm/nuevo" className="h-9 inline-flex items-center rounded-md bg-primary px-4 font-mono text-[11px] uppercase text-primary-foreground hover:opacity-85">+ Nuevo prospecto</Link>
      </div>
      <MeetingInbox rows={inbox} leads={all.map((l) => ({ id: l.id, label: [l.company, l.contactName].filter(Boolean).join(" · ") || `#${l.id}` }))} />
      <WithRail insights={insights}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stat("Abiertos", String(s.open))}
          {stat("Siguiente paso vencido", String(s.overdue), s.overdue ? "bad" : undefined)}
          {stat("En propuesta", String(s.proposals))}
          {stat("Tasa de cierre", s.closeRate === null ? "–" : formatPct(s.closeRate, 0))}
          {stat("Valor abierto", s.openValue ? formatMoney(s.openValue) : "–")}
        </div>
        <Card id="lista" insights={forAnchor(insights, "lista")} title="Prospectos" note="Ordenados por fecha del siguiente paso: lo más urgente arriba.">
          <nav aria-label="Filtrar por etapa" className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Link key={f.label} href={f.key ? `/crm?e=${f.key}` : "/crm?e="} aria-current={f.key === stage ? "true" : undefined}
                className={cn("h-7 inline-flex items-center rounded-md px-3 font-mono text-[11px] uppercase transition", f.key === stage ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")}>
                {f.label}{f.key && f.key !== "abiertos" && s.byStage[f.key] ? ` · ${s.byStage[f.key]}` : ""}
              </Link>
            ))}
          </nav>
          {rows.length ? (
            <DataTable caption="Prospectos" rows={rows} limit={50} columns={[
              { key: "empresa", label: "Empresa", type: "link" },
              { key: "contacto", label: "Contacto", type: "text", hideOnMobile: true },
              { key: "industria", label: "Industria", type: "text", hideOnMobile: true },
              { key: "etapa", label: "Etapa", type: "chips" },
              { key: "siguiente", label: "Siguiente paso", type: "text" },
              { key: "vencido", label: "", type: "chips" },
              { key: "responsable", label: "Responsable", type: "text", hideOnMobile: true },
              { key: "canal", label: "Canal", type: "text", hideOnMobile: true },
              { key: "valor", label: "Valor", type: "mxn", hideOnMobile: true },
              { key: "ultima", label: "Última actividad", type: "text", hideOnMobile: true },
            ]} />
          ) : (
            <p className="rounded-lg bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              No hay prospectos aquí. <Link href="/crm/nuevo" className="underline">Agrega el primero</Link>.
            </p>
          )}
        </Card>
      </WithRail>
    </div>
  );
}
