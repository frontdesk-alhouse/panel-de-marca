"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { loadWorkspace } from "@/lib/workspace/load";
import { activityInput, fieldErrors, formToObject, leadInput } from "@/lib/crm/validation";
import { addActivity, createLead, updateLead } from "@/lib/crm/store";

export interface FormState { errors?: Record<string, string>; ok?: boolean }

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Sesión requerida");
  // La validación de servicios lee la configuración de la marca.
  if (!(await loadWorkspace())) throw new Error("Falta la configuración de la marca");
  return viewer;
}

const parseId = (raw: FormDataEntryValue | null) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function saveLead(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = leadInput.safeParse(formToObject(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const id = parseId(fd.get("id"));
  let newId: number | null = null;
  try {
    if (id) {
      if (!(await updateLead(id, parsed.data))) return { errors: { form: "Ese prospecto ya no existe." } };
    } else {
      newId = await createLead(parsed.data, viewer.name);
    }
  } catch (e) {
    console.error("[crm] no se pudo guardar el prospecto", e);
    return { errors: { form: "No se pudo guardar. Intenta de nuevo." } };
  }
  revalidatePath("/crm");
  // redirect lanza una excepción propia de Next: va fuera del try.
  if (newId) redirect(`/crm/${newId}`);
  revalidatePath(`/crm/${id}`);
  return { ok: true };
}

export async function logActivity(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const leadId = parseId(fd.get("leadId"));
  if (!leadId) return { errors: { form: "Prospecto no válido." } };
  const parsed = activityInput.safeParse(formToObject(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    if (!(await addActivity(leadId, parsed.data, viewer.name))) return { errors: { form: "Ese prospecto ya no existe." } };
  } catch (e) {
    console.error("[crm] no se pudo registrar la actividad", e);
    return { errors: { form: "No se pudo guardar. Intenta de nuevo." } };
  }
  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/crm");
  return { ok: true };
}

const optional = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 4000) : null);

/** Bandeja de reuniones: aprobar lleva lo aprendido a la ficha del cliente. */
export async function approveMeeting(fd: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = parseId(fd.get("id"));
  const rawLead = fd.get("leadId");
  const leadId = rawLead === "nuevo" ? "nuevo" : parseId(rawLead);
  const summary = optional(fd.get("summary"));
  const nextStepAt = optional(fd.get("nextStepAt"));
  if (!id || !leadId || !summary) throw new Error("Falta el cliente o el resumen");
  if (nextStepAt && !/^\d{4}-\d{2}-\d{2}$/.test(nextStepAt)) throw new Error("Fecha inválida");
  const { approveProposal } = await import("@/lib/crm/meetings");
  await approveProposal(id, {
    leadId, summary, needs: optional(fd.get("needs")), nextStep: optional(fd.get("nextStep")), nextStepAt,
    personalNotes: optional(fd.get("personalNotes")), company: optional(fd.get("company")), contactName: optional(fd.get("contactName")),
  }, viewer.name);
  revalidatePath("/crm");
}

export async function discardMeeting(fd: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = parseId(fd.get("id"));
  if (!id) return;
  const { discardProposal } = await import("@/lib/crm/meetings");
  await discardProposal(id, viewer.name);
  revalidatePath("/crm");
}
