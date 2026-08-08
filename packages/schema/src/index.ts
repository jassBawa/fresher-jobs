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
