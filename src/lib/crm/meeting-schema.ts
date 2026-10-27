import { z } from "zod";
import { INDUSTRIES } from "@/db/schema";

/** Lo que manda el proceso de sincronización por cada reunión de la carpeta «Clientes». */
export const ProposalSchema = z.object({
  externalId: z.string().min(1).max(100),
  title: z.string().max(300).nullish(),
  happenedAt: z.iso.datetime({ offset: true }),
  shareLink: z.url().max(500).refine((u) => u.startsWith("https://notes.wisprflow.ai/"), "Solo links de Wispr").nullish(),
  leadId: z.number().int().positive().nullable(),
  confidence: z.enum(["alta", "media", "baja"]),
  matchReason: z.string().max(300),
  newLead: z.object({ company: z.string().max(160).nullish(), contactName: z.string().max(120).nullish(), industry: z.enum(INDUSTRIES).nullish() }).nullish(),
  withWhom: z.string().max(200).nullish(),
  summary: z.string().min(1).max(1200),
  needs: z.string().max(1500).nullish(),
  objections: z.array(z.string().max(300)).max(8).default([]),
  interest: z.enum(["alto", "medio", "bajo"]).nullish(),
  risks: z.array(z.string().max(300)).max(8).default([]),
  nextStep: z.string().max(500).nullish(),
  nextStepAt: z.iso.date().nullish(),
  personalNotes: z.string().max(1500).nullish(),
});
export type Proposal = z.infer<typeof ProposalSchema>;
export const IngestSchema = z.object({ proposals: z.array(ProposalSchema).max(50) });

/** Suma texto nuevo a un campo con la fecha, sin repetir lo que ya estaba. */
export const appendDated = (current: string | null, add: string | null | undefined, day: string): string | null =>
  !add?.trim() ? current : current?.includes(add.trim()) ? current : [current, `${day}: ${add.trim()}`].filter(Boolean).join("\n");
