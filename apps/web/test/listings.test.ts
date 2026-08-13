import test from 'node:test';
import assert from 'node:assert/strict';
import type { DraftFrontmatter } from '@jobs/schema';
import { expiresOn, isExpired, isIndexable, listingRobots, STALE_AFTER_DAYS } from '../src/lib/listings.ts';

/** A listing that clears the indexing gate, so each test can break one thing.
 *  Typed against the real contract so the fixtures cannot drift from it. */
const listing = (over: Partial<DraftFrontmatter> = {}): DraftFrontmatter => ({
	title: 'Wipro Limited - Graduate Engineer Trainee',
	description: 'Wipro is hiring.',
	slug: 'wipro-limited-graduate-engineer-trainee',
	status: 'published',
	company: 'Wipro Limited',
	role: 'Graduate Engineer Trainee',
	batchYears: ['2025', '2026'],
	locations: ['Bengaluru'],
	salary: '₹4 to 6 LPA (Expected)',
	applyUrl: 'https://careers.wipro.com/job/190712',
	skills: ['Java', 'SQL', 'Testing'],
	generatedBy: 'llm+template',
	createdAt: '2026-08-12T18:02:36.377Z',
	postedAt: '2026-08-11',
	...over,
});

// ---------------------------------------------------------------- expiry

test('a stated deadline wins over the freshness horizon', () => {
	assert.equal(expiresOn({ applyByDate: '2026-09-01', postedAt: '2026-08-11' }), '2026-09-01');
});

test('with no deadline, expiry is the horizon measured from posting', () => {
	// 2026-08-11 + 60 days
	assert.equal(expiresOn({ postedAt: '2026-08-11' }), '2026-10-10');
	assert.equal(STALE_AFTER_DAYS, 60);
});

test('the horizon crosses month and year boundaries correctly', () => {
	assert.equal(expiresOn({ postedAt: '2026-11-15' }, 60), '2027-01-14');
	assert.equal(expiresOn({ postedAt: '2028-01-31' }, 30), '2028-03-01'); // leap year
});

test('a listing that cannot be dated at all is treated as live', () => {
	// Hiding a listing we merely failed to date is the worse error.
	assert.equal(expiresOn({}), null);
	assert.equal(isExpired({}, '2099-01-01'), false);
});

test('a listing is live up to and including its last day', () => {
	const fm = { applyByDate: '2026-09-01' };
	assert.equal(isExpired(fm, '2026-08-31'), false);
	assert.equal(isExpired(fm, '2026-09-01'), false, 'the deadline day itself still counts');
	assert.equal(isExpired(fm, '2026-09-02'), true);
});

// -------------------------------------------------------------- indexing

test('a strong listing is indexed', () => {
	assert.equal(isIndexable(listing(), '2026-08-13'), true);
	assert.equal(listingRobots(listing(), '2026-08-13'), 'index, follow');
});

test('drafts are never indexed', () => {
	assert.equal(isIndexable(listing({ status: 'draft' }), '2026-08-13'), false);
});

test('expired listings are never indexed', () => {
	assert.equal(isIndexable(listing(), '2027-01-01'), false);
});

test('a listing with no apply link is a dead end', () => {
	assert.equal(isIndexable(listing({ applyUrl: undefined }), '2026-08-13'), false);
});

test('template-only drafts stay out of the index', () => {
	// Thinner than the rest, and thin programmatic pages are the whole risk.
	assert.equal(isIndexable(listing({ generatedBy: 'template' }), '2026-08-13'), false);
});

test('a listing needs three signals of substance', () => {
	// The fixture carries salary, batchYears and locations; skills is one short
	// of counting and there is no deadline. Dropping salary leaves exactly two.
	const twoSignals = listing({ salary: undefined, skills: ['Java'] });
	assert.equal(isIndexable(twoSignals, '2026-08-13'), false);

	const threeSignals = listing({ skills: ['Java'] });
	assert.equal(isIndexable(threeSignals, '2026-08-13'), true);
});

test('skills count as a signal only at three or more', () => {
	// Held at two other signals, so skills alone decides.
	const base = { salary: undefined };
	assert.equal(isIndexable(listing({ ...base, skills: ['Java', 'SQL'] }), '2026-08-13'), false);
	assert.equal(
		isIndexable(listing({ ...base, skills: ['Java', 'SQL', 'Testing'] }), '2026-08-13'),
		true
	);
});

test('a stated deadline also counts as a signal', () => {
	const fm = listing({ salary: undefined, skills: ['Java'], lastDateToApply: 'Rolling Basis' });
	assert.equal(isIndexable(fm, '2026-08-13'), true);
});

test('a listing kept out of the index is still followed', () => {
	// The apply link and the cluster pages must stay crawlable.
	assert.equal(listingRobots(listing({ generatedBy: 'template' }), '2026-08-13'), 'noindex, follow');
});
