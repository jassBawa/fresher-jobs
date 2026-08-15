/**
 * Listing policy: when a posting goes stale, which pages Google may index, and
 * how a deadline is phrased to someone deciding in twenty seconds.
 *
 * Pure functions over a row — no database, no clock of their own — so the rules
 * are testable directly. Callers pass `today` in.
 *
 * The expiry rule is expressed twice on purpose: here for display, and in SQL in
 * db.ts for filtering. They must agree, which the tests assert against the same
 * fixtures.
 */

import type { Job } from '@jobs/db';

/**
 * How long a posting stays live when it names no deadline.
 *
 * Almost none do — they say "ASAP", "Rolling Basis", or nothing. Without a
 * horizon those listings would never retire and the site would accumulate dead
 * apply links, which is the failure that makes an aggregator worthless.
 */
export const STALE_AFTER_DAYS = 60;

export const today = (): string => new Date().toISOString().slice(0, 10);

const addDays = (isoDay: string, days: number): string => {
	const d = new Date(`${isoDay}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};

type Dated = Pick<Job, 'applyByDate' | 'postedAt'>;

/** The day a listing stops being shown. Null when it cannot be dated at all —
 *  those are treated as live, since hiding one we failed to date is worse. */
export function expiresOn(fm: Dated, horizonDays = STALE_AFTER_DAYS): string | null {
	if (fm.applyByDate) return fm.applyByDate;
	if (fm.postedAt) return addDays(fm.postedAt, horizonDays);
	return null;
}

export function isExpired(fm: Dated, on: string, horizonDays = STALE_AFTER_DAYS): boolean {
	const end = expiresOn(fm, horizonDays);
	return end !== null && on > end;
}

export type ListingStatus = 'open' | 'closing' | 'closed';

export function daysLeft(fm: Dated, on: string): number | null {
	const end = expiresOn(fm);
	if (!end) return null;
	return Math.round(
		(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${on}T00:00:00Z`)) / 86_400_000
	);
}

/** Three states, because that is what the reader is choosing between: apply
 *  now, apply today, or do not bother. */
export function statusOf(fm: Dated, on: string): ListingStatus {
	const left = daysLeft(fm, on);
	if (left === null) return 'open';
	if (left < 0) return 'closed';
	return left <= 7 ? 'closing' : 'open';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The deadline in the reader's terms. A bare date makes them do arithmetic. */
export function closesLabel(
	fm: Dated & Pick<Job, 'lastDateToApply'>,
	on: string
): string {
	const left = daysLeft(fm, on);
	if (left === null) return fm.lastDateToApply ?? 'No deadline stated';
	if (left < 0) return 'Closed';
	if (left === 0) return 'Closes today';
	if (left === 1) return 'Closes tomorrow';
	if (left <= 30) return `${left} days left`;
	const [y, m, d] = expiresOn(fm)!.split('-').map(Number);
	return `Open till ${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** `2026-08-14` → `14 Aug`. The rail is for scanning, not for precision. */
export function shortDay(iso: string | null | undefined): string {
	if (!iso) return '';
	const [, m, d] = iso.split('-').map(Number);
	return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

/**
 * Salary with the source's own hedge removed.
 *
 * Values arrive as "₹ 4 to 7 LPA (Expected)" and the page adds its own
 * "· estimated", which read together as the same caveat twice. The page owns
 * the hedge.
 */
export function payLabel(salary: string | null | undefined): string {
	if (!salary) return '';
	return salary
		.replace(/\s*\((?:expected|approx\.?|estimated|tentative)[^)]*\)/gi, '')
		.replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
		.replace(/₹\s+/g, '₹')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/**
 * Whether an individual listing earns a place in Google's index.
 *
 * D5 calls for `noindex` on the majority of listings, with cluster pages as the
 * indexable surface: a page restating a scraped requisition adds tokens, not
 * information, which is the pattern Google's spam policy names.
 *
 * A listing has to carry what a cluster page cannot — a *verified* apply link,
 * prose written for it, and enough detail to answer "can I apply" without
 * clicking through. The link check is new here: a page whose apply link has
 * never been confirmed should not be competing in search.
 */
export function isIndexable(job: Job, on: string): boolean {
	if (job.status !== 'published') return false;
	if (isExpired(job, on)) return false;
	if (!job.applyUrl) return false;
	if (job.applyCheck === 'dead' || job.applyCheck === 'role_mismatch') return false;
	if (job.generatedBy !== 'llm+template') return false;

	const signals = [
		Boolean(job.salary),
		job.batchYears.length > 0,
		job.locations.length > 0,
		job.skills.length >= 3,
		Boolean(job.lastDateToApply),
	].filter(Boolean).length;

	return signals >= 3;
}

/** Never `noindex, nofollow` — the apply link and the clusters still need
 *  crawling. */
export const listingRobots = (job: Job, on: string): string =>
	isIndexable(job, on) ? 'index, follow' : 'noindex, follow';
