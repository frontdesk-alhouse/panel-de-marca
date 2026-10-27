import {
  pgTable, serial, text, date, numeric, jsonb, timestamp, integer, boolean,
  uniqueIndex, index,
} from "drizzle-orm/pg-core";

/** Una fila = un valor diario de una métrica de una fuente, opcionalmente por dimensión. */
export const metricDaily = pgTable(
  "metric_daily",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    metric: text("metric").notNull(),
    dimKey: text("dim_key").notNull().default(""),
    date: date("date").notNull(),
    value: numeric("value", { mode: "number" }).notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex("metric_daily_uq").on(t.source, t.metric, t.dimKey, t.date),
    index("metric_daily_source_date").on(t.source, t.date),
    // Ventanas de fechas sin filtrar por fuente (sumsForWindow, latestUpTo).
    index("metric_daily_date").on(t.date),
  ],
);

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: ["running", "ok", "error"] }).notNull().default("running"),
  rows: integer("rows").notNull().default(0),
  error: text("error"),
  trigger: text("trigger", { enum: ["cron", "manual", "script"] }).notNull(),
}, (t) => [
  // Última corrida por fuente (programador, /api/sync/status, limpieza de corridas cortadas).
  index("sync_runs_source_started").on(t.source, t.startedAt.desc()),
]);

export const LEAD_STAGES = ["nuevo", "calificado", "propuesta", "cerrado", "perdido"] as const;
export const LEAD_CHANNELS = ["organico", "ads", "meta", "directo", "referido", "otro"] as const;

export const INDUSTRIES = ["salud", "arquitectura-construccion", "industrial", "servicios-b2b", "retail-consumo", "hospitalidad", "educacion", "tecnologia", "otro"] as const;
export const LEAD_OUTCOMES = ["ganado", "perdido", "pausado"] as const;
/** Chica 1-10 empleados, mediana 11-35, grande 36+. */
export const COMPANY_SIZES = ["chica", "mediana", "grande"] as const;

/**
 * Prospectos y clientes (CRM interno). Guarda datos de contacto: solo lo ve el
 * equipo de la lista blanca y nunca sale del panel (no se manda a GA4 ni a Claude).
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  source: text("source", { enum: ["form", "call", "manual"] }).notNull(),
  externalId: text("external_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  nickname: text("nickname"),
  company: text("company"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry", { enum: INDUSTRIES }),
  needs: text("needs"),
  owner: text("owner"),
  title: text("title"),
  birthday: date("birthday"),
  personalNotes: text("personal_notes"),
  doNotNurture: boolean("do_not_nurture").notNull().default(false),
  monthlyRevenue: numeric("monthly_revenue", { mode: "number" }),
  companySize: text("company_size", { enum: COMPANY_SIZES }),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  tiktok: text("tiktok"),
  linkedin: text("linkedin"),
  services: jsonb("services").$type<string[]>(),
  channel: text("channel", { enum: LEAD_CHANNELS }).notNull().default("otro"),
  stage: text("stage", { enum: LEAD_STAGES }).notNull().default("nuevo"),
  qualified: boolean("qualified"),
  value: numeric("value", { mode: "number" }),
  /** Cliente con iguala mensual: separa lo que nos paga cada mes de su propia facturación (monthlyRevenue). */
  retainer: boolean("retainer").notNull().default(false),
  monthlyFee: numeric("monthly_fee", { mode: "number" }),
  /** Id de un paquete de la configuración (workspace.packages). */
  package: text("package"),
  outcome: text("outcome", { enum: LEAD_OUTCOMES }),
  outcomeReason: text("outcome_reason"),
  nextStep: text("next_step"),
  nextStepAt: date("next_step_at"),
  firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
  proposalAt: timestamp("proposal_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
}, (t) => [
  // Ventanas por fecha de alta (calificación, negocio) y filtro por etapa (CRM).
  index("leads_created").on(t.createdAt),
  index("leads_stage").on(t.stage),
]);

export const ACTIVITY_TYPES = ["llamada", "reunion", "whatsapp", "correo", "propuesta", "nota"] as const;

