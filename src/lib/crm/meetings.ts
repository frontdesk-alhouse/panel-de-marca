import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, meetingProposals } from "@/db/schema";
import { appendDated, ProposalSchema, type Proposal } from "./meeting-schema";
export { IngestSchema, ProposalSchema } from "./meeting-schema";
import { addActivity, createLead } from "./store";
import { leadInput } from "./validation";

/** Secreto propio de la sincronización: no reutiliza el de los crons. */
export function hasValidSyncSecret(req: Request): boolean {
  const secret = process.env.MEETINGS_SYNC_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lo que necesita el proceso para cruzar reuniones con prospectos: ids ya recibidos y la lista de prospectos. */
export async function syncContext() {
  const db = await getDb();
  const [known, people] = await Promise.all([
    db.select({ id: meetingProposals.externalId }).from(meetingProposals),
    db.select({ id: leads.id, company: leads.company, contactName: leads.contactName, title: leads.title, email: leads.email, industry: leads.industry, stage: leads.stage })
      .from(leads).where(sql`coalesce(${leads.meta}->>'mock', 'false') <> 'true'`),
  ]);
  return { known: known.map((k) => k.id), leads: people };
}

/** Guarda propuestas nuevas como pendientes; las ya recibidas no se tocan (no pisa una revisión). */
export async function ingestProposals(list: Proposal[]): Promise<{ added: number; skipped: number }> {
  if (!list.length) return { added: 0, skipped: 0 };
  const db = await getDb();
  const ids = [...new Set(list.map((p) => p.leadId).filter((x): x is number => x !== null))];
  const valid = new Set(ids.length ? (await db.select({ id: leads.id }).from(leads).where(inArray(leads.id, ids))).map((r) => r.id) : []);
  const rows = list.map((p) => ({
    externalId: p.externalId, title: p.title ?? null, happenedAt: new Date(p.happenedAt), shareLink: p.shareLink ?? null,
    leadId: p.leadId !== null && valid.has(p.leadId) ? p.leadId : null, confidence: p.confidence, matchReason: p.matchReason,
    proposal: p as unknown as Record<string, unknown>,
  }));
  const inserted = await db.insert(meetingProposals).values(rows).onConflictDoNothing({ target: meetingProposals.externalId }).returning({ id: meetingProposals.id });
  return { added: inserted.length, skipped: list.length - inserted.length };
}

export async function pendingProposals() {
  const db = await getDb();
  return db.select().from(meetingProposals).where(eq(meetingProposals.status, "pendiente")).orderBy(desc(meetingProposals.happenedAt));
}

export interface ApprovalInput {
  leadId: number | "nuevo"; summary: string; needs?: string | null; nextStep?: string | null; nextStepAt?: string | null;
  personalNotes?: string | null; company?: string | null; contactName?: string | null;
}

/** Aprobar: la reunión queda como actividad «Reunión» y lo aprendido se suma a la ficha (sin borrar lo que había). */
export async function approveProposal(id: number, input: ApprovalInput, reviewer: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select().from(meetingProposals).where(and(eq(meetingProposals.id, id), eq(meetingProposals.status, "pendiente")));
  if (!row) return false;
  const p = ProposalSchema.parse(row.proposal);
  const day = row.happenedAt.toISOString().slice(0, 10);
  const leadId = input.leadId === "nuevo"
    ? await createLead(leadInput.parse({
        company: input.company ?? p.newLead?.company ?? "", contactName: input.contactName ?? p.newLead?.contactName ?? "",
        industry: p.newLead?.industry ?? "", channel: "otro", stage: "nuevo",
      }), reviewer)
    : input.leadId;
  const extra = [
    p.objections.length ? `Objeciones: ${p.objections.join("; ")}` : "",
    p.risks.length ? `Riesgos: ${p.risks.join("; ")}` : "",
    row.shareLink ? `Nota en Wispr: ${row.shareLink}` : "",
  ].filter(Boolean).join("\n");
  const ok = await addActivity(leadId, {
    type: "reunion", happenedAt: day, summary: [input.summary, extra].filter(Boolean).join("\n\n").slice(0, 4000),
    result: p.interest ? `Interés ${p.interest}` : null, withWhom: p.withWhom ?? null,
    nextStep: input.nextStep ?? null, nextStepAt: input.nextStep ? input.nextStepAt ?? null : null,
  }, reviewer);
  if (!ok) return false;
  const [lead] = await db.select({ needs: leads.needs, personalNotes: leads.personalNotes }).from(leads).where(eq(leads.id, leadId));
  await db.update(leads).set({
    needs: appendDated(lead?.needs ?? null, input.needs, day), personalNotes: appendDated(lead?.personalNotes ?? null, input.personalNotes, day), updatedAt: new Date(),
  }).where(eq(leads.id, leadId));
  await db.update(meetingProposals).set({ status: "aprobada", leadId, reviewedBy: reviewer, reviewedAt: new Date() }).where(eq(meetingProposals.id, id));
  return true;
}

export async function discardProposal(id: number, reviewer: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.update(meetingProposals).set({ status: "descartada", reviewedBy: reviewer, reviewedAt: new Date() })
    .where(and(eq(meetingProposals.id, id), eq(meetingProposals.status, "pendiente"))).returning({ id: meetingProposals.id });
  return r.length > 0;
}
