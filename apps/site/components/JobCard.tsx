import Link from 'next/link';
import type { Job } from '@jobs/db';
import { StatusMark } from './StatusMark';
import { statusOf, closesLabel, shortDay, payLabel, today } from '@/lib/listings';

/**
 * A posting in the feed.
 *
 * The thumbnail is the listing's own generated card (see opengraph-image.tsx),
 * so it is never a placeholder and never a stranger's logo scraped off an ATS
 * host. It is decorative here — every word inside it is repeated as real text
 * beside it — so it carries an empty alt and the heading link does the work for
 * a screen reader.
 *
 * Below the fold of the title: the two questions this audience asks before
 * clicking anything, which batch and where, then when it shuts. Salary is
 * marked estimated wherever it appears because it usually is.
 */
const cap = (arr: string[], n: number): string =>
	arr.length > n ? `${arr.slice(0, n).join(', ')} +${arr.length - n}` : arr.join(', ');

export function JobCard({ job, closed = false }: { job: Job; closed?: boolean }) {
	const on = today();
	const status = statusOf(job, on);
	const posted = job.postedAt ?? job.createdAt.toISOString().slice(0, 10);
	const where = cap(job.cities.length ? job.cities : job.locations, 2);

	return (
		<article className={closed ? 'card card--closed' : 'card'}>
			<Link className="card__thumb" href={`/jobs/${job.slug}/`} tabIndex={-1} aria-hidden="true">
				<img
					src={`/jobs/${job.slug}/thumb/`}
					alt=""
					width={800}
					height={600}
					loading="lazy"
					decoding="async"
				/>
			</Link>

			<div className="card__body">
				<h3 className="card__title">
					<Link href={`/jobs/${job.slug}/`}>
						{job.company} is hiring — {job.role}
					</Link>
				</h3>

				<p className="card__meta">
					<StatusMark status={status} />
					<span className="card__dot" aria-hidden="true" />
					<span>Posted {shortDay(posted)}</span>
					<span className="card__dot" aria-hidden="true" />
					<span>{closesLabel(job, on)}</span>
				</p>

				<ul className="chips">
					{job.batchYears.length > 0 && (
						<li>
							<b>Batch</b> {job.batchYears.join(', ')}
						</li>
					)}
					{where && (
						<li>
							<b>Location</b> {where}
						</li>
					)}
					{job.salary && (
						<li>
							<b>Salary</b> {payLabel(job.salary)} <em>est.</em>
						</li>
					)}
				</ul>

				{job.summary && <p className="card__excerpt">{job.summary}</p>}

				<p className="card__go">
					<Link href={`/jobs/${job.slug}/`}>
						Full details and eligibility
						<svg viewBox="0 0 12 10" aria-hidden="true" fill="none">
							<path
								d="M1 5h9M6.5 1 10.5 5l-4 4"
								stroke="currentColor"
								strokeWidth="1.7"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</Link>
				</p>
			</div>
		</article>
	);
}
