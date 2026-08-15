import 'server-only';
import { connect, jobs, sql, eq, and, type Job } from '@jobs/db';

/**
 * Every query the site makes.
 *
 * The point of moving to a database was that these stop being scans. A cluster
 * page used to mean reading every markdown file, parsing its frontmatter and
 * grouping in memory; it is now one indexed aggregate. That difference does not
 * matter at eighteen listings and is the whole thing at seventy-five thousand.
 */

const { db } = connect();

/**
 * A listing is live until its stated deadline, or sixty days after it was
 * posted when it states none — which is the common case, since almost no
 * posting names a real date.
 *
 * A listing that can be dated at neither end is treated as live: hiding one we
 * merely failed to date is the worse error.
 */
const LIVE = sql`(
	${jobs.status} = 'published'
	and (
		(${jobs.applyByDate} is null and ${jobs.postedAt} is null)
		or coalesce(${jobs.applyByDate}, ${jobs.postedAt} + interval '60 days') >= current_date
	)
)`;

const EXPIRED = sql`(
	${jobs.status} = 'published'
	and coalesce(${jobs.applyByDate}, ${jobs.postedAt} + interval '60 days') < current_date
)`;

const NEWEST = sql`coalesce(${jobs.postedAt}, ${jobs.createdAt}::date) desc, ${jobs.id} desc`;

export type Listing = Job;

export async function liveListings(limit = 500): Promise<Listing[]> {
	return db.select().from(jobs).where(LIVE).orderBy(NEWEST).limit(limit);
}

export async function closedListings(limit = 6): Promise<Listing[]> {
	return db.select().from(jobs).where(EXPIRED).orderBy(NEWEST).limit(limit);
}

/** Every published slug, for generateStaticParams — including expired ones,
 *  which keep their page so inbound links do not 404. */
export async function publishedSlugs(): Promise<string[]> {
	const rows = await db
		.select({ slug: jobs.slug })
		.from(jobs)
		.where(eq(jobs.status, 'published'));
	return rows.map((r) => r.slug);
}

export async function listingBySlug(slug: string): Promise<Listing | null> {
	const [row] = await db
		.select()
		.from(jobs)
		.where(and(eq(jobs.slug, slug), eq(jobs.status, 'published')))
		.limit(1);
	return row ?? null;
}

// ------------------------------------------------------------------ clusters

export type ClusterKind = 'category' | 'role' | 'type' | 'city' | 'company' | 'batch' | 'role-city';

export interface ClusterRow {
	kind: ClusterKind;
	/** Path without slashes, e.g. `software-engineer-jobs-in-pune`. */
	path: string;
	/** The value this cluster groups on, used to fetch its listings. */
	key: string;
	/** For role-in-city, the second half of the key. */
	key2?: string;
	label: string;
	count: number;
}

/** Below this a cluster is a near-duplicate of the listing it holds. */
export const MIN_CLUSTER_SIZE = 2;
/** Below this it exists for navigation but stays out of the index. */
export const MIN_INDEXABLE_CLUSTER_SIZE = 3;

/**
 * Every cluster worth a page, as four aggregates rather than a full scan.
 *
 * `unnest` on the array columns is what makes this cheap: cities and batch
 * years were normalized once at ingest, so grouping is a plain GROUP BY over
 * indexed values instead of a regex pass over frontmatter.
 */
