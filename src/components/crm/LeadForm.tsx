"use client";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { localeSettings } from "@/lib/workspace/store";
import { startTransition, useActionState, useEffect } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { saveLead, type FormState } from "@/app/crm/actions";
import type { Lead } from "@/lib/crm/store";
import { CHANNEL_LABELS, COMPANY_SIZE_HELP, COMPANY_SIZE_LABELS, INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { control, Field, Options, Submit } from "./fields";

const toDate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** Explicación del tamaño de empresa: siempre a la mano. */
function SizeHelp() {
  return (
    <Popover>
      <PopoverTrigger openOnHover delay={100} aria-label="Cómo se define el tamaño" className="inline-flex align-middle text-muted-foreground hover:text-foreground">
        <Info className="h-3.5 w-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3 text-sm">{COMPANY_SIZE_HELP}</PopoverContent>
    </Popover>
  );
}

/**
 * Alta y edición de un prospecto. Se envía con onSubmit (no con `action`) para
 * que React no limpie el formulario: si algo no pasa la validación, lo escrito
 * se queda y solo se marca el campo con error.
 */
export function LeadForm({ lead, owners, me }: { lead?: Lead; owners: string[]; me: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLead, {});
  const workspace = useWorkspace();
  const currency = workspace.locale.currency;
  const e = state.errors ?? {};
  useEffect(() => {
    if (state.ok) toast.success("Prospecto guardado");
    else if (state.errors) toast.error("Revisa los campos marcados");
  }, [state]);
  const v = (k: keyof Lead) => (lead?.[k] ?? "") as string;
  const err = (k: string) => (e[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});
  const input = (name: keyof Lead | string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={props.defaultValue ?? (typeof name === "string" && name in (lead ?? {}) ? v(name as keyof Lead) : "")} className={`${control} h-9`} {...err(name)} {...props} />
  );
  const services = new Set(lead?.services ?? []);

  return (
    <form
      onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }}
      className="space-y-7" noValidate
    >
      {lead && <input type="hidden" name="id" value={lead.id} />}
      {e.form && <p role="alert" className="rounded-md bg-background px-3 py-2 text-sm text-bad">{e.form}</p>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-medium">A quién llegamos</legend>
        <Field label="Empresa" name="company" error={e.company}>{input("company")}</Field>
        <Field label="Industria" name="industry"><select id="industry" name="industry" defaultValue={v("industry")} className={`${control} h-9`}><Options labels={INDUSTRY_LABELS} empty="Sin definir" /></select></Field>
        <Field label="Tamaño de empresa" name="companySize">
          <div className="flex items-center gap-2">
            <select id="companySize" name="companySize" defaultValue={v("companySize")} className={`${control} h-9`}><Options labels={COMPANY_SIZE_LABELS} empty="Sin definir" /></select>
            <SizeHelp />
          </div>
        </Field>
        <Field label={`Ingresos mensuales aprox. (${currency})`} name="monthlyRevenue" error={e.monthlyRevenue}>{input("monthlyRevenue", { inputMode: "decimal", defaultValue: lead?.monthlyRevenue?.toLocaleString(localeSettings().locale) ?? "", placeholder: "500,000" })}</Field>
        <Field label="Título" name="title">{input("title", { placeholder: "Dr., Ing., Arq., Lic." })}</Field>
        <Field label="Contacto" name="contactName">{input("contactName")}</Field>
        <Field label="Puesto" name="contactRole">{input("contactRole", { placeholder: "Dueño, director médico…" })}</Field>
        <Field label="Cumpleaños" name="birthday" error={e.birthday}>{input("birthday", { type: "date", defaultValue: v("birthday") })}</Field>
        <Field label="Correo" name="email" error={e.email}>{input("email", { type: "email" })}</Field>
        <Field label="Teléfono / WhatsApp" name="phone">{input("phone", { type: "tel" })}</Field>
      </fieldset>

      <details className="group rounded-lg bg-background/60 px-4 py-3" open={Boolean(lead?.website || lead?.instagram || lead?.facebook || lead?.tiktok || lead?.linkedin)}>
        <summary className="cursor-pointer text-sm font-medium">Sitio y redes <span className="font-normal text-muted-foreground">(opcional)</span></summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Sitio web" name="website">{input("website", { placeholder: "empresa.com" })}</Field>
          <Field label="Instagram" name="instagram">{input("instagram", { placeholder: "@usuario" })}</Field>
          <Field label="Facebook" name="facebook">{input("facebook")}</Field>
          <Field label="TikTok" name="tiktok">{input("tiktok", { placeholder: "@usuario" })}</Field>
          <Field label="LinkedIn" name="linkedin">{input("linkedin")}</Field>
        </div>
      </details>

      <Field label="Necesidades" name="needs"><textarea id="needs" name="needs" rows={3} defaultValue={v("needs")} placeholder="Qué buscan, qué problema tienen, presupuesto, tiempos" className={`${control} py-2`} /></Field>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-medium">Seguimiento</legend>
        <Field label="Etapa" name="stage"><select id="stage" name="stage" defaultValue={v("stage") || "nuevo"} className={`${control} h-9`}><Options labels={STAGE_LABELS} /></select></Field>
        <Field label="Cómo llegó" name="channel"><select id="channel" name="channel" defaultValue={v("channel") || "otro"} className={`${control} h-9`}><Options labels={CHANNEL_LABELS} /></select></Field>
        <Field label="Responsable" name="owner">
          {input("owner", { list: "owners", defaultValue: v("owner") || me })}
          <datalist id="owners">{owners.map((o) => <option key={o} value={o} />)}</datalist>
        </Field>
        <Field label="Fecha de creación" name="createdOn" error={e.createdOn}>{input("createdOn", { type: "date", defaultValue: toDate(lead?.createdAt ?? new Date()) })}</Field>
        <Field label="Fecha de cierre" name="closedOn" error={e.closedOn} hint="Se llena sola al marcar Cerrado o Perdido">{input("closedOn", { type: "date", defaultValue: toDate(lead?.closedAt) })}</Field>
        <Field label={`Valor estimado (${currency})`} name="value" error={e.value}>{input("value", { inputMode: "decimal", defaultValue: lead?.value?.toLocaleString(localeSettings().locale) ?? "", placeholder: "48,000" })}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="retainer" defaultChecked={lead?.retainer ?? false} className="h-4 w-4 accent-[var(--foreground)]" />
          <span><span className="font-medium">Iguala mensual</span> <span className="text-muted-foreground">(retainer)</span></span>
        </label>
        <Field label={`Fee mensual (${currency})`} name="monthlyFee" error={e.monthlyFee} hint="Lo que nos paga cada mes, si tiene iguala">{input("monthlyFee", { inputMode: "decimal", defaultValue: lead?.monthlyFee?.toLocaleString(localeSettings().locale) ?? "", placeholder: "15,000" })}</Field>
        <div className="hidden sm:block" aria-hidden />
        <Field label="Siguiente paso" name="nextStep" className="sm:col-span-2">{input("nextStep", { placeholder: "Mandar propuesta, llamada de seguimiento…" })}</Field>
        <Field label="Fecha del siguiente paso" name="nextStepAt" error={e.nextStepAt}>{input("nextStepAt", { type: "date", defaultValue: v("nextStepAt") })}</Field>
        <div className="sm:col-span-3 space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">Servicios contratados</p>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {workspace.services.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="services" value={s} defaultChecked={services.has(s)} className="h-4 w-4 accent-[var(--foreground)]" />{s}
              </label>
            ))}
          </div>
        </div>
        <Field label="Resultado / por qué se cerró o se perdió" name="outcomeReason" className="sm:col-span-3">{input("outcomeReason")}</Field>
        <label className="sm:col-span-3 flex items-start gap-2 rounded-md bg-background/60 px-3 py-2.5 text-sm">
          <input type="checkbox" name="doNotNurture" defaultChecked={lead?.doNotNurture ?? false} className="mt-0.5 h-4 w-4 accent-[var(--bad)]" />
          <span><span className="font-medium">No nutrir</span> <span className="text-muted-foreground">· no fue buen match, pidió no ser contactado o no hubo buena resolución. Queda fuera de seguimientos.</span></span>
        </label>
      </fieldset>

      <Field label="Notas personales" name="personalNotes" hint="Lo que vamos aprendiendo de la persona: juega pádel, no le gusta el golf, tiene dos hijos…">
        <textarea id="personalNotes" name="personalNotes" rows={3} defaultValue={v("personalNotes")} className={`${control} py-2`} />
      </Field>

      <Submit pending={pending}>{lead ? "Guardar cambios" : "Crear prospecto"}</Submit>
    </form>
  );
}
