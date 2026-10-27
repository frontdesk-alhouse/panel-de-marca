import { ws } from "@/lib/workspace/store";
import { z } from "zod";
import { ACTIVITY_TYPES, COMPANY_SIZES, INDUSTRIES, LEAD_CHANNELS, LEAD_STAGES } from "@/db/schema";

const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().optional();
/** Dinero escrito como sea: «48,000», «$48,000.50», «48 000». Vacío = sin dato. */
export const money = z.string().optional().transform((v, ctx) => {
  const clean = (v ?? "").replace(/[$,\s]/g, "").replace(/mxn/i, "");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
    ctx.addIssue({ code: "custom", message: "Escribe solo el monto, por ejemplo 48000 o 48,000" });
    return z.NEVER;
  }
  return n;
});
const optionalDate = z.union([z.iso.date(), z.literal("")]).transform((v) => v || null).optional();

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal("")]).transform((v) => (v === "" ? null : v)).nullable().optional();

export const leadInput = z.object({
  company: optionalText(160),
  contactName: optionalText(120),
  contactRole: optionalText(120),
  email: z.union([z.email("Correo no válido").max(200), z.literal("")]).transform((v) => v || null).optional(),
  phone: optionalText(40),
  industry: optionalEnum(INDUSTRIES),
  needs: optionalText(4000),
  owner: optionalText(200),
  channel: z.enum(LEAD_CHANNELS),
  stage: z.enum(LEAD_STAGES),
  value: money,
  outcomeReason: optionalText(1000),
  nextStep: optionalText(500),
  nextStepAt: optionalDate,
  createdOn: optionalDate,
  closedOn: optionalDate,
  title: optionalText(60),
  birthday: optionalDate,
  personalNotes: optionalText(4000),
  doNotNurture: z.string().optional().transform((v) => v === "on"),
  monthlyRevenue: money,
  companySize: optionalEnum(COMPANY_SIZES),
  website: optionalText(300),
  instagram: optionalText(300),
  facebook: optionalText(300),
  tiktok: optionalText(300),
  linkedin: optionalText(300),
  /** Solo servicios de la configuración de la marca (workspace.services). */
  services: z.array(z.string().trim().min(1).max(80)).optional().default([])
    .refine((list) => list.every((s) => ws().services.includes(s)), { message: "Hay un servicio que no está en la configuración" }),
  retainer: z.string().optional().transform((v) => v === "on"),
  monthlyFee: money,
}).refine((d) => d.company || d.contactName, { message: "Pon al menos la empresa o el nombre del contacto", path: ["company"] });

export type LeadInput = z.infer<typeof leadInput>;

export const activityInput = z.object({
  type: z.enum(ACTIVITY_TYPES),
  happenedAt: z.iso.date(),
  summary: z.string().trim().min(2, "Describe qué hicieron").max(4000),
  result: optionalText(2000),
  withWhom: optionalText(200),
  nextStep: optionalText(500),
  nextStepAt: z.union([z.iso.date(), z.literal("")]).transform((v) => v || null).optional(),
});

export type ActivityInput = z.infer<typeof activityInput>;

/** Campos que pueden venir varias veces (checkboxes). */
const MULTI = new Set(["services"]);

/** FormData → objeto plano (solo texto; los campos múltiples como arreglo). */
export function formToObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (MULTI.has(k)) out[k] = [...((out[k] as string[] | undefined) ?? []), v];
    else out[k] = v;
  }
  return out;
}

/** Errores de zod por campo, para mostrarlos junto al input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
