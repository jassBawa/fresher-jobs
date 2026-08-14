/**
 * Cluster pages — the indexable surface (decision D5).
 *
 * Individual listings are mostly `noindex`; what competes in search is the
 * aggregate page. The URL shapes here follow how the query is actually typed in
 * this market — "wipro jobs", "software engineer jobs in bengaluru",
 * "2026 batch jobs" — rather than a faceted `/jobs?role=&city=` scheme.
 *
 * Research note behind this: Freshersworld has 386 skill pages and 360 city
 * pages but only 40 combined role-in-city pages, against a cross-product in the
 * six figures. The highest-intent template in the vertical is unclaimed.
 *
 * Pure functions over plain frontmatter — no Astro imports — so they can be
 * tested directly.
 */

import type { DraftFrontmatter } from '@jobs/schema';

/** Below this a cluster is a near-duplicate of the listing it contains, so no
 *  page is generated at all. */
export const MIN_CLUSTER_SIZE = 2;

/** Below this a cluster page exists for navigation but stays out of the index —
 *  a two-item page is not a better answer than the listings themselves. */
export const MIN_INDEXABLE_CLUSTER_SIZE = 3;

export type ClusterKind = 'role' | 'city' | 'company' | 'batch' | 'role-city';

export interface Cluster {
	kind: ClusterKind;
	/** Path without leading or trailing slash, e.g. `software-engineer-jobs-in-pune`. */
	path: string;
	title: string;
	heading: string;
	description: string;
	slugs: string[];
}

export const slugify = (s: string): string =>
	s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * Indian cities are routinely written under both their current and colonial
 * names, and postings mix them freely. Left alone this splits one city across
 * two URLs — the first build produced /jobs-in-bangalore and
 * /jobs-in-bengaluru side by side, each too thin to index, when together they
 * clear the bar. Near-duplicate cluster pages are also exactly what D5 is
 * trying to avoid.
 */
const CITY_ALIASES: Readonly<Record<string, string>> = {
	bangalore: 'Bengaluru',
	bengaluru: 'Bengaluru',
	bombay: 'Mumbai',
	calcutta: 'Kolkata',
	madras: 'Chennai',
	gurgaon: 'Gurugram',
	poona: 'Pune',
	trivandrum: 'Thiruvananthapuram',
	cochin: 'Kochi',
	vizag: 'Visakhapatnam',
	mysore: 'Mysuru',
	mangalore: 'Mangaluru',
	baroda: 'Vadodara',
	pondicherry: 'Puducherry',
	secunderabad: 'Hyderabad',
	'new delhi': 'Delhi',
	'delhi ncr': 'Delhi',
	ncr: 'Delhi',
	noida: 'Noida',
	'greater noida': 'Noida',
};

/** States and union territories, which postings list in the same field as
 *  cities. They are still worth clustering, but they are not localities — the
 *  distinction matters for postal addresses in structured data. */
export const INDIAN_STATES: ReadonlySet<string> = new Set([
	'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
	'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
	'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
	'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
	'uttar pradesh', 'uttarakhand', 'west bengal', 'jammu and kashmir', 'ladakh',
	'puducherry', 'chandigarh', 'andaman and nicobar islands', 'lakshadweep',
	'dadra and nagar haveli and daman and diu',
]);

const titleCase = (s: string): string => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * Reduce a location string to one canonical city name.
 *
 * Postings write the whole address into a single entry — "Hyderabad,
 * Karnataka", "Navi Mumbai, India", "Bangalore, Karnataka, India" — which
 * without trimming becomes a cluster slug like `hyderabad-karnataka` and an
 * addressLocality no postal system recognises. The leading segment is the city;
 * the rest is administrative tail. (That first example is also simply wrong —
 * Hyderabad is in Telangana — which is another reason not to keep the tail.)
 */
