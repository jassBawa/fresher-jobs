import Link from 'next/link';
import type { Job } from '@jobs/db';
import { StatusMark } from './StatusMark';
import { AdSlot } from './AdSlot';
import { statusOf, closesLabel, shortDay, payLabel, today } from '@/lib/listings';

/**
 * Listings as receipt lines.
 *
 * Every row answers the eligibility question in the order it is asked: is it
 * still open, who is hiring, for what, and am I allowed to apply. The key-value
 * rail is set at the one type size the listing surfaces share — labels differ
 * from values by case, weight and colour, never by scale.
 */
const cap = (arr: string[], n: number): string =>
	arr.length > n ? `${arr.slice(0, n).join(', ')} +${arr.length - n}` : arr.join(', ');

export function JobList({
	listings,
	empty = 'Nothing open here right now.',
	adAfter = 0,
	closed = false,
}: {
	listings: Job[];
	empty?: string;
	adAfter?: number;
	closed?: boolean;
}) {
	const on = today();
	if (listings.length === 0) return <p className="empty">{empty}</p>;

	return (
		<ul className="rows">
			{listings.map((fm, i) => (
				<li key={fm.slug} className={closed ? 'row row--closed' : 'row'}>
					<div className="row__rail">
						<StatusMark status={statusOf(fm, on)} />
						<span className="row__posted">
							{shortDay(fm.postedAt ?? fm.createdAt.toISOString().slice(0, 10))}
						</span>
					</div>

					<Link className="row__role" href={`/jobs/${fm.slug}/`}>
						<span className="row__company">{fm.company}</span> — {fm.role}
					</Link>

					<dl className="facts">
						{fm.batchYears.length > 0 && (
							<>
								<dt>Batch</dt>
								<dd>{fm.batchYears.join(', ')}</dd>
							</>
						)}
						{fm.locations.length > 0 && (
							<>
								<dt>Where</dt>
								<dd>{cap(fm.locations, 3)}</dd>
							</>
						)}
						{fm.salary && (
							<>
								<dt>Pay</dt>
								<dd>
									{payLabel(fm.salary)} <em>· estimated</em>
								</dd>
							</>
						)}
						<dt>Closes</dt>
						<dd>{closesLabel(fm, on)}</dd>
					</dl>

					{adAfter > 0 && i === adAfter - 1 && listings.length > adAfter + 1 && (
						<AdSlot placement="feed" />
					)}
				</li>
			))}
		</ul>
	);
}
