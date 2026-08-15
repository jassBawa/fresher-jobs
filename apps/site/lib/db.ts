import 'server-only';
import { connect, jobs, sql, eq, and, desc, type Job } from '@jobs/db';

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

export type ClusterKind = 'role' | 'city' | 'company' | 'batch' | 'role-city';

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

	const batches = await db.execute<{ key: string; count: number }>(sql`
		select year as key, count(*)::int as count
		from ${jobs}, unnest(${jobs.batchYears}) as year
		where ${LIVE} and year ~ '^[0-9]{4}$'
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
		cluster.kind === 'city'
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
		cluster.kind === 'city'
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

import { slugify, roleFamilyLabel } from '@jobs/db';

const slugOf = (s: string) => slugify(s);
const familyLabel = (slug: string) => roleFamilyLabel(slug) ?? slug;
