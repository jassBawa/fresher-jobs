import type { NextConfig } from 'next';

/**
 * The canonical origin. Every canonical tag, the sitemap and robots.txt derive
 * from it, so getting it wrong is not a visible failure — the site builds clean
 * and ships pointing at a domain that isn't yours. CI refuses to build without
 * it rather than guessing.
 */
if (!process.env.SITE && process.env.CI) {
	throw new Error(
		'SITE is not set. Canonical URLs, the sitemap and robots.txt all derive from it.'
	);
}

const nextConfig: NextConfig = {
	// The database driver must not be bundled into the server build.
	serverExternalPackages: ['postgres'],
	poweredByHeader: false,
	trailingSlash: true,
};

export default nextConfig;
