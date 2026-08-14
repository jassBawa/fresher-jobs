ALTER TYPE "public"."job_status" ADD VALUE 'rejected';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "summary" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "generated_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "drafted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "rejected_reason" text;