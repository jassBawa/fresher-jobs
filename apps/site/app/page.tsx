import Link from 'next/link';
import { JobFeed } from '@/components/JobFeed';
import { JobList } from '@/components/JobList';
import { JobTable } from '@/components/JobTable';
import { Sidebar } from '@/components/Sidebar';
import { AdSlot } from '@/components/AdSlot';
import {
	liveListings,
	closedListings,
	allClusters,
	todaysUpdates,
	closingSoon,
	type ClusterRow,
} from '@/lib/db';
import { today, shortDay } from '@/lib/listings';

export const revalidate = 900;

export default async function Home() {
	const on = today();
	const [listings, closed, clusters, updates, closing] = await Promise.all([
		liveListings(),
		closedListings(),
		allClusters(),
		todaysUpdates(),
		closingSoon(),
	]);

	const group = (kind: ClusterRow['kind']) => clusters.filter((c) => c.kind === kind);
	const categories = group('category');

	return (
		<>
			<div className="head">
				<div className="wrap">
					<h1 className="head__title">{listings.length} openings you can still apply for</h1>
					<p className="head__meta">
						<span>Checked {shortDay(on)}</span>
						{closing.length > 0 && <span>{closing.length} closing this week</span>}
						<span>Every apply link verified</span>
					</p>
				</div>
			</div>

			<div className="wrap shell">
				<div className="shell__main">
					{/* What changed since the reader last looked — the only reason to
					    come back to a job board on a given day. */}
					{updates.length > 0 && (
						<section className="block">
							<div className="block__head">
								<h2 className="block__title">Today&apos;s updates</h2>
								<span className="block__note">{shortDay(on)}</span>
							</div>
							<JobTable listings={updates} />
						</section>
					)}

					{categories.length > 0 && (
						<section className="block">
							<div className="block__head">
								<h2 className="block__title">Browse by category</h2>
							</div>
							<ul className="cats">
								{categories.map((c) => (
									<li key={c.path}>
										<Link href={`/${c.path}/`}>
											{c.label.replace(/ jobs$/, '')} <span>{c.count}</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					)}

					<section className="block">
						<div className="block__head">
							<h2 className="block__title">Latest jobs</h2>
							<span className="block__note">{listings.length} open</span>
						</div>
						<JobFeed
							listings={listings}
							empty="No openings published yet. Check back soon."
							adAfter={4}
						/>
					</section>

					{closed.length > 0 && (
						<section className="block block--quiet">
							<div className="block__head">
								<h2 className="block__title">Recently closed</h2>
							</div>
							<JobList listings={closed} closed />
						</section>
					)}

					{clusters.length > categories.length && (
						<nav className="block" aria-label="Browse openings">
							<div className="block__head">
								<h2 className="block__title">More ways in</h2>
							</div>
							<div className="facets">
								{(
									[
										{ kind: 'type', label: 'By type' },
										{ kind: 'city', label: 'By city' },
										{ kind: 'batch', label: 'By batch' },
										{ kind: 'role', label: 'By role' },
										{ kind: 'company', label: 'By company' },
									] as const
								).map(({ kind, label }) => {
									const items = group(kind);
									if (!items.length) return null;
									return (
										<div className="facet" key={kind}>
											<h3 className="facet__head">{label}</h3>
											<ul className="facet__list">
												{items.map((c) => (
													<li key={c.path}>
														<Link href={`/${c.path}/`}>{c.label}</Link>{' '}
														<span className="facet__count">{c.count}</span>
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						</nav>
					)}

					<AdSlot placement="foot" />
				</div>

				<Sidebar closing={closing} recent={listings} />
			</div>
		</>
	);
}
