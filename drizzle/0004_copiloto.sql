CREATE TABLE IF NOT EXISTS "copilot_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool" text NOT NULL,
	"args" jsonb NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"viewer" text NOT NULL,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_actions_status" ON "copilot_actions" USING btree ("status","created_at");