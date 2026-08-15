/**
 * Checking that an apply link goes where the listing says it does.
 *
 * Nothing checked this before. The URL was picked by a model from the candidate
 * links on a source page, scored by a heuristic, and published. A spot check of
 * sixteen live listings found one pointing at a campus-hiring landing page
 * rather than the requisition — which the scorer had rated highly, because a
 * campus page mentions "graduate", "engineer" and "trainee" too.
 *
 * The classifier is deliberately reluctant to say "dead". Two false verdicts
 * cost very differently: marking a live job dead removes a real opportunity
 * from a reader who could have applied, while leaving a dead one up wastes a
 * click. So the only route to `dead` is an explicit signal — a 4xx/5xx, a
 * redirect to a site root, or a page whose *title* says the posting is gone.
 * Ambiguity resolves to `needs_browser`, which the site treats as unverified
 * rather than as either.
 *
 * `needs_browser` is not a failure mode, it is the common case: most Indian ATS
 * platforms (Oracle CX, Workday, SuccessFactors) render the posting
 * client-side, so a plain fetch receives an empty shell. Calling that a
 * mismatch would fail most of the real links on the site.
 */

import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { connect } from './client.js';
import { jobs } from './schema.js';

export type ApplyVerdict = 'live' | 'role_mismatch' | 'dead' | 'unreachable' | 'needs_browser';

export interface ApplyCheckResult {
	verdict: ApplyVerdict;
	note: string;
	finalUrl: string | null;
}

const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Words worth matching on. Short tokens and the filler that appears on every
 *  careers page carry no signal about *which* job this is. */
const STOPWORDS = new Set([
	'job', 'jobs', 'role', 'roles', 'career', 'careers', 'india', 'limited', 'private',
	'ltd', 'pvt', 'inc', 'corp', 'the', 'and', 'for', 'with', 'new', 'hiring', 'apply',
	'full', 'time', 'part', 'work', 'team', 'position',
]);

export const significantWords = (s: string): string[] =>
	Array.from(
		new Set(
			(s ?? '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, ' ')
				.split(' ')
				.filter((w) => w.length > 3 && !STOPWORDS.has(w))
		)
	);

/** Visible text, near enough. */
export const visibleText = (html: string): string =>
	html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z]+;|&#\d+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.toLowerCase()
		.trim();

export const titleOf = (html: string): string =>
	(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();

/**
 * A meta tag's content, whichever order the attributes come in.
 *
 * Captured by the delimiter that opened the value, because these routinely
 * contain apostrophes — Honeywell's is literally `Intern (Bachelor's)`, and a
 * `[^"']+` capture truncates it to `Intern (Bachelor`.
 */
export function metaContent(html: string, prop: string): string | null {
	const p = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return (
		html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content="([^"]*)"`, 'i'))?.[1] ??
		html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]*(?:property|name)=["']${p}["']`, 'i'))?.[1] ??
		null
	);
}

/** Titles from any JobPosting JSON-LD the page ships. */
export function jsonLdTitles(html: string): string[] {
	const out: string[] = [];
	for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
		try {
			const parsed = JSON.parse(m[1]!);
			for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
				if (node?.['@type'] === 'JobPosting' && typeof node.title === 'string') out.push(node.title);
			}
		} catch {
			/* a malformed block proves nothing either way */
		}
	}
	return out;
}

/**
 * Everything on the page that claims to name the job.
 *
 * The reason this exists: most Indian ATS platforms render the posting
 * client-side, so the body is an empty shell — but the shell almost always
 * still carries og:title or JSON-LD for the sake of link previews. Reading
 * those turned four of five "needs a browser" verdicts into real ones without
 * shipping a headless browser to do it.
 */
export const pageTitles = (html: string): string[] =>
	[
		titleOf(html),
		metaContent(html, 'og:title'),
		metaContent(html, 'twitter:title'),
		...jsonLdTitles(html),
	].filter((t): t is string => Boolean(t));

/** Words in the URL path. Slugified role names live here — Flex's posting is
 *  `/job/India-Pune/Junior-Engineer_WD123` — but a category page's URL reads
 *  the same way, so this is weaker evidence than anything on the page. */
export const pathWords = (url: string): string => {
	try {
		return decodeURIComponent(new URL(url).pathname).replace(/[^a-zA-Z0-9]+/g, ' ').toLowerCase();
	} catch {
		return '';
	}
};

/** Only in a <title> is this phrasing trustworthy. In body text it matches
 *  cookie banners, related-jobs rails, and legal boilerplate — an earlier
 *  body-wide version of this check reported two live Amazon and Wipro
 *  requisitions as gone. */
const GONE_TITLE =
	/(no longer (available|accepting)|position (has been )?(filled|closed)|job (not found|expired|unavailable)|404|page not found)/i;

/**
 * Decide what a fetched apply page proves. Pure — the network lives in
 * `checkApplyUrl` — so every branch is testable without a live requisition.
 */