export async function allClusters(): Promise<ClusterRow[]> {
	const out: ClusterRow[] = [];

	// Categories are the top of the taxonomy and the level a reader browses by,
	// so unlike everything else they get a page even with a single listing —
	// an empty-looking menu tells a visitor the site covers nothing.
	const categories = await db.execute<{ key: string; count: number }>(sql`
		select ${jobs.category} as key, count(*)::int as count
		from ${jobs} where ${LIVE} and ${jobs.category} is not null
		group by 1 order by count(*) desc
	`);
	for (const r of categories) {
		out.push({
			kind: 'category',
			path: `${r.key}-jobs`,
			key: r.key,
			label: `${categoryLabel(r.key) ?? r.key} jobs`,
			count: r.count,
		});
	}

	const types = await db.execute<{ key: string; count: number }>(sql`
		select ${jobs.jobType}::text as key, count(*)::int as count
		from ${jobs} where ${LIVE} and ${jobs.jobType} is not null
		group by 1 having count(*) >= ${MIN_CLUSTER_SIZE} order by count(*) desc
	`);
	for (const r of types) {
		out.push({
			kind: 'type',
			path: r.key === 'internship' ? 'internship-jobs' : `${r.key}-jobs`,
			key: r.key,
			label: `${JOB_TYPE_LABELS[r.key] ?? r.key} openings`,
			count: r.count,
		});
	}

	const cities = await db.execute<{ key: string; count: number }>(sql`
		select city as key, count(*)::int as count
		from ${jobs}, unnest(${jobs.cities}) as city
		where ${LIVE} group by city having count(*) >= ${MIN_CLUSTER_SIZE} order by count(*) desc
	`);
	for (const r of cities) {
		out.push({
			kind: 'city',
			path: `jobs-in-${slugOf(r.key)}`,
			key: r.key,
			label: `Fresher jobs in ${r.key}`,
			count: r.count,
		});
	}

	const families = await db.execute<{ key: string; count: number }>(sql`
		select ${jobs.roleFamily} as key, count(*)::int as count
		from ${jobs} where ${LIVE} and ${jobs.roleFamily} is not null
		group by 1 having count(*) >= ${MIN_CLUSTER_SIZE} order by count(*) desc
	`);
	for (const r of families) {
		out.push({
			kind: 'role',
			path: `${r.key}-jobs`,
			key: r.key,
			label: `${familyLabel(r.key)} jobs for freshers`,
			count: r.count,
		});
	}

	const companies = await db.execute<{ key: string; name: string; count: number }>(sql`
		select ${jobs.companySlug} as key, min(${jobs.company}) as name, count(*)::int as count
		from ${jobs} where ${LIVE}
		group by 1 having count(*) >= ${MIN_CLUSTER_SIZE} order by count(*) desc
	`);
	for (const r of companies) {
		out.push({
			kind: 'company',
			path: `${r.key}-jobs`,
			key: r.key,
			label: `${r.name} openings`,
			count: r.count,
		});
	}

	// Only years a fresher could plausibly be in. The extractor scrapes any
	// four-digit number out of the posting body, which yields 2022 and 2028
	// beside the real ones, and a cluster built on noise is a thin page.
	const thisYear = new Date().getFullYear();
	const batches = await db.execute<{ key: string; count: number }>(sql`
		select year as key, count(*)::int as count
		from ${jobs}, unnest(${jobs.batchYears}) as year
		where ${LIVE} and year ~ '^[0-9]{4}$'
		  and year::int between ${thisYear - 4} and ${thisYear + 1}
		group by year having count(*) >= ${MIN_CLUSTER_SIZE} order by year desc
	`);
	for (const r of batches) {
		out.push({
			kind: 'batch',
			path: `${r.key}-batch-jobs`,
			key: r.key,
			label: `${r.key} batch jobs`,
			count: r.count,
		});
	}

	const roleCities = await db.execute<{ key: string; key2: string; count: number }>(sql`
		select ${jobs.roleFamily} as key, city as key2, count(*)::int as count
		from ${jobs}, unnest(${jobs.cities}) as city
		where ${LIVE} and ${jobs.roleFamily} is not null
		group by 1, 2 having count(*) >= ${MIN_CLUSTER_SIZE} order by count(*) desc
	`);
	for (const r of roleCities) {
		out.push({
			kind: 'role-city',
			path: `${r.key}-jobs-in-${slugOf(r.key2)}`,
			key: r.key,
			key2: r.key2,
			label: `${familyLabel(r.key)} jobs in ${r.key2}`,
			count: r.count,
		});
	}

	// Company and role slugs can collide in principle ("Analyst Ltd"); first
	// definition wins, and the loser simply has no page.
	const seen = new Set<string>();
	return out.filter((c) => (seen.has(c.path) ? false : (seen.add(c.path), true)));
}

