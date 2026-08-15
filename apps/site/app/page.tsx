import Link from 'next/link';
import { JobList } from '@/components/JobList';
import { JobTable } from '@/components/JobTable';
import { SearchBar } from '@/components/SearchBar';
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
			<section className="field">
				<div className="wrap field__inner">
					<h1 className="display">{listings.length} openings you can still apply for</h1>
					<p className="field__meta">
						<span>Checked {shortDay(on)}</span>
						{closing.length > 0 && <span>{closing.length} closing this week</span>}
						<span>Every apply link verified</span>
					</p>
				</div>
			</section>

			<div className="wrap with-rail">
				<div>
					<SearchBar />

					{/* What changed since the reader last looked — the only reason to
					    come back to a job board on a given day. */}
					{updates.length > 0 && (
						<section className="section section--lead">
							<div className="section__head">
								<h2 className="section__title">Today&apos;s updates</h2>
								<span className="section__more">{shortDay(on)}</span>
							</div>
							<JobTable listings={updates} />
						</section>
					)}

					{/* Everything here is something the reader loses by waiting. */}
					{closing.length > 0 && (
						<section className="section">
							<div className="section__head">
								<h2 className="section__title">Closing this week</h2>
							</div>
							<p className="section__note">Applications shut within seven days.</p>
							<JobTable listings={closing} />
						</section>
					)}

					{categories.length > 0 && (
						<section className="section">
							<div className="section__head">
								<h2 className="section__title">Browse by category</h2>
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

					<section className="section">
						<div className="section__head">
							<h2 className="section__title">Latest jobs</h2>
							<span className="section__more">{listings.length} open</span>
						</div>
						<JobList
							listings={listings}
							empty="No openings published yet. Check back soon."
							adAfter={4}
						/>
					</section>

					{closed.length > 0 && (
						<section className="closed-tail">
							<h2 className="label closed-tail__head">Recently closed</h2>
							<JobList listings={closed} closed />
						</section>
					)}

					{clusters.length > categories.length && (
						<nav className="browse rule-top" aria-label="Browse openings">
							<h2 className="label browse__title">More ways in</h2>
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
