ALTER TABLE "jobs" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "logo_url" text;--> statement-breakpoint
CREATE INDEX "jobs_category_idx" ON "jobs" USING btree ("category");