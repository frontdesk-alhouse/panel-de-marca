CREATE TABLE IF NOT EXISTS "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"kind" text DEFAULT 'propio' NOT NULL,
	"area" text DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"url" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changes_date" ON "changes" USING btree ("date");