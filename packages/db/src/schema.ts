/**
 * The jobs schema.
 *
 * Two ideas shape it.
 *
 * First, anything the site has to *query* is computed once at ingest and stored,
 * not derived at render time. City aliases (Bangalore → Bengaluru), non-places
 * ("PAN India"), and role families were all resolved per-request while the site
 * read markdown; here they are columns, so a cluster page is one indexed query
 * instead of a full scan plus a regex pass.
 *
 * Second, the raw value is kept beside the normalized one wherever the two can
 * disagree. `locations` is what the source said and is what structured data
 * quotes; `cities` is what the site groups by. Losing the raw value to
 * normalization would mean never being able to re-derive it when the rules
 * change — and the rules have already changed twice.
 */

import {
	pgTable,
	pgEnum,
	serial,
	text,
	date,
	timestamp,
	index,
	uniqueIndex,
	primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * `rejected` is a discard that leaves a record.
 *
 * A posting we cannot parse into something a reader could act on does not reach
 * the site — but deleting it outright means never being able to answer "why did
 * this one not make it", and the same posting would look new again if the seen
 * list were ever rebuilt. It is kept, invisible, with a reason.
 */
export const jobStatus = pgEnum('job_status', ['draft', 'published', 'rejected']);
export const jobType = pgEnum('job_type', ['full-time', 'internship', 'contract', 'trainee']);
export const generatedBy = pgEnum('generated_by', ['llm+template', 'template']);

/**
 * The state of an apply link, which nothing used to record at all.
 *
 * `needs_browser` is its own verdict rather than a failure: most Indian ATS
 * pages render the posting client-side, so a plain fetch sees an empty shell.
 * Calling that "dead" would retire live jobs; calling it "live" would be a
 * guess. It is neither, and the site treats it as unverified.
 */
export const applyCheck = pgEnum('apply_check', [
	'unchecked',
	'live',
	'role_mismatch',
	'dead',
	'unreachable',
	'needs_browser',
]);

export const jobs = pgTable(
	'jobs',
	{
		id: serial('id').primaryKey(),
		slug: text('slug').notNull(),
		status: jobStatus('status').notNull().default('draft'),

		// ---- facts, extracted from the source and never its prose --------------
		company: text('company').notNull(),
		companySlug: text('company_slug').notNull(),
		role: text('role').notNull(),
		/** Resolved family slug — "software-engineer". Null when nothing matched. */
		roleFamily: text('role_family'),
		jobType: jobType('job_type'),
		batchYears: text('batch_years').array().notNull().default([]),
		qualifications: text('qualifications').array().notNull().default([]),
		experienceRequired: text('experience_required'),
		salary: text('salary'),
		/** As the source wrote it, including "PAN India" and "Hyderabad, Karnataka". */
		locations: text('locations').array().notNull().default([]),
		/** Normalized, aliased, non-places removed. What clusters group by. */
		cities: text('cities').array().notNull().default([]),
		lastDateToApply: text('last_date_to_apply'),
		applyByDate: date('apply_by_date'),
		applyUrl: text('apply_url'),
		skills: text('skills').array().notNull().default([]),
		requirements: text('requirements').array().notNull().default([]),
		responsibilities: text('responsibilities').array().notNull().default([]),

		// ---- prose, generated from the facts -----------------------------------
		// Nullable because facts land first: stage one extracts and verifies, and
		// only a posting that survives that is worth spending model tokens on.
		title: text('title'),
		description: text('description'),
		summary: text('summary'),
		about: text('about'),
		generatedBy: generatedBy('generated_by'),
		draftedAt: timestamp('drafted_at', { withTimezone: true }),

		// ---- apply link verification -------------------------------------------
		applyCheck: applyCheck('apply_check').notNull().default('unchecked'),
		applyCheckedAt: timestamp('apply_checked_at', { withTimezone: true }),
		/** Where the link actually landed after redirects. */
		applyFinalUrl: text('apply_final_url'),
		applyNote: text('apply_note'),

		// ---- provenance and dates ----------------------------------------------
		/** A citation, not content. */
		sourceRef: text('source_ref'),
		postedAt: date('posted_at'),
		/** Why a rejected posting was discarded. Null for everything else. */
		rejectedReason: text('rejected_reason'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex('jobs_slug_key').on(t.slug),
		// The site's hot path: published, unexpired, newest first.
		index('jobs_status_posted_idx').on(t.status, t.postedAt),
		index('jobs_apply_by_idx').on(t.applyByDate),
		index('jobs_role_family_idx').on(t.roleFamily),
		index('jobs_company_slug_idx').on(t.companySlug),
		// Array containment for the city and batch clusters.
		index('jobs_cities_idx').using('gin', t.cities),
		index('jobs_batch_years_idx').using('gin', t.batchYears),
	]
);

/**
 * Post IDs already seen, replacing data/state.json.
 *
 * Keyed by source as well as id so a second source cannot collide with
 * freshersdunia's numbering — the old file was a bare array of integers and
 * would have silently skipped posts the moment a second source was added.
 */
export const seenPosts = pgTable(
	'seen_posts',
	{
		source: text('source').notNull(),
		externalId: text('external_id').notNull(),
		seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.source, t.externalId] })]
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
