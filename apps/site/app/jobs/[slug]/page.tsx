import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusMark } from '@/components/StatusMark';
import { AdSlot } from '@/components/AdSlot';
import { JobPostingSchema } from '@/components/JobPostingSchema';
import { listingBySlug, publishedSlugs } from '@/lib/db';
import {
	isExpired,
	isIndexable,
	listingRobots,
	statusOf,
	closesLabel,
	shortDay,
	payLabel,
	today,
} from '@/lib/listings';
import { slugify, normalizeCity, isPlace, roleFamilyLabel } from '@jobs/db';

export const revalidate = 900;

export async function generateStaticParams() {
	return (await publishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const job = await listingBySlug(slug);
	if (!job) return {};
	return {
		title: job.title ?? `${job.company} — ${job.role}`,
		description: job.description ?? undefined,
		robots: listingRobots(job, today()),
		alternates: { canonical: `/jobs/${job.slug}/` },
	};
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const job = await listingBySlug(slug);
	if (!job) notFound();

	const on = today();
	const expired = isExpired(job, on);
	const canonical = new URL(`/jobs/${job.slug}/`, process.env.SITE ?? 'http://localhost:3000').href;

	// Facts that are also routes back into the site: this page is where most
	// sessions land, and a cluster is the nearest way onward.
	const batchLinks = job.batchYears.filter((y) => /^\d{4}$/.test(y));
	const cityLinks = job.cities;
	const plainPlaces = job.locations.filter((l) => !isPlace(l));
	const familyLabel = roleFamilyLabel(job.roleFamily);

	return (
		<article>
			{!expired && isIndexable(job, on) && (
				<JobPostingSchema job={job} canonical={canonical} />
			)}

			<section className={expired ? 'field field--closed' : 'field'}>
				<div className="wrap field__inner">
					<h1 className="display">
						{job.company} — {job.role}
					</h1>
					<p className="field__meta">
						<StatusMark
							status={statusOf(job, on)}
							label={expired ? 'Applications closed' : undefined}
						/>
						<span>{closesLabel(job, on)}</span>
						{job.postedAt && <span>Posted {shortDay(job.postedAt)}</span>}
					</p>
				</div>
			</section>

			<div className="wrap">
				<dl className="facts facts--head">
					{batchLinks.length > 0 && (
						<>
							<dt>Batch</dt>
							<dd className="links">
								{batchLinks.map((y) => (
									<Link key={y} href={`/${y}-batch-jobs/`}>
										{y}
									</Link>
								))}
							</dd>
						</>
					)}
					{(cityLinks.length > 0 || plainPlaces.length > 0) && (
						<>
							<dt>Where</dt>
							<dd className="links">
								{cityLinks.map((c) => (
									<Link key={c} href={`/jobs-in-${slugify(c)}/`}>
										{normalizeCity(c)}
									</Link>
								))}
								{plainPlaces.map((l) => (
									<span key={l}>{l}</span>
								))}
							</dd>
						</>
					)}
					{job.jobType && (
						<>
							<dt>Type</dt>
							<dd>{job.jobType}</dd>
						</>
					)}
					{job.salary && (
						<>
							<dt>Pay</dt>
							<dd>
								{payLabel(job.salary)} <em>· estimated</em>
							</dd>
						</>
					)}
				</dl>

				<p className="act">
					{job.applyUrl && !expired ? (
						<>
							<a
								className="apply apply--block"
								href={job.applyUrl}
								target="_blank"
								rel="nofollow sponsored noopener noreferrer"
							>
								Apply on {job.company}&apos;s site
								<svg className="apply__out" viewBox="0 0 16 16" aria-hidden="true" fill="none">
									<path d="M6 3h7v7" stroke="currentColor" strokeWidth="2" />
									<path d="M13 3 6.5 9.5" stroke="currentColor" strokeWidth="2" />
									<path d="M11 11.5V13H3V5h1.5" stroke="currentColor" strokeWidth="2" />
								</svg>
							</a>
							<span className="fine act__note">
								Opens {job.company}&apos;s own application form in a new tab
								{job.applyCheck === 'live' ? ' — checked and working.' : '.'}
							</span>
						</>
					) : expired ? (
						<>
							<span className="apply apply--block apply--dead" aria-disabled="true">
								Applications closed
							</span>
							<span className="fine act__note">
								Kept for reference. <Link href="/">See what is open now</Link>.
							</span>
						</>
					) : (
						<>
							<span className="apply apply--block apply--dead" aria-disabled="true">
								No application link published
							</span>
							<span className="fine act__note">
								The source gave no direct form. Search {job.company}&apos;s careers page.
							</span>
						</>
					)}
				</p>

				<div className="prose">
					{job.summary && <p>{job.summary}</p>}

					{(job.batchYears.length > 0 || job.qualifications.length > 0 || job.experienceRequired) && (
						<>
							<h2>Who can apply</h2>
							<p>
								{job.batchYears.length > 0 && (
									<>
										<strong>Batch:</strong> {job.batchYears.join(', ')} graduates
										<br />
									</>
								)}
								{job.qualifications.length > 0 && (
									<>
										<strong>Qualification:</strong> {job.qualifications.join(', ')}
										<br />
									</>
								)}
								{job.experienceRequired && (
									<>
										<strong>Experience:</strong> {job.experienceRequired}
									</>
								)}
							</p>
						</>
					)}

					{job.about && (
						<>
							<h2>About the role</h2>
							<p>{job.about}</p>
						</>
					)}

					{(job.skills.length > 0 || job.requirements.length > 0) && (
						<>
							<h2>What you need</h2>
							<ul>
								{[...job.skills, ...job.requirements].map((x, i) => (
									<li key={`${x}-${i}`}>{x}</li>
								))}
							</ul>
						</>
					)}

					{job.responsibilities.length > 0 && (
						<>
							<h2>What you&apos;ll do</h2>
							<ul>
								{job.responsibilities.map((x, i) => (
									<li key={`${x}-${i}`}>{x}</li>
								))}
							</ul>
						</>
					)}
				</div>

				<nav className="more rule-top" aria-label="More like this">
					<h2 className="label more__head">More like this</h2>
					<p className="more__links">
						{job.roleFamily && familyLabel && (
							<Link href={`/${job.roleFamily}-jobs/`}>{familyLabel} jobs</Link>
						)}
						<Link href={`/${job.companySlug}-jobs/`}>All {job.company} openings</Link>
						{cityLinks.map((c) => (
							<Link key={c} href={`/jobs-in-${slugify(c)}/`}>
								Jobs in {normalizeCity(c)}
							</Link>
						))}
					</p>
				</nav>

				<AdSlot placement="foot" />

				{job.sourceRef && (
					<p className="fine src">
						Facts compiled from a public announcement.{' '}
						<a href={job.sourceRef} target="_blank" rel="nofollow noopener noreferrer">
							Where we found it
						</a>
						.
					</p>
				)}
			</div>
		</article>
	);
}
