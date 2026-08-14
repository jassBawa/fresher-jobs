CREATE TYPE "public"."apply_check" AS ENUM('unchecked', 'live', 'role_mismatch', 'dead', 'unreachable', 'needs_browser');--> statement-breakpoint
CREATE TYPE "public"."generated_by" AS ENUM('llm+template', 'template');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('full-time', 'internship', 'contract', 'trainee');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"company" text NOT NULL,
	"company_slug" text NOT NULL,
	"role" text NOT NULL,
	"role_family" text,
	"job_type" "job_type",
	"batch_years" text[] DEFAULT '{}' NOT NULL,
	"qualifications" text[] DEFAULT '{}' NOT NULL,
	"experience_required" text,
	"salary" text,
	"locations" text[] DEFAULT '{}' NOT NULL,
	"cities" text[] DEFAULT '{}' NOT NULL,
	"last_date_to_apply" text,
	"apply_by_date" date,
	"apply_url" text,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"responsibilities" text[] DEFAULT '{}' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"summary" text NOT NULL,
	"about" text,
	"generated_by" "generated_by" NOT NULL,
	"apply_check" "apply_check" DEFAULT 'unchecked' NOT NULL,
	"apply_checked_at" timestamp with time zone,
	"apply_final_url" text,
	"apply_note" text,
	"source_ref" text,
	"posted_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seen_posts" (
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seen_posts_source_external_id_pk" PRIMARY KEY("source","external_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "jobs_status_posted_idx" ON "jobs" USING btree ("status","posted_at");--> statement-breakpoint
CREATE INDEX "jobs_apply_by_idx" ON "jobs" USING btree ("apply_by_date");--> statement-breakpoint
CREATE INDEX "jobs_role_family_idx" ON "jobs" USING btree ("role_family");--> statement-breakpoint
CREATE INDEX "jobs_company_slug_idx" ON "jobs" USING btree ("company_slug");--> statement-breakpoint
CREATE INDEX "jobs_cities_idx" ON "jobs" USING gin ("cities");--> statement-breakpoint
CREATE INDEX "jobs_batch_years_idx" ON "jobs" USING gin ("batch_years");