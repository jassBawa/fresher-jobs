import { getCollection } from 'astro:content';

export async function GET({ site }: { site: URL }) {
	const jobs = await getCollection('jobs', ({ data }) => data.status === 'published');

	const urls = jobs
		.map(
			(job) => `
	<url>
		<loc>${new URL(`/jobs/${job.data.slug}/`, site)}</loc>
		<lastmod>${job.data.createdAt.slice(0, 10)}</lastmod>
	</url>`
		)
		.join('');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url>
		<loc>${new URL('/', site)}</loc>
		<lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
	</url>${urls}
</urlset>`,
		{
			headers: { 'content-type': 'application/xml' },
		}
	);
}