const clean = (raw: string): string =>
	(raw.split(',')[0] ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function normalizeCity(raw: string): string {
	const key = clean(raw);
	return CITY_ALIASES[key] ?? titleCase(key);
}

/** True when a location names a state rather than a city. */
export const isState = (raw: string): boolean => INDIAN_STATES.has(clean(raw));

/**
 * Values that appear in `locations` but name no place at all.
 *
 * "PAN India" is the common one — Indian postings use it to mean nationwide —
 * and untreated it produced a `/jobs-in-pan-india/` cluster sitting alongside
 * real cities, plus `addressLocality: "Pan India"` in the structured data,
 * which is a claim about a city that does not exist.
 */
const NON_PLACES: ReadonlySet<string> = new Set([
	'pan india', 'all india', 'across india', 'india', 'anywhere in india',
	'remote', 'work from home', 'wfh', 'anywhere', 'hybrid', 'onsite',
	'multiple locations', 'various locations', 'multiple cities', 'across india locations',
	'not specified', 'na', 'n/a', 'tbd',
]);

/** True when a location names somewhere real enough to build a page about. */
export const isPlace = (raw: string): boolean => {
	const key = clean(raw);
	return key !== '' && !NON_PLACES.has(key);
};

/**
 * Role families. A raw job title is too sparse to cluster on — "Graduate
 * Engineer Trainee", "Associate Engineer" and "SDE I" are one intent expressed
 * three ways, and grouping by exact string would yield clusters of one.
 *
 * Order matters: the first match wins, so the specific patterns sit above the
 * general ones.
 */
const ROLE_FAMILIES: ReadonlyArray<{ slug: string; label: string; test: RegExp }> = [
	{ slug: 'data-analyst', label: 'Data Analyst', test: /\bdata\b.*\banalyst\b|\banalytics\b/i },
	{ slug: 'data-scientist', label: 'Data Scientist', test: /\bdata scien|machine learning|\bml\b|\bai\b/i },
	{ slug: 'data-engineer', label: 'Data Engineer', test: /\bdata engineer/i },
	{ slug: 'qa-engineer', label: 'QA Engineer', test: /\bqa\b|quality assurance|\btest(ing|er)?\b|automation/i },
	{
		slug: 'software-engineer',
		label: 'Software Engineer',
		test: /software|\bsde\b|developer|programmer|full.?stack|back.?end|front.?end|web dev/i,
	},
	{ slug: 'support-engineer', label: 'Support Engineer', test: /support|help ?desk|service desk|technical support/i },
	{ slug: 'business-analyst', label: 'Business Analyst', test: /business analyst|market research|consultant/i },
	{ slug: 'analyst', label: 'Analyst', test: /\banalyst\b/i },
	{ slug: 'graduate-trainee', label: 'Graduate Trainee', test: /trainee|graduate engineer|\bget\b|apprentice/i },
	{ slug: 'engineer', label: 'Engineer', test: /\bengineer\b/i },
];

export function roleFamily(fm: Pick<DraftFrontmatter, 'role' | 'jobType'>): { slug: string; label: string } | null {
	if (fm.jobType === 'internship') return { slug: 'internship', label: 'Internship' };
	const role = fm.role ?? '';
	for (const family of ROLE_FAMILIES) {
		if (family.test.test(role)) return { slug: family.slug, label: family.label };
	}
	return null;
}

type Listing = DraftFrontmatter;

/**
 * Group listings into every cluster that clears MIN_CLUSTER_SIZE.
 *
 * `listings` should already be filtered to published and unexpired — a cluster
 * is a view over what the site is currently showing.
 */
export function buildClusters(listings: Listing[]): Cluster[] {
	const buckets = new Map<string, { cluster: Omit<Cluster, 'slugs'>; slugs: string[] }>();

	const add = (cluster: Omit<Cluster, 'slugs'>, slug: string) => {
		const found = buckets.get(cluster.path);
		if (found) found.slugs.push(slug);
		else buckets.set(cluster.path, { cluster, slugs: [slug] });
	};

	for (const fm of listings) {
		const family = roleFamily(fm);
		const cities = fm.locations ?? [];

		if (family) {
			add(
				{
					kind: 'role',
					path: `${family.slug}-jobs`,
					title: `${family.label} Jobs for Freshers in India`,
					heading: `${family.label} jobs for freshers`,
					description: `Current ${family.label.toLowerCase()} openings for freshers and early-career candidates across India.`,
				},
				fm.slug
			);
		}

		for (const rawCity of cities) {
			if (!isPlace(rawCity)) continue; // "PAN India" is not a city
			const cityName = normalizeCity(rawCity);
			const citySlug = slugify(cityName);
			if (!citySlug) continue;

			add(
				{
					kind: 'city',
					path: `jobs-in-${citySlug}`,
					title: `Fresher Jobs in ${cityName}`,
					heading: `Fresher jobs in ${cityName}`,
					description: `Current openings for freshers and early-career candidates in ${cityName}.`,
				},
				fm.slug
			);

			if (family) {
				add(
					{
						kind: 'role-city',
						path: `${family.slug}-jobs-in-${citySlug}`,
						title: `${family.label} Jobs in ${cityName} for Freshers`,
						heading: `${family.label} jobs in ${cityName}`,
						description: `Current ${family.label.toLowerCase()} openings for freshers in ${cityName}.`,
					},
					fm.slug
				);
			}
		}

		const companySlug = slugify(fm.company ?? '');
		if (companySlug) {
			add(
				{
					kind: 'company',
					path: `${companySlug}-jobs`,
					title: `${fm.company} Jobs for Freshers`,
					heading: `${fm.company} openings`,
					description: `Current ${fm.company} openings for freshers and early-career candidates in India.`,
				},
				fm.slug
			);
		}

		for (const year of fm.batchYears ?? []) {
			if (!/^\d{4}$/.test(year)) continue;
			add(
				{
					kind: 'batch',
					path: `${year}-batch-jobs`,
					title: `${year} Batch Jobs for Freshers in India`,
					heading: `${year} batch jobs`,
					description: `Openings open to the ${year} passing-out batch across India.`,
				},
				fm.slug
			);
		}
	}

	return [...buckets.values()]
		.filter(({ slugs }) => slugs.length >= MIN_CLUSTER_SIZE)
		.map(({ cluster, slugs }) => ({ ...cluster, slugs: [...new Set(slugs)] }))
		.sort((a, b) => b.slugs.length - a.slugs.length || a.path.localeCompare(b.path));
}

export const clusterIsIndexable = (cluster: Cluster): boolean =>
	cluster.slugs.length >= MIN_INDEXABLE_CLUSTER_SIZE;

export const clusterRobots = (cluster: Cluster): string =>
	clusterIsIndexable(cluster) ? 'index, follow' : 'noindex, follow';
