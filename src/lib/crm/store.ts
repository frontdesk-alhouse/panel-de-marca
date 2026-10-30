import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leadActivities, leads, type LEAD_STAGES } from "@/db/schema";
import { deriveFromStage } from "./transitions";
import type { ActivityInput, LeadInput } from "./validation";

export type Lead = typeof leads.$inferSelect;
export type Activity = typeof leadActivities.$inferSelect;
type Stage = (typeof LEAD_STAGES)[number];

export interface LeadFilters { stage?: Stage | "abiertos"; owner?: string; /** Busca en empresa, contacto, correo y teléfono. */ q?: string }

/** Prospectos (sin los de prueba), con su última actividad. */
export async function listLeads(f: LeadFilters = {}) {
  const db = await getDb();
  const conds = [sql`coalesce(${leads.meta}->>'mock', 'false') <> 'true'`];
  if (f.stage === "abiertos") conds.push(sql`${leads.stage} not in ('cerrado', 'perdido')`);
  else if (f.stage) conds.push(eq(leads.stage, f.stage));
  if (f.owner) conds.push(eq(leads.owner, f.owner));
  const q = f.q?.trim().slice(0, 100);
  if (q) {
    // Comodines del usuario escapados: «50%» busca el texto, no «cualquier cosa».
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(sql`(${leads.company} ilike ${like} or ${leads.contactName} ilike ${like} or ${leads.email} ilike ${like} or ${leads.phone} ilike ${like})`);
  }
  const last = db.select({ leadId: leadActivities.leadId, lastAt: sql<Date>`max(${leadActivities.happenedAt})`.as("last_at") })
    .from(leadActivities).groupBy(leadActivities.leadId).as("last");
  return db.select({ lead: leads, lastActivityAt: last.lastAt }).from(leads)
    .leftJoin(last, eq(last.leadId, leads.id))
    .where(and(...conds))
    .orderBy(asc(sql`${leads.nextStepAt} is null`), asc(leads.nextStepAt), desc(leads.createdAt));
}

export async function getLead(id: number) {
  const db = await getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return null;
  const activities = await db.select().from(leadActivities).where(eq(leadActivities.leadId, id)).orderBy(desc(leadActivities.happenedAt), desc(leadActivities.id));
  return { lead, activities };
}

const atNoonMx = (iso: string) => new Date(`${iso}T12:00:00-06:00`);

/** Separa las fechas editables (createdOn, closedOn) del resto de columnas. */
function columns(input: LeadInput) {
  const { createdOn, closedOn, ...rest } = input;
  return { rest, createdAt: createdOn ? atNoonMx(createdOn) : undefined, closedOverride: closedOn ? atNoonMx(closedOn) : null };
}

export async function createLead(input: LeadInput, author: string): Promise<number> {
  const db = await getDb();
  const { rest, createdAt, closedOverride } = columns(input);
  const derived = deriveFromStage(input.stage, { proposalAt: null, closedAt: closedOverride });
  const [row] = await db.insert(leads).values({
    ...rest, ...(createdAt ? { createdAt } : {}), source: "manual", owner: input.owner ?? author,
    qualified: input.stage === "nuevo" ? null : input.stage !== "perdido",
    proposalAt: derived.proposalAt, closedAt: derived.closedAt, outcome: derived.outcome, updatedAt: new Date(),
  }).returning({ id: leads.id });
  return row.id;
}

export async function updateLead(id: number, input: LeadInput): Promise<boolean> {
  const db = await getDb();
  const [current] = await db.select({ proposalAt: leads.proposalAt, closedAt: leads.closedAt, qualified: leads.qualified }).from(leads).where(eq(leads.id, id));
  if (!current) return false;
  const { rest, createdAt, closedOverride } = columns(input);
  const derived = deriveFromStage(input.stage, { ...current, closedAt: closedOverride ?? current.closedAt });
  await db.update(leads).set({
    ...rest, ...(createdAt ? { createdAt } : {}),
    qualified: input.stage === "nuevo" ? current.qualified : input.stage !== "perdido" || current.qualified,
    proposalAt: derived.proposalAt, closedAt: derived.closedAt, outcome: derived.outcome, updatedAt: new Date(),
  }).where(eq(leads.id, id));
  return true;
}

/** Cambia solo la etapa (botones rápidos del pop-up), con las mismas fechas y resultado derivados que el formulario. */
export async function updateLeadStage(id: number, stage: Stage): Promise<boolean> {
  const db = await getDb();
  const [current] = await db.select({ proposalAt: leads.proposalAt, closedAt: leads.closedAt, qualified: leads.qualified }).from(leads).where(eq(leads.id, id));
  if (!current) return false;
  const derived = deriveFromStage(stage, current);
  await db.update(leads).set({
    stage,
    qualified: stage === "nuevo" ? current.qualified : stage !== "perdido" || current.qualified,
    proposalAt: derived.proposalAt, closedAt: derived.closedAt, outcome: derived.outcome, updatedAt: new Date(),
  }).where(eq(leads.id, id));
  return true;
}

/** Registra una actividad; la primera marca el primer contacto y puede actualizar el siguiente paso. */
export async function addActivity(leadId: number, input: ActivityInput, author: string): Promise<boolean> {
  const db = await getDb();
  const [lead] = await db.select({ firstContactAt: leads.firstContactAt }).from(leads).where(eq(leads.id, leadId));
  if (!lead) return false;
  const happenedAt = new Date(`${input.happenedAt}T12:00:00-06:00`);
  await db.insert(leadActivities).values({ leadId, type: input.type, happenedAt, summary: input.summary, result: input.result ?? null, withWhom: input.withWhom ?? null, author });
  const patch: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (!lead.firstContactAt || lead.firstContactAt > happenedAt) patch.firstContactAt = happenedAt;
  if (input.nextStep !== undefined && input.nextStep !== null) { patch.nextStep = input.nextStep; patch.nextStepAt = input.nextStepAt ?? null; }
  await db.update(leads).set(patch).where(eq(leads.id, leadId));
  return true;
}
