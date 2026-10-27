CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"input_hash" text NOT NULL,
	"output" jsonb NOT NULL,
	"model" text NOT NULL,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"maps_query" text DEFAULT '' NOT NULL,
	"instagram" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitors_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "content_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"url" text,
	"seed" text NOT NULL,
	"intent" text DEFAULT 'general' NOT NULL,
	"best_rank" integer NOT NULL,
	"first_seen" date NOT NULL,
	"last_seen" date NOT NULL,
	"times_seen" integer DEFAULT 1 NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"result" text,
	"with_whom" text,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"nickname" text,
	"company" text,
	"contact_name" text,
	"contact_role" text,
	"email" text,
	"phone" text,
	"industry" text,
	"needs" text,
	"owner" text,
	"title" text,
	"birthday" date,
	"personal_notes" text,
	"do_not_nurture" boolean DEFAULT false NOT NULL,
	"monthly_revenue" numeric,
	"company_size" text,
	"website" text,
	"instagram" text,
	"facebook" text,
	"tiktok" text,
	"linkedin" text,
	"services" jsonb,
	"channel" text DEFAULT 'otro' NOT NULL,
	"stage" text DEFAULT 'nuevo' NOT NULL,
	"qualified" boolean,
	"value" numeric,
	"retainer" boolean DEFAULT false NOT NULL,
	"monthly_fee" numeric,
	"package" text,
	"outcome" text,
	"outcome_reason" text,
	"next_step" text,
	"next_step_at" date,
	"first_contact_at" timestamp with time zone,
	"proposal_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"meta" jsonb,
	CONSTRAINT "leads_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"title" text,
	"happened_at" timestamp with time zone NOT NULL,
	"share_link" text,
	"lead_id" integer,
	"confidence" text NOT NULL,
	"match_reason" text,
	"proposal" jsonb NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_proposals_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "metric_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"metric" text NOT NULL,
	"dim_key" text DEFAULT '' NOT NULL,
	"date" date NOT NULL,
	"value" numeric NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_end" date NOT NULL,
	"overall" numeric,
	"coverage" numeric NOT NULL,
	"dimensions" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scores_period_end_unique" UNIQUE("period_end")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"rows" integer DEFAULT 0 NOT NULL,
	"error" text,
	"trigger" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"setup_completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_proposals" ADD CONSTRAINT "meeting_proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_ideas_uq" ON "content_ideas" USING btree ("source","text");--> statement-breakpoint
CREATE INDEX "content_ideas_seen" ON "content_ideas" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "lead_activities_lead" ON "lead_activities" USING btree ("lead_id","happened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_daily_uq" ON "metric_daily" USING btree ("source","metric","dim_key","date");--> statement-breakpoint
CREATE INDEX "metric_daily_source_date" ON "metric_daily" USING btree ("source","date");