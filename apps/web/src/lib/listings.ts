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
