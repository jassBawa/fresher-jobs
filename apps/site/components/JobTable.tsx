import Link from 'next/link';
import type { Job } from '@jobs/db';
import { CompanyMark } from './CompanyMark';
import { closesLabel, today } from '@/lib/listings';

/**
 * The scan table.
 *
 * Every Indian job board in this vertical ships one, and for good reason: a
 * reader who already knows what they are looking for wants company, role and a
 * way in — on one line, with nothing between them. The receipt rows elsewhere
 * are for deciding; this is for finding.
 *
 * Two links per row, deliberately: the listing (where the eligibility facts
 * are) and the employer's form (where the reader is trying to get to). Making
 * them choose between reading more and applying is the whole job.
 */
export function JobTable({ listings, caption }: { listings: Job[]; caption?: string }) {
	const on = today();
	if (!listings.length) return null;

	return (
		<div className="tablewrap">
			<table className="jobtable">
				{caption && <caption className="jobtable__caption">{caption}</caption>}
				<thead>
					<tr>
						<th scope="col">Company</th>
						<th scope="col">Role</th>
						<th scope="col">Closes</th>
						<th scope="col">Apply</th>
					</tr>
				</thead>
				<tbody>
					{listings.map((j) => (
						<tr key={j.slug}>
							<td className="jobtable__co">
								<CompanyMark job={j} size={28} />
								<Link href={`/${j.companySlug}-jobs/`}>{j.company}</Link>
							</td>
							<td>
								<Link href={`/jobs/${j.slug}/`}>{j.role}</Link>
							</td>
							<td className="jobtable__closes">{closesLabel(j, on)}</td>
							<td>
								{j.applyUrl ? (
									<a
										className="jobtable__apply"
										href={j.applyUrl}
										target="_blank"
										rel="nofollow sponsored noopener noreferrer"
									>
										Apply
									</a>
								) : (
									<span className="jobtable__apply jobtable__apply--none">—</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
