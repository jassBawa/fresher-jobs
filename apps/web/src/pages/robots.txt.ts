export function GET({ site }: { site: URL }) {
	return new Response(`User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', site)}
`, {
		headers: { 'content-type': 'text/plain' },
	});
}