import test from 'node:test';
import assert from 'node:assert/strict';
import type { DraftFrontmatter } from '@jobs/schema';
import type { Cluster } from '../src/lib/clusters.ts';
import {
	slugify,
	normalizeCity,
	isState,
	isPlace,
	roleFamily,
	buildClusters,
	clusterIsIndexable,
	clusterRobots,
	MIN_CLUSTER_SIZE,
	MIN_INDEXABLE_CLUSTER_SIZE,
} from '../src/lib/clusters.ts';

const listing = (over: Partial<DraftFrontmatter> = {}): DraftFrontmatter => ({
	title: 'A job',
	description: 'A job.',
	slug: 'a-job',
	status: 'published',
	company: 'Acme',
	role: 'Software Engineer',
	locations: ['Bengaluru'],
	batchYears: ['2026'],
	generatedBy: 'llm+template',
	createdAt: '2026-08-12T00:00:00.000Z',
	...over,
});

/** Only `slugs` matters to the indexing helpers; the rest is scaffolding. */
const cluster = (slugs: string[]): Cluster => ({
	kind: 'city',
	path: 'jobs-in-bengaluru',
	title: 'Fresher Jobs in Bengaluru',
	heading: 'Fresher jobs in Bengaluru',
	description: 'Openings in Bengaluru.',
	slugs,
});

const paths = (clusters: Cluster[]): string[] => clusters.map((c) => c.path).sort();

const find = (clusters: Cluster[], path: string): Cluster | undefined =>
	clusters.find((c) => c.path === path);

/** For assertions about a cluster that must exist — fails with the paths that
 *  were actually built rather than a null dereference. */
const mustFind = (clusters: Cluster[], path: string): Cluster => {
	const found = find(clusters, path);
	if (!found) assert.fail(`expected cluster ${path}; built: ${paths(clusters).join(', ') || 'none'}`);
	return found;
};

// --------------------------------------------------------------- normalizing

test('slugify produces URL-safe segments', () => {
	assert.equal(slugify('Software Development Engineer I (SDE I)'), 'software-development-engineer-i-sde-i');
	assert.equal(slugify('  Bengaluru  '), 'bengaluru');
	assert.equal(slugify('!!!'), '');
});

test('colonial and current city names resolve to one name', () => {
	// Left alone this splits one city across two thin URLs.
	assert.equal(normalizeCity('Bangalore'), 'Bengaluru');
	assert.equal(normalizeCity('bengaluru'), 'Bengaluru');
	assert.equal(normalizeCity('BOMBAY'), 'Mumbai');
	assert.equal(normalizeCity('Calcutta'), 'Kolkata');
	assert.equal(normalizeCity('Madras'), 'Chennai');
	assert.equal(normalizeCity('Gurgaon'), 'Gurugram');
	assert.equal(normalizeCity('New Delhi'), 'Delhi');
});

test('an unknown city is title-cased, not dropped', () => {
	assert.equal(normalizeCity('coimbatore'), 'Coimbatore');
});

test('states are recognised as states', () => {
	assert.equal(isState('Maharashtra'), true);
	assert.equal(isState('tamil nadu'), true);
	assert.equal(isState('Bengaluru'), false);
});

// ------------------------------------------------------------ role families

test('titles for one intent collapse to one family', () => {
	// These three are the same job written three ways; exact matching on the
	// raw title would produce three clusters of one.
	assert.equal(roleFamily({ role: 'Software Development Engineer I (SDE I)' })?.slug, 'software-engineer');
	assert.equal(roleFamily({ role: 'Full Stack Developer' })?.slug, 'software-engineer');
	assert.equal(roleFamily({ role: 'Associate Software Engineer' })?.slug, 'software-engineer');
});

test('the more specific family wins over the general one', () => {
	assert.equal(roleFamily({ role: 'Data Analyst' })?.slug, 'data-analyst');
	assert.equal(roleFamily({ role: 'Business Analyst' })?.slug, 'business-analyst');
	assert.equal(roleFamily({ role: 'Risk Analyst' })?.slug, 'analyst');
});

test('an internship is a family regardless of its title', () => {
	assert.equal(roleFamily({ role: 'Software Engineering Intern', jobType: 'internship' })?.slug, 'internship');
});

test('an unrecognised role has no family rather than a wrong one', () => {
	assert.equal(roleFamily({ role: 'Chief Happiness Officer' }), null);
});

// ---------------------------------------------------------------- clustering

test('a facet needs two listings before it gets a page', () => {
	assert.equal(MIN_CLUSTER_SIZE, 2);
	const one = buildClusters([listing()]);
	assert.deepEqual(paths(one), []);
});

test('two listings in one city produce a city cluster', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', company: 'Acme' }),
		listing({ slug: 'b', company: 'Globex' }),
	]);
	assert.equal(mustFind(clusters, 'jobs-in-bengaluru').slugs.length, 2);
});

