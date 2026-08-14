import type { Job } from '@jobs/db';
import { JobCard } from './JobCard';
import { AdSlot } from './AdSlot';

/**
 * The feed. Cards in order, with one in-feed ad after the fourth.
 *
 * The ad is placed after enough cards that it can never be the largest element
 * painted first, and it is skipped entirely when the feed is short enough that
 * it would land near the end — an ad as the last thing on a five-item page
 * reads as the page being over.
 */
export function JobFeed({
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
	if (listings.length === 0) return <p className="empty">{empty}</p>;

	return (
		<div className="feed">
			{listings.map((job, i) => (
				<div key={job.slug} className="feed__item">
					<JobCard job={job} closed={closed} />
					{adAfter > 0 && i === adAfter - 1 && listings.length > adAfter + 1 && (
						<AdSlot placement="feed" />
					)}
				</div>
			))}
		</div>
	);
}
