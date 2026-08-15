import type { Job } from '@jobs/db';
import { normalizeCity, isState, isPlace } from '@jobs/db';
import { expiresOn } from '@/lib/listings';

/**
 * schema.org JobPosting markup.
 *
 * Two fields are deliberately absent.
 *
 * `baseSalary`, because the source gives figures like "₹4 to 6 LPA (Expected)"
 * — an aggregator's estimate, not the employer's number. Publishing a guess as
 * structured salary data is the sort of mismatch Google penalizes, and a promise
 * to the reader we cannot keep. The figure still shows on the page, labelled.
 *
 * `directApply`, because it states whether the application can be completed at
 * the URL in the markup, and ours hands off to the employer's ATS. Declaring it
 * either way is a guess about someone else's flow.
 *
 * Emitted only for indexable, unexpired listings: a noindex page cannot produce
 * a rich result, and Google asks that filled postings lose their markup.
 */
const EMPLOYMENT_TYPE: Record<string, string> = {
	'full-time': 'FULL_TIME',
	internship: 'INTERN',
	contract: 'CONTRACTOR',
	trainee: 'FULL_TIME',
};

const asPlainText = (md: string): string =>
	md
		.replace(/^\|.*\|$/gm, '')
		.replace(/^#{1,6}\s*/gm, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_`>]/g, '')
		.replace(/\n{2,}/g, '\n')
		.trim();

export function JobPostingSchema({ job, canonical }: { job: Job; canonical: string }) {
	const body = [job.summary, job.about, job.responsibilities.join('. ')].filter(Boolean).join('\n\n');
	const description = [job.description, asPlainText(body)].filter(Boolean).join('\n\n').slice(0, 5000);

	// Postings list states in the same field as cities, and "PAN India" names no
	// place at all. A state goes to addressRegion; a non-place degrades to
	// country level rather than claiming a locality that does not exist.
	const jobLocation = job.locations.map((raw) => ({
		'@type': 'Place',
		address: {
			'@type': 'PostalAddress',
			...(!isPlace(raw)
				? {}
				: isState(raw)
					? { addressRegion: normalizeCity(raw) }
					: { addressLocality: normalizeCity(raw) }),
			addressCountry: 'IN',
		},
	}));

	// Google requires title, description, datePosted, hiringOrganization and
	// jobLocation. A partial JobPosting is worse than none.
	if (!job.title || !description || !job.postedAt || !job.company || jobLocation.length === 0) {
		return null;
	}

	const validThrough = expiresOn(job);
	const schema = {
		'@context': 'https://schema.org/',
		'@type': 'JobPosting',
		title: job.role || job.title,
		description,
		datePosted: job.postedAt,
		...(validThrough ? { validThrough } : {}),
		...(job.jobType && EMPLOYMENT_TYPE[job.jobType]
			? { employmentType: EMPLOYMENT_TYPE[job.jobType] }
			: {}),
		identifier: { '@type': 'PropertyValue', name: job.company, value: job.slug },
		hiringOrganization: { '@type': 'Organization', name: job.company },
		jobLocation,
		...(job.skills.length ? { skills: job.skills.join(', ') } : {}),
		url: canonical,
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}
