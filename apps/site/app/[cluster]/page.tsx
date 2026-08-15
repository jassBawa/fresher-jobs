import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JobList } from '@/components/JobList';
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
	const closingSoon = listings.filter((l) => statusOf(l, on) === 'closing').length;
	const thin = cluster.count < MIN_INDEXABLE_CLUSTER_SIZE;

	return (
		<>
			<section className="field">
				<div className="wrap field__inner">
					<h1 className="display">{cluster.label}</h1>
					<p className="field__meta">
						<span>{listings.length} open now</span>
						{closingSoon > 0 && <span>{closingSoon} closing this week</span>}
						<span>Checked {shortDay(on)}</span>
					</p>
				</div>
			</section>

			<div className="wrap with-rail">
				<div>
					<JobList listings={listings} adAfter={4} />

					{closed.length > 0 && (
						<section className="closed-tail">
							<h2 className="label closed-tail__head">Recently closed</h2>
							<JobList listings={closed} closed />
						</section>
					)}

					<p className="back rule-top">
						<Link href="/">← All openings</Link>
						{thin && <span className="fine"> · too few here to list in search yet</span>}
					</p>

					<AdSlot placement="foot" />
				</div>

				<aside className="rail" aria-label="Advertisement">
					<AdSlot placement="rail" />
				</aside>
			</div>
		</>
	);
}