export async function clusterListings(cluster: ClusterRow): Promise<Listing[]> {
	const where =
		cluster.kind === 'category'
			? sql`${LIVE} and ${jobs.category} = ${cluster.key}`
			: cluster.kind === 'type'
				? sql`${LIVE} and ${jobs.jobType}::text = ${cluster.key}`
				: cluster.kind === 'city'
			? sql`${LIVE} and ${cluster.key} = any(${jobs.cities})`
			: cluster.kind === 'role'
				? sql`${LIVE} and ${jobs.roleFamily} = ${cluster.key}`
				: cluster.kind === 'company'
					? sql`${LIVE} and ${jobs.companySlug} = ${cluster.key}`
					: cluster.kind === 'batch'
						? sql`${LIVE} and ${cluster.key} = any(${jobs.batchYears})`
						: sql`${LIVE} and ${jobs.roleFamily} = ${cluster.key} and ${cluster.key2} = any(${jobs.cities})`;

	return db.select().from(jobs).where(where).orderBy(NEWEST);
}

/** Closed listings belonging to the same cluster, for its lower register. */
export async function clusterClosed(cluster: ClusterRow, limit = 4): Promise<Listing[]> {
	const scope =
		cluster.kind === 'category'
			? sql`${jobs.category} = ${cluster.key}`
			: cluster.kind === 'type'
				? sql`${jobs.jobType}::text = ${cluster.key}`
				: cluster.kind === 'city'
			? sql`${cluster.key} = any(${jobs.cities})`
			: cluster.kind === 'role'
				? sql`${jobs.roleFamily} = ${cluster.key}`
				: cluster.kind === 'company'
					? sql`${jobs.companySlug} = ${cluster.key}`
					: cluster.kind === 'batch'
						? sql`${cluster.key} = any(${jobs.batchYears})`
						: sql`${jobs.roleFamily} = ${cluster.key} and ${cluster.key2} = any(${jobs.cities})`;

	return db
		.select()
		.from(jobs)
		.where(sql`${EXPIRED} and ${scope}`)
		.orderBy(NEWEST)
		.limit(limit);
}

// ------------------------------------------------------------------- helpers

import { slugify, roleFamilyLabel, categoryLabel, JOB_TYPE_LABELS } from '@jobs/db';

const slugOf = (s: string) => slugify(s);
const familyLabel = (slug: string) => roleFamilyLabel(slug) ?? slug;

// ------------------------------------------------------------------ sections

/** Posted today — the "what changed since I last looked" answer. */
export async function todaysUpdates(limit = 8): Promise<Listing[]> {
	return db
		.select()
		.from(jobs)
		.where(sql`${LIVE} and ${jobs.postedAt} = current_date`)
		.orderBy(NEWEST)
		.limit(limit);
}

/**
 * Closing within a week.
 *
 * The most actionable list on the site: everything here is something the reader
 * loses by waiting, which is the one thing a job board can tell them that they
 * cannot work out for themselves.
 */
export async function closingSoon(limit = 8): Promise<Listing[]> {
	return db
		.select()
		.from(jobs)
		.where(
			sql`${LIVE}
				and coalesce(${jobs.applyByDate}, ${jobs.postedAt} + interval '60 days')
					between current_date and current_date + interval '7 days'`
		)
		.orderBy(sql`coalesce(${jobs.applyByDate}, ${jobs.postedAt} + interval '60 days') asc`)
		.limit(limit);
}

// -------------------------------------------------------------------- search

/**
 * Full-text search over the generated `search_doc` column.
 *
 * `websearch_to_tsquery` because it understands what people actually type —
 * quoted phrases, `or`, a leading minus — and never throws on malformed input
 * the way `to_tsquery` does. A search box that 500s on an apostrophe is worse
 * than no search box.
 *
 * Falls back to a prefix match so a half-typed "beng" still finds Bengaluru,
 * which matters when the query is coming from a phone keyboard.
 */
export async function searchListings(q: string, limit = 60): Promise<Listing[]> {
	const query = q.trim();
	if (!query) return [];

	const prefix = query
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
		.filter(Boolean)
		.map((w) => `${w}:*`)
		.join(' & ');

	return db
		.select()
		.from(jobs)
		.where(
			sql`${LIVE} and (
				${jobs.searchDoc} @@ websearch_to_tsquery('simple', ${query})
				${prefix ? sql`or ${jobs.searchDoc} @@ to_tsquery('simple', ${prefix})` : sql``}
			)`
		)
		.orderBy(
			sql`ts_rank(${jobs.searchDoc}, websearch_to_tsquery('simple', ${query})) desc,
				coalesce(${jobs.postedAt}, ${jobs.createdAt}::date) desc`
		)
		.limit(limit);
}
