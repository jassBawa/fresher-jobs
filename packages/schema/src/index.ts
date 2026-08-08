/**
 * Shared types for the jobs platform.
 *
 * `FactRecord` is what `apps/ingest/src/fetch.mjs` writes to `data/facts/*.json`.
 * `DraftPost` is the YAML frontmatter that `apps/ingest/src/draft.mjs` writes to
 * `data/drafts/*.md`. JSON Schema equivalents live alongside:
 *   - src/fact-record.schema.json
 *   - src/draft-post.schema.json
 */

export const JOB_TYPES = [
  "full-time",
  "internship",
  "contract",
  "trainee",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const DRAFT_STATUSES = ["draft", "published"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const GENERATED_BY = ["llm+template", "template"] as const;
export type GeneratedBy = (typeof GENERATED_BY)[number];

/**
 * Facts extracted from a source posting. Facts only — no prose, no source
 * wording. `discoveredVia` is provenance (a citation, not content).
 */
export interface FactRecord {
  company: string;
  role: string;
  jobType: JobType | null;
  batchYears: string[];
  qualifications: string[];
  experienceRequired: string | null;
  salary: string | null;
  locations: string[];
  lastDateToApply: string | null;
  applyUrl: string | null;
  skills: string[];
  requirements: string[];
  responsibilities: string[];
  /** Provenance — the source URL the facts were discovered via. */
  discoveredVia: string;
  /** Source publish date, as returned by the source. */
  discoveredAt: string;
  /** ISO timestamp of when facts were extracted. */
  extractedAt: string;
}

/**
 * A slim facts record ready to be turned into a draft — `FactRecord` minus the
 * provenance fields that only the pipeline cares about.
 */
export type DraftableFacts = Omit<
  FactRecord,
  "discoveredVia" | "discoveredAt" | "extractedAt"
>;

/**
 * YAML frontmatter of a draft post in `data/drafts/*.md`.
 */
export interface DraftFrontmatter {
  title: string;
  description: string;
  slug: string;
  status: DraftStatus;
  company: string;
  role: string;
  jobType?: JobType;
  batchYears?: string[];
  locations?: string[];
  salary?: string;
  lastDateToApply?: string;
  applyUrl?: string;
  skills?: string[];
  generatedBy: GeneratedBy;
  createdAt: string;
  sourceRef?: string;
}

/** A complete draft: frontmatter plus the markdown body. */
export interface DraftPost {
  frontmatter: DraftFrontmatter;
  /** Markdown body — everything after the closing `---`. */
  body: string;
}

// ------------------------------------------------------------------ zod schemas
// Runtime validation for content entering the site. Used by apps/web's content
// collection to reject malformed drafts at build time.

import { z } from "zod";

export const jobTypeSchema = z.enum(JOB_TYPES).nullable();
export const draftStatusSchema = z.enum(DRAFT_STATUSES);
export const generatedBySchema = z.enum(GENERATED_BY);

export const factRecordSchema = z.object({
  company: z.string(),
  role: z.string(),
  jobType: jobTypeSchema,
  batchYears: z.array(z.string()),
  qualifications: z.array(z.string()),
  experienceRequired: z.string().nullable(),
  salary: z.string().nullable(),
  locations: z.array(z.string()),
  lastDateToApply: z.string().nullable(),
  applyUrl: z.string().url().nullable(),
  skills: z.array(z.string()),
  requirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  discoveredVia: z.string().url(),
  discoveredAt: z.string(),
  extractedAt: z.string(),
});

export const draftFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  status: draftStatusSchema,
  company: z.string(),
  role: z.string(),
  jobType: jobTypeSchema.optional(),
  batchYears: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  salary: z.string().optional(),
  lastDateToApply: z.string().optional(),
  applyUrl: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  generatedBy: generatedBySchema,
  createdAt: z.string(),
  sourceRef: z.string().url().optional(),
});

export type DraftFrontmatterZod = z.infer<typeof draftFrontmatterSchema>;
export type FactRecordZod = z.infer<typeof factRecordSchema>;
