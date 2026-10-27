import { and, desc, eq, gte, inArray, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses, leadActivities, leads, metricDaily } from "@/db/schema";
import { addDays, todayIso } from "@/lib/dates";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";

export type ActivityKind = "lead" | "crm" | "web_lead" | "post" | "analysis";
export interface ActivityItem { kind: ActivityKind; date: string; title: string; detail?: string; href?: string }

const LOOKBACK_DAYS = 30;
const LIMIT = 8;
const LEAD_EVENTS: Record<string, string> = { event_generate_lead: "formulario", event_contact_whatsapp: "WhatsApp", event_contact_call: "llamada" };

/** Lo último que pasó: prospectos, seguimiento en el CRM, leads del sitio, publicaciones y análisis. */
export async function loadActivity(): Promise<ActivityItem[]> {
  const db = await getDb();
  const since = addDays(todayIso(), -LOOKBACK_DAYS);
  const sinceTs = new Date(`${since}T00:00:00-06:00`);
  const notMock = sql`coalesce(${leads.meta}->>'mock', 'false') <> 'true'`;

  const [newLeads, acts, webLeads, posts, reports] = await Promise.all([
    db.select({ id: leads.id, company: leads.company, contact: leads.contactName, createdAt: leads.createdAt, channel: leads.channel }).from(leads)
      .where(and(gte(leads.createdAt, sinceTs), notMock)).orderBy(desc(leads.createdAt)).limit(LIMIT),
    db.select({ leadId: leadActivities.leadId, type: leadActivities.type, summary: leadActivities.summary, author: leadActivities.author, at: leadActivities.happenedAt, company: leads.company, contact: leads.contactName })
      .from(leadActivities).innerJoin(leads, eq(leads.id, leadActivities.leadId)).where(gte(leadActivities.happenedAt, sinceTs)).orderBy(desc(leadActivities.happenedAt)).limit(LIMIT),
    db.select({ date: metricDaily.date, metric: metricDaily.metric, value: metricDaily.value }).from(metricDaily)
      .where(and(eq(metricDaily.source, "ga4"), eq(metricDaily.dimKey, ""), inArray(metricDaily.metric, Object.keys(LEAD_EVENTS)), gte(metricDaily.date, since)))
      .orderBy(desc(metricDaily.date)).limit(LIMIT * 3),
    db.select({ date: metricDaily.date, meta: metricDaily.meta }).from(metricDaily)
      .where(and(eq(metricDaily.source, "instagram"), eq(metricDaily.metric, "post_published"), like(metricDaily.dimKey, "post:%"), gte(metricDaily.date, since)))
      .orderBy(desc(metricDaily.date)).limit(LIMIT),
    db.select({ createdAt: analyses.createdAt, output: analyses.output }).from(analyses).where(eq(analyses.kind, "weekly")).orderBy(desc(analyses.createdAt)).limit(2),
  ]);

  const day = (d: Date) => todayIso(d);
  const items: ActivityItem[] = [
    ...newLeads.map((l) => ({ kind: "lead" as const, date: day(l.createdAt), title: `Nuevo prospecto: ${l.company ?? l.contact ?? `#${l.id}`}`, href: `/crm/${l.id}` })),
    ...acts.map((a) => ({ kind: "crm" as const, date: day(a.at), title: `${a.author}: ${ACTIVITY_LABELS[a.type].toLowerCase()} con ${a.company ?? a.contact ?? "un prospecto"}`, detail: a.summary.slice(0, 90), href: `/crm/${a.leadId}` })),
    ...webLeads.filter((w) => Number(w.value) > 0).map((w) => ({ kind: "web_lead" as const, date: w.date, title: `${Number(w.value)} ${Number(w.value) === 1 ? "contacto" : "contactos"} por ${LEAD_EVENTS[w.metric]} en el sitio`, href: "/sitio" })),
    ...posts.map((p) => {
      const m = (p.meta ?? {}) as { caption?: string; format?: string };
      return { kind: "post" as const, date: p.date, title: `Publicaste un ${m.format ?? "post"} en Instagram`, detail: m.caption?.slice(0, 80), href: "/social/instagram" };
    }),
    ...reports.map((r) => ({ kind: "analysis" as const, date: day(r.createdAt), title: "Nuevo análisis semanal", detail: (r.output as { titular?: string }).titular, href: "/" })),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, LIMIT);
}
