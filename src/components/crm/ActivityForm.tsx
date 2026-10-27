"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { logActivity, type FormState } from "@/app/crm/actions";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import { control, Field, Options, Submit } from "./fields";

/** Registrar qué hicimos con el prospecto, con quién y qué resultó. */
export function ActivityForm({ leadId, today }: { leadId: number; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(logActivity, {});
  const form = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  useEffect(() => {
    if (state.ok) { toast.success("Actividad registrada"); form.current?.reset(); }
  }, [state]);

  return (
    <form ref={form} onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }} className="grid gap-3 sm:grid-cols-2" noValidate>
      <input type="hidden" name="leadId" value={leadId} />
      {e.form && <p role="alert" className="sm:col-span-2 text-sm text-bad">{e.form}</p>}
      <Field label="Tipo" name="type"><select id="type" name="type" defaultValue="llamada" className={`${control} h-9`}><Options labels={ACTIVITY_LABELS} /></select></Field>
      <Field label="Fecha" name="happenedAt" error={e.happenedAt}><input id="happenedAt" name="happenedAt" type="date" defaultValue={today} className={`${control} h-9`} /></Field>
      <Field label="Qué hicimos" name="summary" error={e.summary} className="sm:col-span-2">
        <textarea id="summary" name="summary" rows={2} className={`${control} py-2`} aria-invalid={Boolean(e.summary)} aria-describedby={e.summary ? "summary-error" : undefined} />
      </Field>
      <Field label="Con quién" name="withWhom"><input id="withWhom" name="withWhom" placeholder="Persona del lado del cliente" className={`${control} h-9`} /></Field>
      <Field label="Resultado" name="result"><input id="result" name="result" placeholder="Qué salió de esto" className={`${control} h-9`} /></Field>
      <Field label="Siguiente paso (opcional)" name="nextStep" id="nextStep-a"><input id="nextStep-a" name="nextStep" className={`${control} h-9`} /></Field>
      <Field label="Fecha del siguiente paso" name="nextStepAt" id="nextStepAt-a"><input id="nextStepAt-a" name="nextStepAt" type="date" className={`${control} h-9`} /></Field>
      <div className="sm:col-span-2"><Submit pending={pending}>Registrar actividad</Submit></div>
    </form>
  );
}
