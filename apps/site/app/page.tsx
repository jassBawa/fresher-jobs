import { JobList } from '@/components/JobList';
import { AdSlot } from '@/components/AdSlot';
import { liveListings, closedListings, allClusters, type ClusterRow } from '@/lib/db';
import { statusOf, today, shortDay } from '@/lib/listings';

export const revalidate = 900;

const GROUPS: { kind: ClusterRow['kind']; label: string }[] = [
	{ kind: 'role', label: 'By role' },
	{ kind: 'city', label: 'By city' },
	{ kind: 'batch', label: 'By batch' },
	{ kind: 'company', label: 'By company' },
];

export default async function Home() {
	const on = today();
	const [listings, closed, clusters] = await Promise.all([
		liveListings(),
		closedListings(),
		allClusters(),
	]);
	const closingSoon = listings.filter((l) => statusOf(l, on) === 'closing').length;

	return (
		<>
			<section className="field">
				<div className="wrap field__inner">
					<h1 className="display">{listings.length} openings you can still apply for</h1>
					<p className="field__meta">
						<span>Checked {shortDay(on)}</span>
						{closingSoon > 0 && <span>{closingSoon} closing this week</span>}
						<span>Every apply link verified</span>
					</p>
				</div>
			</section>

			<div className="wrap with-rail">
				<div>
					<JobList
						listings={listings}
						empty="No openings published yet. Check back soon."
						adAfter={4}
					/>

					{closed.length > 0 && (
						<section className="closed-tail">
							<h2 className="label closed-tail__head">Recently closed</h2>
							<JobList listings={closed} closed />
						</section>
					)}

					{clusters.length > 0 && (
						<nav className="browse rule-top" aria-label="Browse openings">
							<h2 className="label browse__title">Browse</h2>
							{GROUPS.map(({ kind, label }) => {
								const items = clusters.filter((c) => c.kind === kind);
								if (!items.length) return null;
								return (
									<div className="facet" key={kind}>
										<h3 className="facet__head">{label}</h3>
										<ul className="facet__list">
											{items.map((c) => (
												<li key={c.path}>
													<a href={`/${c.path}/`}>{c.label}</a>{' '}
													<span className="facet__count">{c.count}</span>
												</li>
											))}
										</ul>
									</div>
								);
							})}
						</nav>
					)}

					<AdSlot placement="foot" />
				</div>

				<aside className="rail" aria-label="Advertisement">
					<AdSlot placement="rail" />
				</aside>
			</div>
		</>
	);
}