export function classifyApplyPage(input: {
	status: number;
	finalUrl: string;
	html: string;
	role: string;
	company: string;
}): ApplyCheckResult {
	const { status, finalUrl, html, role, company } = input;

	if (status >= 400) {
		return { verdict: 'dead', note: `HTTP ${status}`, finalUrl };
	}

	let path = '/';
	try {
		path = new URL(finalUrl).pathname.replace(/\/+$/, '');
	} catch {
		/* keep the default */
	}
	if (path === '') {
		return { verdict: 'dead', note: 'redirected to the site root', finalUrl };
	}

	const title = titleOf(html);
	if (GONE_TITLE.test(title)) {
		return { verdict: 'dead', note: `title says: ${title.slice(0, 80)}`, finalUrl };
	}

	const text = visibleText(html);
	const titles = pageTitles(html).join(' ').toLowerCase();
	const roleWords = significantWords(role);
	const companyWords = significantWords(company);

	// What the page itself says, in descending order of trust: its own titles
	// and body text. The URL is deliberately not in here.
	const onPage = `${titles} ${text}`;
	const score = (hay: string) =>
		roleWords.length === 0 ? 1 : roleWords.filter((w) => hay.includes(w)).length / roleWords.length;

	const roleScore = score(onPage);
	const companySeen =
		companyWords.length === 0 ||
		companyWords.some((w) => onPage.includes(w) || finalUrl.toLowerCase().includes(w));

	if (roleScore >= 0.5 && companySeen) {
		return { verdict: 'live', note: `role match ${Math.round(roleScore * 100)}%`, finalUrl };
	}

	// A client-rendered shell: almost no text, and nothing on the page naming
	// this job. The URL is allowed to speak only here — a slugified role in the
	// path is real evidence when there is nothing else, but it must never rescue
	// a page that is full of text about something other than this job, which is
	// exactly what a careers category page looks like.
	if (text.length < 1200) {
		const fromPath = score(pathWords(finalUrl));
		if (fromPath >= 0.5 && companySeen) {
			return {
				verdict: 'live',
				note: `role match ${Math.round(fromPath * 100)}% from the URL; page renders client-side`,
				finalUrl,
			};
		}
		return {
			verdict: 'needs_browser',
			note: `client-rendered shell (${text.length} chars, no title names the role)`,
			finalUrl,
		};
	}

	// Plenty of text, but not about this job. A careers landing page reads
	// exactly like this, which is how the HCLTech campus page got published.
	return {
		verdict: 'role_mismatch',
		note: `role match ${Math.round(roleScore * 100)}%${companySeen ? '' : ', company absent'}`,
		finalUrl,
	};
}

/** Verdicts that mean the link proved itself wrong, rather than merely refusing
 *  to prove itself right. `needs_browser` and `unreachable` are not in here. */
export const REJECTING: ReadonlySet<string> = new Set(['dead', 'role_mismatch']);

/** Fetch a URL and classify what came back. */
export async function checkApplyUrl(
	url: string,
	role: string,
	company: string,
	timeoutMs = 25000
): Promise<ApplyCheckResult> {
	try {
		const res = await fetch(url, {
			redirect: 'follow',
			headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
			signal: AbortSignal.timeout(timeoutMs),
		});
		const html = res.headers.get('content-type')?.includes('text') ? await res.text() : '';
		return classifyApplyPage({ status: res.status, finalUrl: res.url || url, html, role, company });
	} catch (err) {
		return {
			verdict: 'unreachable',
			note: (err as Error).message.slice(0, 120),
			finalUrl: null,
		};
	}
}

/**
 * Check every listing that has a link and has not been checked recently.
 *
 * Re-checking matters as much as the first check: a requisition that was live
 * when drafted goes dead without telling anyone, and this is the only thing
 * that would ever notice.
 */
export async function verifyApplyLinks({
	recheckAfterDays = 7,
	limit = 200,
}: { recheckAfterDays?: number; limit?: number } = {}): Promise<Record<ApplyVerdict, number>> {
	const { sql: client, db } = connect();
	const tally: Record<ApplyVerdict, number> = {
		live: 0,
		role_mismatch: 0,
		dead: 0,
		unreachable: 0,
		needs_browser: 0,
	};

	const retired: string[] = [];

	try {
		const due = await db
			.select()
			.from(jobs)
			.where(
				and(
					isNotNull(jobs.applyUrl),
					or(
						isNull(jobs.applyCheckedAt),
						lt(jobs.applyCheckedAt, sql`now() - make_interval(days => ${recheckAfterDays})`)
					)
				)
			)
			.limit(limit);

		for (const job of due) {
			const result = await checkApplyUrl(job.applyUrl!, job.role, job.company);
			tally[result.verdict]++;

			// A link that proves itself wrong retires the listing, even one already
			// live. A requisition that was fine when drafted goes dead without
			// telling anyone, and this is the only thing that would ever notice —
			// which is the whole reason to re-check rather than check once.
			const retire = REJECTING.has(result.verdict) && job.status !== 'rejected';

			await db
				.update(jobs)
				.set({
					applyCheck: result.verdict,
					applyCheckedAt: sql`now()`,
					applyFinalUrl: result.finalUrl,
					applyNote: result.note,
					...(retire
						? {
								status: 'rejected' as const,
								rejectedReason: `apply link ${result.verdict}: ${result.note}`,
							}
						: {}),
					updatedAt: sql`now()`,
				})
				.where(eq(jobs.id, job.id));

			if (retire) retired.push(`${job.slug} (was ${job.status})`);

			const mark = result.verdict === 'live' ? '✓' : result.verdict === 'needs_browser' ? '?' : '✗';
			console.log(
				`  ${mark} ${result.verdict.padEnd(14)} ${(job.company + ' · ' + job.role).slice(0, 44).padEnd(46)} ${result.note}` +
					(retire ? '  → discarded' : '')
			);
		}

		if (retired.length) {
			console.log(`\n  retired ${retired.length}: ${retired.join(', ')}`);
		}
		return tally;
	} finally {
		await client.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const tally = await verifyApplyLinks();
	const total = Object.values(tally).reduce((a, b) => a + b, 0);
	console.log(
		`\n  ${total} checked · ${tally.live} live · ${tally.needs_browser} need a browser · ` +
			`${tally.role_mismatch} wrong job · ${tally.dead} dead · ${tally.unreachable} unreachable\n`
	);
}
