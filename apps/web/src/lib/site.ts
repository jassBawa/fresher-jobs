/**
 * The collection queries every page shares.
 *
 * Kept apart from listings.ts and clusters.ts because this module touches
 * `astro:content`, and those two stay importable from a plain test runner.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { isExpired, today } from './listings';

export type JobEntry = CollectionEntry<'jobs'>;

/** Newest first, by when the employer posted it rather than when we drafted it. */
const byNewest = (a: JobEntry, b: JobEntry) => {
	const key = (e: JobEntry) => e.data.postedAt ?? e.data.createdAt.slice(0, 10);
	return key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0;
};

/** Every published listing, including ones whose deadline has passed. */
export async function publishedListings(): Promise<JobEntry[]> {
	const jobs = await getCollection('jobs', ({ data }) => data.status === 'published');
	return jobs.sort(byNewest);
}

/** What the site actively shows: published and still open. */
export async function liveListings(on: string = today()): Promise<JobEntry[]> {
	return (await publishedListings()).filter((job) => !isExpired(job.data, on));
}

/**
 * Published listings whose deadline has passed.
 *
 * These keep their URLs, so they must also keep a way in from inside the site:
 * a reader who saw a listing yesterday should find out it closed rather than
 * meet a gap where it was. Shown in a lower register beneath the open rows,
 * and never counted in the open totals or the sitemap.
 */
export async function closedListings(on: string = today()): Promise<JobEntry[]> {
	return (await publishedListings()).filter((job) => isExpired(job.data, on));
}
