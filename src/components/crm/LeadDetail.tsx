import Link from "next/link";
import { getViewer } from "@/auth";
import { getLead, listLeads } from "@/lib/crm/store";
import { ACTIVITY_LABELS, OUTCOME_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { isOverdue } from "@/lib/crm/transitions";
import { todayIso } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { LeadForm } from "@/components/crm/LeadForm";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { Card } from "@/components/dash/Funnel";
import { cn } from "@/lib/utils";
import { LEAD_STAGES } from "@/db/schema";
import { setLeadStage } from "@/app/crm/actions";

/**
 * Detalle de un prospecto: datos y seguimiento (editables), registrar actividad e historial.
 * Lo usan la página /crm/[id] y el pop-up que se abre desde la lista. `null` si no existe.
 */
export async function LeadDetail({ id, inModal = false }: { id: number; inModal?: boolean }) {
  const data = await getLead(id);
  if (!data) return null;
  const owners = [...new Set((await listLeads()).map((r) => r.lead.owner).filter((o): o is string => Boolean(o)))];
  const { lead, activities } = data;
  const viewer = (await getViewer())!;
  const today = todayIso();
  const overdue = isOverdue(lead.nextStepAt, lead.stage, today);
  const Title = inModal ? "h2" : "h1";

  return (
    <div className="space-y-6">
      {!inModal && <Link href="/crm" className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground">← CRM</Link>}
      <header className="space-y-2 pr-8">
        <Title className="font-display text-3xl leading-none md:text-5xl">{lead.company ?? lead.contactName}</Title>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] uppercase text-foreground">{STAGE_LABELS[lead.stage]}</span>
          {lead.outcome && <span>{OUTCOME_LABELS[lead.outcome]}</span>}
          {lead.doNotNurture && <span className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] uppercase">No nutrir</span>}
          {lead.contactName && <span>{[lead.title, lead.contactName].filter(Boolean).join(" ")}</span>}
          {lead.email && <a href={`mailto:${lead.email}`} className="underline-offset-2 hover:underline">{lead.email}</a>}
          {lead.phone && <a href={`tel:${lead.phone}`} className="underline-offset-2 hover:underline">{lead.phone}</a>}
          {lead.nextStep && lead.stage !== "cerrado" && lead.stage !== "perdido" && <span className={cn(overdue && "text-bad")}>Siguiente: {lead.nextStep}{lead.nextStepAt ? ` · ${formatShortDate(lead.nextStepAt)}` : ""}{overdue ? " (vencido)" : ""}</span>}
        </p>
      </header>
      {/* Etapa en un clic: lo más común en el seguimiento, sin bajar al formulario. */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Cambiar etapa">
        <span className="mr-1 font-mono text-[11px] uppercase text-muted-foreground">Etapa</span>
        {LEAD_STAGES.map((st) => (
          <form key={st} action={setLeadStage}>
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="stage" value={st} />
            <button type="submit" disabled={st === lead.stage} aria-pressed={st === lead.stage}
              className={cn("h-8 rounded-lg px-3 text-sm transition active:scale-95",
                st === lead.stage ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
              {STAGE_LABELS[st]}
            </button>
          </form>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card id="datos" title="Datos y seguimiento" note="Aquí cambias la etapa, el estatus, el siguiente paso y los datos de contacto."><LeadForm lead={lead} owners={owners} me={viewer.name} /></Card>
        <div className="min-w-0 space-y-6">
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
