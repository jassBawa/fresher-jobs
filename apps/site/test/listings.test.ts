import test from 'node:test';
import assert from 'node:assert/strict';
import type { Job } from '@jobs/db';
import {
	expiresOn,
	isExpired,
	isIndexable,
	listingRobots,
	statusOf,
	closesLabel,
	daysLeft,
	shortDay,
	payLabel,
	STALE_AFTER_DAYS,
} from '../lib/listings.ts';

/** A listing that clears the indexing gate, so each test breaks one thing. */
const job = (over: Partial<Job> = {}): Job =>
	({
		id: 1,
		slug: 'wipro-graduate-engineer-trainee',
		status: 'published',
		company: 'Wipro Limited',
		companySlug: 'wipro-limited',
		role: 'Graduate Engineer Trainee',
		roleFamily: 'graduate-trainee',
		jobType: 'full-time',
		batchYears: ['2025', '2026'],
		qualifications: [],
		experienceRequired: null,
		salary: '₹4 to 6 LPA (Expected)',
		locations: ['Bengaluru'],
		cities: ['Bengaluru'],
		lastDateToApply: null,
		applyByDate: null,
		applyUrl: 'https://careers.wipro.com/job/190712',
		skills: ['Java', 'SQL', 'Testing'],
		requirements: [],
		responsibilities: [],
		title: 'Wipro Limited — Graduate Engineer Trainee',
		description: 'Wipro is hiring.',
		summary: 'Wipro is hiring.',
		about: null,
		generatedBy: 'llm+template',
		draftedAt: new Date(),
		applyCheck: 'live',
		applyCheckedAt: new Date(),
		applyFinalUrl: null,
		applyNote: null,
		sourceRef: null,
		postedAt: '2026-08-11',
		rejectedReason: null,
		createdAt: new Date('2026-08-12T00:00:00Z'),
		updatedAt: new Date('2026-08-12T00:00:00Z'),
		...over,
	}) as Job;

// ------------------------------------------------------------------- expiry

test('a stated deadline wins over the freshness horizon', () => {
	assert.equal(expiresOn({ applyByDate: '2026-09-01', postedAt: '2026-08-11' }), '2026-09-01');
});

test('with no deadline, expiry is the horizon measured from posting', () => {
	assert.equal(expiresOn({ applyByDate: null, postedAt: '2026-08-11' }), '2026-10-10');
	assert.equal(STALE_AFTER_DAYS, 60);
});

test('a listing that cannot be dated at all is treated as live', () => {
	// Hiding one we merely failed to date is the worse error.
	assert.equal(expiresOn({ applyByDate: null, postedAt: null }), null);
	assert.equal(isExpired({ applyByDate: null, postedAt: null }, '2099-01-01'), false);
});

test('a listing is live up to and including its last day', () => {
	const fm = { applyByDate: '2026-09-01', postedAt: null };
	assert.equal(isExpired(fm, '2026-09-01'), false, 'the deadline day itself still counts');
	assert.equal(isExpired(fm, '2026-09-02'), true);
});

// ------------------------------------------------------------------ status

test('status splits into apply-now, apply-today and do-not-bother', () => {
	const at = (d: string) => statusOf({ applyByDate: d, postedAt: null }, '2026-08-14');
	assert.equal(at('2026-09-30'), 'open');
	assert.equal(at('2026-08-21'), 'closing', 'exactly a week out');
	assert.equal(at('2026-08-22'), 'open');
	assert.equal(at('2026-08-13'), 'closed');
});

test('the deadline is phrased in the reader terms, not as arithmetic', () => {
	const at = (d: string) =>
		closesLabel({ applyByDate: d, postedAt: null, lastDateToApply: null }, '2026-08-14');
	assert.equal(at('2026-08-14'), 'Closes today');
	assert.equal(at('2026-08-15'), 'Closes tomorrow');
	assert.equal(at('2026-08-20'), '6 days left');
	assert.equal(at('2026-12-31'), 'Open till 31 Dec 2026');
});

test('with no deadline the source phrasing is shown rather than invented', () => {
	assert.equal(
		closesLabel({ applyByDate: null, postedAt: null, lastDateToApply: 'Rolling Basis' }, '2026-08-14'),
		'Rolling Basis'
	);
});

test('days left counts from the effective end date', () => {
	assert.equal(daysLeft({ applyByDate: '2026-08-20', postedAt: null }, '2026-08-14'), 6);
	assert.equal(daysLeft({ applyByDate: null, postedAt: null }, '2026-08-14'), null);
});

// ---------------------------------------------------------------- indexing

test('a strong listing with a verified link is indexed', () => {
	assert.equal(isIndexable(job(), '2026-08-13'), true);
	assert.equal(listingRobots(job(), '2026-08-13'), 'index, follow');
});

test('a listing whose apply link failed its check is never indexed', () => {
	// New here: the file-backed site could not know this. A page whose link goes
	// nowhere should not be competing in search.
	assert.equal(isIndexable(job({ applyCheck: 'dead' }), '2026-08-13'), false);
	assert.equal(isIndexable(job({ applyCheck: 'role_mismatch' }), '2026-08-13'), false);
});

test('an unverified link does not disqualify a listing', () => {
	// needs_browser is the common case, not a failure — most Indian ATS pages
	// render client-side. Excluding them would empty the index.
	assert.equal(isIndexable(job({ applyCheck: 'needs_browser' }), '2026-08-13'), true);
});

test('drafts, rejects and expired listings are never indexed', () => {
	assert.equal(isIndexable(job({ status: 'draft' }), '2026-08-13'), false);
	assert.equal(isIndexable(job({ status: 'rejected' }), '2026-08-13'), false);
	assert.equal(isIndexable(job(), '2027-01-01'), false);
});

test('a listing with no apply link is a dead end', () => {
	assert.equal(isIndexable(job({ applyUrl: null }), '2026-08-13'), false);
});

test('template-only drafts stay out of the index', () => {
	assert.equal(isIndexable(job({ generatedBy: 'template' }), '2026-08-13'), false);
});

test('a listing needs three signals of substance', () => {
	const two = job({ salary: null, skills: ['Java'] });
	assert.equal(isIndexable(two, '2026-08-13'), false);
	assert.equal(isIndexable(job({ skills: ['Java'] }), '2026-08-13'), true);
});

test('a listing kept out of the index is still followed', () => {
	assert.equal(listingRobots(job({ generatedBy: 'template' }), '2026-08-13'), 'noindex, follow');
});

// -------------------------------------------------------------- formatting

test('the page owns the salary hedge, so the source keeps none of its own', () => {
	assert.equal(payLabel('₹ 4 to 7 LPA (Expected)'), '₹4 to 7 LPA');
	assert.equal(payLabel('10- 20 LPA'), '10–20 LPA');
	assert.equal(payLabel(null), '');
});

test('the date rail is short enough to scan', () => {
	assert.equal(shortDay('2026-08-14'), '14 Aug');
	assert.equal(shortDay(null), '');
});
