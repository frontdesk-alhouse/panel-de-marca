CREATE TABLE IF NOT EXISTS "ai_citations" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"assistant" text NOT NULL,
	"query_id" text NOT NULL,
	"query" text NOT NULL,
	"run" integer DEFAULT 1 NOT NULL,
	"searched" boolean DEFAULT false NOT NULL,
	"appears" boolean NOT NULL,
	"position" integer,
	"cited_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wrong_fact" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_citations_uq" ON "ai_citations" USING btree ("query_id","assistant","run","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_citations_date" ON "ai_citations" USING btree ("date");