// @ts-check
import { defineConfig } from 'astro/config';

// The canonical origin. Every canonical tag, the sitemap and robots.txt are
// built from it, so getting it wrong is not a visible failure — the site builds
// clean and ships pointing at a domain that isn't yours.
//
// It used to default to https://jobs.example.com, which meant an unset SITE_URL
// repository variable would have deployed exactly that, silently. So CI now
// refuses to build without it, and local builds fall back to something
// obviously local rather than something plausibly real.
const site = process.env.SITE;

if (!site && process.env.CI) {
	throw new Error(
		'SITE is not set. Canonical URLs, the sitemap and robots.txt all derive from it, ' +
			'so building without it would publish the wrong origin. Set the SITE_URL ' +
			'repository variable (Settings → Secrets and variables → Actions → Variables).'
	);
}

if (!site) {
	console.warn('\n  ! SITE not set — building with http://localhost:4321 for canonicals.\n');
}

// https://astro.build/config
export default defineConfig({
	site: site || 'http://localhost:4321',
	output: 'static',
});
