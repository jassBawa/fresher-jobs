import Link from 'next/link';
import { allClusters, type ClusterRow } from '@/lib/db';

/**
 * The masthead bar: brand, category menus, search.
 *
 * Most sessions land deep — on a listing or a cluster, from a search result or
 * a WhatsApp forward — so the way into the rest of the site travels with every
 * page rather than living on a homepage nobody visits. The strip that did this
 * before could only show four items per axis before it ran out of room; menus
 * hold the whole taxonomy in the same space.
 *
 * The menus are `<details>` elements. No client JavaScript, so they open on a
 * dead-slow connection before hydration would have finished, work with a
 * keyboard for free, and behave on touch — where a hover menu is a trap. The
 * cost is that they stay open until dismissed, which is the cheaper failure.
 *
 * Every entry is built from a cluster that exists, so a menu can never point at
 * an empty page.
 */
const short = (c: ClusterRow): string => {
	if (c.kind === 'batch' || c.kind === 'city') return c.key;
	return c.label
		.replace(/ jobs for freshers$/, '')
		.replace(/ jobs$/, '')
		.replace(/ openings$/, '');
};

function Menu({ label, items }: { label: string; items: ClusterRow[] }) {
	if (!items.length) return null;
	return (
		<details className="menu">
			<summary className="menu__top">
				{label}
				<svg className="menu__chev" viewBox="0 0 10 6" aria-hidden="true">
					<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
				</svg>
			</summary>
			<ul className="menu__panel">
				{items.map((c) => (
					<li key={c.path}>
						<Link href={`/${c.path}/`}>
							{short(c)}
							<span className="menu__n">{c.count}</span>
						</Link>
					</li>
				))}
			</ul>
		</details>
	);
}

export async function Nav() {
	const clusters = await allClusters();

	const pick = (kind: ClusterRow['kind'], n: number) =>
		clusters.filter((c) => c.kind === kind).slice(0, n);

	const batches = pick('batch', 6).sort((a, b) => b.key.localeCompare(a.key));

	return (
		<nav className="bar" aria-label="Main">
			<div className="wrap bar__inner">
				<Link className="brand" href="/">
					Pehla<span className="brand__b">Job</span>
				</Link>

				<div className="bar__menus">
					<Link className="bar__link" href="/">
						All jobs
					</Link>
					<Menu label="Category" items={pick('category', 10)} />
					<Menu label="Batch" items={batches} />
					<Menu label="Location" items={pick('city', 8)} />
					<Menu label="Company" items={pick('company', 10)} />
				</div>

				{/* The same GET form as the search page, so the header field and the
				    page field are one behaviour with one implementation. */}
				<form className="bar__search" action="/search" role="search">
					<label className="vh" htmlFor="nav-q">
						Search openings
					</label>
					<input
						id="nav-q"
						type="search"
						name="q"
						placeholder="Search jobs"
						autoComplete="off"
						enterKeyHint="search"
					/>
					<button type="submit" aria-label="Search">
						<svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
							<circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="2" />
							<path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
						</svg>
					</button>
				</form>
			</div>
		</nav>
	);
}
