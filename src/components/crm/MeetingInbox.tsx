import { ExternalLink } from "lucide-react";
import { approveMeeting, discardMeeting } from "@/app/crm/actions";
import { ProposalSchema } from "@/lib/crm/meeting-schema";
import type { meetingProposals } from "@/db/schema";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { control, Field } from "./fields";

type Row = typeof meetingProposals.$inferSelect;
interface LeadOption { id: number; label: string }
const CONFIDENCE: Record<Row["confidence"], { text: string; tone: string }> = {
  alta: { text: "Coincidencia alta", tone: "bg-good" }, media: { text: "Coincidencia media", tone: "bg-warn" }, baja: { text: "Sin cliente claro", tone: "bg-bad" },
};

function ProposalCard({ row, leads, open }: { row: Row; leads: LeadOption[]; open: boolean }) {
  const parsed = ProposalSchema.safeParse(row.proposal);
  if (!parsed.success) return null;
  const p = parsed.data;
  const f = (name: string) => `m${row.id}-${name}`;
  const c = CONFIDENCE[row.confidence];
  return (
    <details open={open} className="group rounded-xl bg-background">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[11px] uppercase text-muted-foreground">{formatShortDate(row.happenedAt.toISOString().slice(0, 10))}</span>
        <span className="font-medium">{row.title || p.withWhom || "Reunión sin título"}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", c.tone)} aria-hidden />{c.text}</span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Revisar →</span>
      </summary>
      <form action={approveMeeting} className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={row.id} />
        <div className="space-y-1 md:col-span-2">
          <p className="text-sm text-muted-foreground">{row.matchReason}</p>
          {row.shareLink && (
            <a href={row.shareLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
              Ver la nota en Wispr <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
        <Field label="Cliente" name="leadId" id={f("lead")}>
          <select id={f("lead")} name="leadId" defaultValue={row.leadId ? String(row.leadId) : "nuevo"} className={`${control} h-9`}>
            <option value="nuevo">+ Crear prospecto nuevo</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>
        {!row.leadId && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa (si es nuevo)" name="company" id={f("company")}><input id={f("company")} name="company" defaultValue={p.newLead?.company ?? ""} className={`${control} h-9`} /></Field>
            <Field label="Contacto" name="contactName" id={f("contact")}><input id={f("contact")} name="contactName" defaultValue={p.newLead?.contactName ?? p.withWhom ?? ""} className={`${control} h-9`} /></Field>
          </div>
        )}
        <Field label="Qué se habló" name="summary" id={f("summary")} className="md:col-span-2">
          <textarea id={f("summary")} name="summary" rows={4} defaultValue={p.summary} required className={`${control} py-2`} />
        </Field>
        <Field label="Necesidades" name="needs" id={f("needs")}><textarea id={f("needs")} name="needs" rows={3} defaultValue={p.needs ?? ""} className={`${control} py-2`} /></Field>
        <Field label="Notas personales" name="personalNotes" id={f("notes")} hint="Se suman a la ficha con la fecha"><textarea id={f("notes")} name="personalNotes" rows={3} defaultValue={p.personalNotes ?? ""} className={`${control} py-2`} /></Field>
        <Field label="Siguiente paso" name="nextStep" id={f("next")}><input id={f("next")} name="nextStep" defaultValue={p.nextStep ?? ""} className={`${control} h-9`} /></Field>
        <Field label="Fecha del siguiente paso" name="nextStepAt" id={f("nextAt")}><input id={f("nextAt")} type="date" name="nextStepAt" defaultValue={p.nextStepAt ?? ""} className={`${control} h-9`} /></Field>
        {(p.objections.length > 0 || p.risks.length > 0 || p.interest) && (
          <div className="grid gap-3 text-sm md:col-span-2 md:grid-cols-3">
            {p.interest && <p><span className="font-mono text-[11px] uppercase text-muted-foreground">Interés</span><br />{p.interest}</p>}
            {p.objections.length > 0 && <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Objeciones</p><ul className="list-disc pl-4">{p.objections.map((o) => <li key={o}>{o}</li>)}</ul></div>}
            {p.risks.length > 0 && <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Riesgos</p><ul className="list-disc pl-4">{p.risks.map((o) => <li key={o}>{o}</li>)}</ul></div>}
          </div>
        )}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button type="submit" className="h-9 rounded-md bg-primary px-4 font-mono text-[11px] uppercase text-primary-foreground transition active:scale-[0.97] hover:opacity-85">Aprobar y guardar en la ficha</button>
          <button type="submit" formAction={discardMeeting} formNoValidate className="h-9 rounded-md bg-card px-4 font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground">Descartar</button>
        </div>
      </form>
    </details>
  );
}

/** Reuniones de Wispr Flow (carpeta «Clientes») esperando revisión. Nada llega a la ficha sin aprobar. */
export function MeetingInbox({ rows, leads }: { rows: Row[]; leads: LeadOption[] }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="inbox-h" className="space-y-3 rounded-2xl bg-card p-5">
      <div>
        <h2 id="inbox-h" className="font-medium">Reuniones por revisar · {rows.length}</h2>
        <p className="text-sm text-muted-foreground">Vienen de la carpeta «Clientes» de Wispr Flow. Revisa a qué cliente pertenecen y qué se guarda; nada entra a la ficha sin tu aprobación.</p>
      </div>
      <div className="space-y-2">{rows.map((r, i) => <ProposalCard key={r.id} row={r} leads={leads} open={i === 0} />)}</div>
    </section>
  );
}