/** Historial de cada prospecto: qué hicimos, con quién y qué resultó. */
export const leadActivities = pgTable(
  "lead_activities",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull().defaultNow(),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    summary: text("summary").notNull(),
    result: text("result"),
    withWhom: text("with_whom"),
    author: text("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_activities_lead").on(t.leadId, t.happenedAt)],
);

export const MEETING_STATUSES = ["pendiente", "aprobada", "descartada"] as const;

/**
 * Propuestas que salen de las reuniones de Wispr Flow (carpeta «Clientes»).
 * No se guarda la transcripción: solo lo derivado y el link a la nota en Wispr.
 * Nada llega a la ficha del cliente hasta que alguien la aprueba en la bandeja.
 */
export const meetingProposals = pgTable("meeting_proposals", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  title: text("title"),
  happenedAt: timestamp("happened_at", { withTimezone: true }).notNull(),
  shareLink: text("share_link"),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  confidence: text("confidence", { enum: ["alta", "media", "baja"] }).notNull(),
  matchReason: text("match_reason"),
  proposal: jsonb("proposal").$type<Record<string, unknown>>().notNull(),
  status: text("status", { enum: MEETING_STATUSES }).notNull().default("pendiente"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Bandeja de reuniones pendientes y búsqueda por prospecto.
  index("meeting_proposals_status").on(t.status, t.happenedAt),
  index("meeting_proposals_lead").on(t.leadId),
]);

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["weekly", "monthly", "manual", "strategy"] }).notNull(),
  periodFrom: date("period_from").notNull(),
  periodTo: date("period_to").notNull(),
  inputHash: text("input_hash").notNull(),
  output: jsonb("output").notNull(),
  model: text("model").notNull(),
  usage: jsonb("usage"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Último análisis o plan por tipo.
  index("analyses_kind_created").on(t.kind, t.createdAt.desc()),
]);

/** Snapshot de la calificación para verla en el tiempo; el cálculo vivo sale de metric_daily. */
export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  periodEnd: date("period_end").notNull().unique(),
  overall: numeric("overall", { mode: "number" }),
  coverage: numeric("coverage", { mode: "number" }).notNull(),
  dimensions: jsonb("dimensions").notNull(),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ideas de contenido: búsquedas del autocompletado de Google, conversaciones de
 * Reddit y artículos de la competencia. Se acumulan: first_seen dice qué es nuevo.
 */
export const IDEA_SOURCES = ["autocomplete", "reddit", "competitor", "paa"] as const;
export const IDEA_INTENTS = ["precio", "dudas", "comparativa", "quejas", "local", "ia", "general"] as const;

export const contentIdeas = pgTable(
  "content_ideas",
  {
    id: serial("id").primaryKey(),
    source: text("source", { enum: IDEA_SOURCES }).notNull(),
    text: text("text").notNull(),
    url: text("url"),
    /** Búsqueda semilla, subreddit o competidor que la originó */
    seed: text("seed").notNull(),
    intent: text("intent", { enum: IDEA_INTENTS }).notNull().default("general"),
    /** Mejor lugar visto (1 = primera sugerencia / post más votado) */
    bestRank: integer("best_rank").notNull(),
    firstSeen: date("first_seen").notNull(),
    lastSeen: date("last_seen").notNull(),
    timesSeen: integer("times_seen").notNull().default(1),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (t) => [uniqueIndex("content_ideas_uq").on(t.source, t.text), index("content_ideas_seen").on(t.lastSeen)],
);

export type MetricDailyInsert = typeof metricDaily.$inferInsert;
export type Lead = typeof leads.$inferSelect;

/**
 * Configuración de la marca (una sola fila, id = 1). `data` cumple WorkspaceSchema
 * (src/lib/workspace/schema.ts). Sin `setupCompletedAt`, el modo local manda a /setup.
 */
export const workspace = pgTable("workspace", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").notNull(),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Competencia que se mide. El dominio es la llave del historial (métricas `site:<dominio>`):
 * si cambia, se pierde la continuidad. Se desactiva en vez de borrarse.
 */
export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  mapsQuery: text("maps_query").notNull().default(""),
  instagram: text("instagram"),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
