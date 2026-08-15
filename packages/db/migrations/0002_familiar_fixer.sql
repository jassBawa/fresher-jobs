ALTER TABLE "jobs" ADD COLUMN "regions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "search_doc" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple',
				coalesce(company, '') || ' ' ||
				coalesce(role, '') || ' ' ||
				coalesce(role_family, '') || ' ' ||
				coalesce(job_type::text, '') || ' ' ||
				array_to_string(skills, ' ') || ' ' ||
				array_to_string(cities, ' ') || ' ' ||
				array_to_string(regions, ' ') || ' ' ||
				array_to_string(locations, ' ') || ' ' ||
				array_to_string(qualifications, ' ') || ' ' ||
				array_to_string(batch_years, ' ')
			)) STORED;--> statement-breakpoint
CREATE INDEX "jobs_regions_idx" ON "jobs" USING gin ("regions");--> statement-breakpoint
CREATE INDEX "jobs_search_idx" ON "jobs" USING gin ("search_doc");--> statement-breakpoint
CREATE INDEX "jobs_job_type_idx" ON "jobs" USING btree ("job_type");