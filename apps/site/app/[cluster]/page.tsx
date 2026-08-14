import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JobFeed } from '@/components/JobFeed';
import { JobList } from '@/components/JobList';
import { Sidebar } from '@/components/Sidebar';
import { AdSlot } from '@/components/AdSlot';
import {
	allClusters,
	clusterListings,
	clusterClosed,
	MIN_INDEXABLE_CLUSTER_SIZE,
} from '@/lib/db';
import { statusOf, today, shortDay } from '@/lib/listings';

/**
 * Every cluster page, from one route — the indexable surface (D5).
 *
 * Individual listings are mostly noindex; what competes in search is the
 * aggregate. Under three listings a cluster still gets a page for navigation
 * but stays out of the index: a two-item page is not a better answer than the
 * listings themselves.
 */
export const revalidate = 900;
export const dynamicParams = false;

export async function generateStaticParams() {
	return (await allClusters()).map((c) => ({ cluster: c.path }));
}

const find = async (path: string) => (await allClusters()).find((c) => c.path === path) ?? null;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ cluster: string }>;
}): Promise<Metadata> {
	const { cluster: path } = await params;
	const cluster = await find(path);
	if (!cluster) return {};
	const indexable = cluster.count >= MIN_INDEXABLE_CLUSTER_SIZE;
	return {
		title: `${cluster.label} — PehlaJob`,
		description: `Current ${cluster.label.toLowerCase()} for freshers and early-career candidates in India.`,
		robots: indexable ? 'index, follow' : 'noindex, follow',
		alternates: { canonical: `/${cluster.path}/` },
	};
}

export default async function ClusterPage({ params }: { params: Promise<{ cluster: string }> }) {
	const { cluster: path } = await params;
	const cluster = await find(path);
	if (!cluster) notFound();

	const on = today();
	const [listings, closed] = await Promise.all([
		clusterListings(cluster),
		clusterClosed(cluster),
	]);
	const closing = listings.filter((l) => statusOf(l, on) === 'closing');
	const thin = cluster.count < MIN_INDEXABLE_CLUSTER_SIZE;

	return (
		<>
			<div className="head">
				<div className="wrap">
					<h1 className="head__title">{cluster.label}</h1>
					<p className="head__meta">
						<span>{listings.length} open now</span>
						{closing.length > 0 && <span>{closing.length} closing this week</span>}
						<span>Checked {shortDay(on)}</span>
					</p>
				</div>
			</div>

			<div className="wrap shell">
				<div className="shell__main">
					<section className="block">
						<div className="block__head">
							<h2 className="block__title">Open now</h2>
							<span className="block__note">{listings.length}</span>
						</div>
						<JobFeed listings={listings} adAfter={4} />
					</section>

					{closed.length > 0 && (
						<section className="block block--quiet">
							<div className="block__head">
								<h2 className="block__title">Recently closed</h2>
							</div>
							<JobList listings={closed} closed />
						</section>
					)}

					<p className="back">
						<Link href="/">← All openings</Link>
						{thin && <span className="fine"> · too few here to list in search yet</span>}
					</p>

					<AdSlot placement="foot" />
				</div>

				<Sidebar closing={closing} recent={listings} />
			</div>
		</>
	);
}
