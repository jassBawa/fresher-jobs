import Link from 'next/link';
import { allClusters, type ClusterRow } from '@/lib/db';

/**
 * Category strip.
 *
 * Most sessions land deep — on a listing or a cluster, from a search result or
 * a WhatsApp forward — so the way into the rest of the site travels with every
 * page rather than living on a homepage nobody visits.
 *
 * Built from clusters that actually exist, so it can never point at an empty
 * page. Ordered by how this audience filters: batch year first, then role, then
 * city. Scrolls horizontally on narrow screens with an edge fade; above 64rem it
 * wraps and nothing is clipped.
 */
const short = (c: ClusterRow): string => {
	if (c.kind === 'batch' || c.kind === 'city') return c.key;
	return c.label.replace(/ jobs for freshers$/, '').replace(/ jobs$/, '').replace(/ openings$/, '');
};

export async function Nav({ current }: { current?: string }) {
	const clusters = await allClusters();
	if (clusters.length === 0) return null;

	const pick = (kind: ClusterRow['kind'], n: number) =>
		clusters.filter((c) => c.kind === kind).slice(0, n);

	// Category first: it is the top of the taxonomy and the level a reader
	// actually browses by. Batch is the filter they apply before anything else.
	const groups = [
		{ label: 'Category', items: pick('category', 5) },
		{ label: 'Batch', items: pick('batch', 4).sort((a, b) => b.key.localeCompare(a.key)) },
		{ label: 'City', items: pick('city', 4) },
	];

	return (
		<nav className="nav" aria-label="Job categories">
			<div className="wrap nav__scroll">
				<Link className={`nav__item nav__item--home${current ? '' : ' is-current'}`} href="/">
					All openings
				</Link>
				{groups.map(({ label, items }) =>
					items.length ? (
						<span className="nav__group" key={label}>
							<span className="nav__label">{label}</span>
							{items.map((c) => (
								<Link
									key={c.path}
									className={`nav__item${current === c.path ? ' is-current' : ''}`}
									href={`/${c.path}/`}
									aria-current={current === c.path ? 'page' : undefined}
								>
									{short(c)}
								</Link>
							))}
						</span>
					) : null
				)}
			</div>
		</nav>
	);
}
