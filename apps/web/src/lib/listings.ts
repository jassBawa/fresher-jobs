/**
 * Listing policy: when a posting goes stale, and which pages Google is allowed
 * to index.
 *
 * Pure functions over plain frontmatter — no Astro imports, no clock — so the
 * rules can be unit-tested directly. Callers pass `today` in.
 */

import type { DraftFrontmatter } from '@jobs/schema';

/**
 * How long a posting stays live when it names no deadline.
 *
 * Of the postings ingested so far, none state a parseable last date — they say
 * "ASAP", "Rolling Basis", or nothing. Without a horizon those listings would
 * never retire and the site would accumulate dead apply links indefinitely,
 * which is the failure mode that makes aggregators worthless. Sixty days is
 * roughly the point at which an Indian fresher requisition has been filled.
 */
export const STALE_AFTER_DAYS = 60;

/** Today, as a `YYYY-MM-DD` string. */
export const today = (): string => new Date().toISOString().slice(0, 10);

const addDays = (isoDay: string, days: number): string => {
	const d = new Date(`${isoDay}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};

/**
 * The day a listing stops being shown: its stated deadline when it has one,
 * otherwise the freshness horizon measured from when it was posted.
 *
 * Null means we cannot date it at all — those are treated as live, since
 * hiding a listing we simply failed to date is the worse error.
 */
export function expiresOn(
	fm: Pick<DraftFrontmatter, 'applyByDate' | 'postedAt'>,
	horizonDays: number = STALE_AFTER_DAYS
): string | null {
	if (fm.applyByDate) return fm.applyByDate;
	if (fm.postedAt) return addDays(fm.postedAt, horizonDays);
	return null;
}

export function isExpired(
	fm: Pick<DraftFrontmatter, 'applyByDate' | 'postedAt'>,
	on: string,
	horizonDays: number = STALE_AFTER_DAYS
): boolean {
	const end = expiresOn(fm, horizonDays);
	return end !== null && on > end;
}

/**
 * Whether an individual listing earns a place in Google's index.
 *
 * Decision D5 calls for `noindex` on the majority of listings, with cluster
 * pages as the indexable surface. The reasoning is that a page restating a
 * scraped requisition adds tokens, not information — which is the exact pattern
 * Google's spam policy names, and what took 96% of Datanyze's traffic.
 *
 * So a listing has to carry something a cluster page cannot: a live application
 * link, prose written for it, and enough structured detail to answer "can I
 * apply" without clicking through. Everything else is `noindex, follow` — still
 * reachable, still passing link equity to the apply URL, just not competing in
 * search as a thin page.
 */
export function isIndexable(fm: DraftFrontmatter, on: string): boolean {
	if (fm.status !== 'published') return false;
	if (isExpired(fm, on)) return false;
	if (!fm.applyUrl) return false; // a listing you cannot apply from is a dead end
	if (fm.generatedBy !== 'llm+template') return false; // template-only is thinner still

	// Enough substance to stand on its own.
	const signals = [
		Boolean(fm.salary),
		Boolean(fm.batchYears?.length),
		Boolean(fm.locations?.length),
		(fm.skills?.length ?? 0) >= 3,
		Boolean(fm.lastDateToApply),
	].filter(Boolean).length;

	return signals >= 3;
}

/** The robots directive for a listing page. Never `noindex, nofollow` — the
 *  apply link and the cluster pages should still be crawled. */
export const listingRobots = (fm: DraftFrontmatter, on: string): string =>
	isIndexable(fm, on) ? 'index, follow' : 'noindex, follow';

// --------------------------------------------------------------- presentation

export type ListingStatus = 'open' | 'closing' | 'closed';

/** Whole days from `on` until the listing stops accepting applications.
 *  Null when it cannot be dated at all. */
export function daysLeft(
	fm: Pick<DraftFrontmatter, 'applyByDate' | 'postedAt'>,
	on: string
): number | null {
	const end = expiresOn(fm);
	if (!end) return null;
	const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${on}T00:00:00Z`);
	return Math.round(ms / 86_400_000);
}

/**
 * Three states, because that is what the reader is deciding between: apply now,
 * apply today, or do not bother. "Closing" is a week, which is roughly the
 * window in which a fresher can still assemble a CV and a cover note.
 */
export function statusOf(
	fm: Pick<DraftFrontmatter, 'applyByDate' | 'postedAt'>,
	on: string
): ListingStatus {
	const left = daysLeft(fm, on);
	if (left === null) return 'open';
	if (left < 0) return 'closed';
	return left <= 7 ? 'closing' : 'open';
}

/** The deadline in the reader's terms. A date alone makes them do arithmetic. */
export function closesLabel(
	fm: Pick<DraftFrontmatter, 'applyByDate' | 'postedAt' | 'lastDateToApply'>,
	on: string
): string {
	const left = daysLeft(fm, on);
	if (left === null) return fm.lastDateToApply ?? 'No deadline stated';
	if (left < 0) return 'Closed';
	if (left === 0) return 'Closes today';
	if (left === 1) return 'Closes tomorrow';
	if (left <= 30) return `${left} days left`;
	// Beyond a month the count stops meaning anything; name the date instead.
	const end = expiresOn(fm)!;
	const [y, m, d] = end.split('-').map(Number);
	const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
		(m ?? 1) - 1
	];
	return `Open till ${d} ${month} ${y}`;
}

/**
 * Salary with the source's own hedge removed.
 *
 * Values arrive as "₹ 4 to 7 LPA (Expected)" and the page adds its own
 * "· estimated", which read together as "(Expected) · estimated" — the same
 * caveat twice. The page owns the hedge; the source's parenthetical goes.
 */
export function payLabel(salary: string | undefined): string {
	if (!salary) return '';
	return salary
		.replace(/\s*\((?:expected|approx\.?|estimated|tentative)[^)]*\)/gi, '')
		// The source writes ranges as "10- 20 LPA" and "₹ 4 to 7". Close the gap
		// around the dash so a range reads as one number, not two.
		.replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
		.replace(/₹\s+/g, '₹')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** `2026-08-14` → `14 Aug`. Same year is assumed; the rail is for scanning. */
export function shortDay(iso: string | undefined): string {
	if (!iso) return '';
	const [, m, d] = iso.split('-').map(Number);
	const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
		(m ?? 1) - 1
	];
	return `${d} ${month}`;
}
