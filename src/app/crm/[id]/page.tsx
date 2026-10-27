import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/auth";
import { pageGate, LoadError } from "@/lib/page-gate";
import { getLead, listLeads } from "@/lib/crm/store";
import { ACTIVITY_LABELS, OUTCOME_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { isOverdue } from "@/lib/crm/transitions";
import { todayIso } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { LeadForm } from "@/components/crm/LeadForm";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { Card } from "@/components/dash/Funnel";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProspectoPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await pageGate("Prospecto");
  if (gate) return gate;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  let data, owners: string[];
  try {
    data = await getLead(id);
    owners = [...new Set((await listLeads()).map((r) => r.lead.owner).filter((o): o is string => Boolean(o)))];
  } catch (e) { console.error("[crm]", e); return <LoadError title="Prospecto" />; }
  if (!data) notFound();
  const { lead, activities } = data;
  const viewer = (await getViewer())!;
  const today = todayIso();
  const overdue = isOverdue(lead.nextStepAt, lead.stage, today);

  return (
    <div className="space-y-6">
      <Link href="/crm" className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground">← CRM</Link>
      <header className="space-y-2">
        <h1 className="font-display text-4xl md:text-5xl leading-none">{lead.company ?? lead.contactName}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] uppercase text-foreground">{STAGE_LABELS[lead.stage]}</span>
          {lead.outcome && <span>{OUTCOME_LABELS[lead.outcome]}</span>}
          {lead.doNotNurture && <span className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] uppercase">No nutrir</span>}
          {lead.contactName && <span>{[lead.title, lead.contactName].filter(Boolean).join(" ")}</span>}
          {lead.nextStep && lead.stage !== "cerrado" && lead.stage !== "perdido" && <span className={cn(overdue && "text-bad")}>Siguiente: {lead.nextStep}{lead.nextStepAt ? ` · ${formatShortDate(lead.nextStepAt)}` : ""}{overdue ? " (vencido)" : ""}</span>}
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card id="datos" title="Datos y seguimiento"><LeadForm lead={lead} owners={owners} me={viewer.name} /></Card>
        <div className="space-y-6 min-w-0">
          <Card id="actividad" title="Registrar actividad" note="Qué hicimos, con quién y qué resultó."><ActivityForm leadId={lead.id} today={today} /></Card>
          <Card id="historial" title="Historial">
            {activities.length ? (
              <ol className="space-y-4">
                {activities.map((a) => (
                  <li key={a.id} className="border-l-2 border-border pl-3">
                    <p className="font-mono text-[11px] uppercase text-muted-foreground">{ACTIVITY_LABELS[a.type]} · {a.happenedAt.toISOString().slice(0, 10)} · {a.author}</p>
                    <p className="text-sm">{a.summary}</p>
                    {(a.withWhom || a.result) && <p className="text-xs text-muted-foreground">{a.withWhom ? `Con ${a.withWhom}. ` : ""}{a.result ? `Resultado: ${a.result}` : ""}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">Aún no hay actividades registradas.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
