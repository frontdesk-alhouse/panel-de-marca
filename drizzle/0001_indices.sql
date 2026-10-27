CREATE INDEX IF NOT EXISTS "analyses_kind_created" ON "analyses" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_created" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_stage" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_proposals_status" ON "meeting_proposals" USING btree ("status","happened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_proposals_lead" ON "meeting_proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metric_daily_date" ON "metric_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_runs_source_started" ON "sync_runs" USING btree ("source","started_at" DESC NULLS LAST);