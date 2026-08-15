import type { MetadataRoute } from 'next';
import { liveListings, allClusters, MIN_INDEXABLE_CLUSTER_SIZE } from '@/lib/db';
import { isIndexable, today } from '@/lib/listings';

/**
 * The sitemap lists only what the site asks Google to index.
 *
 * Submitting a URL and serving it noindex sends two contradictory signals, and
 * the point of D5 is to be unambiguous about which pages are meant to rank. So
 * expired listings, thin clusters and listings that fail the quality gate — now
 * including an unverified apply link — are all absent. They stay crawlable via
 * on-page links, just not advertised.
 */
export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = process.env.SITE ?? 'http://localhost:3000';
	const on = today();
	const [listings, clusters] = await Promise.all([liveListings(), allClusters()]);

	return [
		{ url: `${base}/`, lastModified: on },
		...listings
			.filter((job) => isIndexable(job, on))
			.map((job) => ({
				url: `${base}/jobs/${job.slug}/`,
				lastModified: job.postedAt ?? on,
			})),
		...clusters
			.filter((c) => c.count >= MIN_INDEXABLE_CLUSTER_SIZE)
			.map((c) => ({ url: `${base}/${c.path}/`, lastModified: on })),
	];
}
