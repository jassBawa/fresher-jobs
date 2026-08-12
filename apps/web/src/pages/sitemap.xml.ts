/**
 * The sitemap lists only what the site asks Google to index.
 *
 * Submitting a URL here and serving it with `noindex` sends two contradictory
 * signals, and the whole point of D5 is to be unambiguous about which pages are
 * the ones worth ranking. So expired listings, thin clusters and listings that
 * fail the quality gate are all absent — they stay crawlable via on-page links,
 * just not advertised.
 */
import { buildClusters, clusterIsIndexable } from '../lib/clusters';
import { isIndexable, today } from '../lib/listings';
import { liveListings } from '../lib/site';

const xmlEscape = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET({ site }: { site: URL }) {
	const on = today();
	const jobs = await liveListings(on);

	const entries: Array<{ loc: URL; lastmod: string }> = [
		{ loc: new URL('/', site), lastmod: on },
	];

	for (const job of jobs) {
		if (!isIndexable(job.data, on)) continue;
		entries.push({
			loc: new URL(`/jobs/${job.data.slug}/`, site),
			lastmod: job.data.postedAt ?? job.data.createdAt.slice(0, 10),
		});
	}

	for (const cluster of buildClusters(jobs.map((job) => job.data))) {
		if (!clusterIsIndexable(cluster)) continue;
		entries.push({ loc: new URL(`/${cluster.path}/`, site), lastmod: on });
	}

	const urls = entries
		.map(
			({ loc, lastmod }) => `
	<url>
		<loc>${xmlEscape(String(loc))}</loc>
		<lastmod>${lastmod}</lastmod>
	</url>`
		)
		.join('');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`,
		{ headers: { 'content-type': 'application/xml' } }
	);
}