test('city aliases merge into a single cluster', () => {
	// The regression: /jobs-in-bangalore and /jobs-in-bengaluru side by side.
	const clusters = buildClusters([
		listing({ slug: 'a', locations: ['Bangalore'] }),
		listing({ slug: 'b', locations: ['Bengaluru'] }),
		listing({ slug: 'c', locations: ['bangalore'] }),
	]);
	assert.equal(find(clusters, 'jobs-in-bangalore'), undefined);
	assert.equal(mustFind(clusters, 'jobs-in-bengaluru').slugs.length, 3);
});

test('role, city, company, batch and role-in-city are all generated', () => {
	const clusters = buildClusters([
		listing({ slug: 'a' }),
		listing({ slug: 'b' }),
	]);
	const found = paths(clusters);
	for (const expected of [
		'2026-batch-jobs',
		'acme-jobs',
		'jobs-in-bengaluru',
		'software-engineer-jobs',
		'software-engineer-jobs-in-bengaluru',
	]) {
		assert.ok(found.includes(expected), `missing ${expected} in ${found.join(', ')}`);
	}
});

test('a listing is counted once per cluster even with repeated locations', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', locations: ['Bengaluru', 'Bangalore'] }),
		listing({ slug: 'b', locations: ['Bengaluru'] }),
	]);
	assert.deepEqual(mustFind(clusters, 'jobs-in-bengaluru').slugs, ['a', 'b']);
});

test('malformed batch years are ignored', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', batchYears: ['2026', 'nonsense', ''] }),
		listing({ slug: 'b', batchYears: ['2026'] }),
	]);
	mustFind(clusters, '2026-batch-jobs');
	assert.equal(clusters.filter((c) => c.kind === 'batch').length, 1);
});

test('a listing with no family still clusters by city and company', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', role: 'Chief Happiness Officer' }),
		listing({ slug: 'b', role: 'Chief Happiness Officer' }),
	]);
	mustFind(clusters, 'jobs-in-bengaluru');
	assert.equal(clusters.filter((c) => c.kind === 'role').length, 0);
});

test('clusters are ordered by size, largest first', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', company: 'Acme' }),
		listing({ slug: 'b', company: 'Acme' }),
		listing({ slug: 'c', company: 'Globex' }),
	]);
	const sizes = clusters.map((c) => c.slugs.length);
	assert.deepEqual(sizes, [...sizes].sort((x, y) => y - x));
});

// ------------------------------------------------------------ cluster indexing

test('a cluster needs three listings to enter the index', () => {
	assert.equal(MIN_INDEXABLE_CLUSTER_SIZE, 3);
	assert.equal(clusterIsIndexable(cluster(['a', 'b'])), false);
	assert.equal(clusterIsIndexable(cluster(['a', 'b', 'c'])), true);
});

test('a thin cluster is noindex but still followed', () => {
	assert.equal(clusterRobots(cluster(['a', 'b'])), 'noindex, follow');
	assert.equal(clusterRobots(cluster(['a', 'b', 'c'])), 'index, follow');
});

test('a location string is reduced to its city', () => {
	// Postings write the whole address into one entry.
	assert.equal(normalizeCity('Hyderabad, Karnataka'), 'Hyderabad');
	assert.equal(normalizeCity('Navi Mumbai, India'), 'Navi Mumbai');
	assert.equal(normalizeCity('Bangalore, Karnataka, India'), 'Bengaluru');
});

test('a state is still recognised when it carries a tail', () => {
	assert.equal(isState('Maharashtra, India'), true);
});

test('addresses and bare city names land in the same cluster', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', locations: ['Bangalore, Karnataka, India'] }),
		listing({ slug: 'b', locations: ['Bengaluru'] }),
	]);
	assert.equal(mustFind(clusters, 'jobs-in-bengaluru').slugs.length, 2);
});

test('"PAN India" and friends are not places', () => {
	// Real value from the source. Untreated it built /jobs-in-pan-india/ and
	// claimed a city of that name in the structured data.
	for (const raw of ['PAN India', 'pan india', 'All India', 'Remote', 'Work From Home', 'Multiple Locations']) {
		assert.equal(isPlace(raw), false, raw);
	}
	for (const raw of ['Bengaluru', 'Pune', 'Maharashtra', 'Navi Mumbai, India']) {
		assert.equal(isPlace(raw), true, raw);
	}
});

test('a non-place builds no city cluster', () => {
	const clusters = buildClusters([
		listing({ slug: 'a', locations: ['PAN India'] }),
		listing({ slug: 'b', locations: ['PAN India'] }),
		listing({ slug: 'c', locations: ['PAN India', 'Pune'] }),
	]);
	assert.equal(find(clusters, 'jobs-in-pan-india'), undefined);
	assert.equal(clusters.filter((c) => c.kind === 'city').length, 0);
});
