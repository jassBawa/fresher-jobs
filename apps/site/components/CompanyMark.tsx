import type { Job } from '@jobs/db';

/**
 * The company's thumbnail.
 *
 * A logo when we have one, a monogram otherwise — and the monogram is the
 * default rather than the sad case. Logos could only be resolved for 4 of 13
 * companies from the apply link, because the ATS host is usually the vendor
 * rather than the employer (Honeywell's is ibqbjb.fa.ocs.oraclecloud.com), and
 * third-party favicon services answer inconsistently for the rest.
 *
 * So the layout is built to look right with no image at all: same size, same
 * shape, same weight in the row whichever it renders. Nothing shifts when a
 * logo appears later, and nothing looks broken while none does.
 *
 * The tint is derived from the company name, so a company keeps the same colour
 * everywhere on the site without anyone maintaining a mapping.
 */
const TINTS = [
	'var(--live-field)',
	'#1f4e79',
	'#7a3e9d',
	'#8a4700',
	'#0f6f77',
	'#8c2f39',
] as const;

/**
 * One or two letters, from words that are actually letters.
 *
 * "EY (Ernst & Young)" was rendering as "E(" — the second word starts with a
 * bracket. Punctuation and the legal-form noise every Indian company name
 * carries are stripped before anything is taken.
 */
const initials = (name: string): string => {
	const words = name
		.replace(/\((.*?)\)/g, ' ')
		.replace(/\b(pvt|ltd|limited|private|inc|corp|corporation|technologies|india|global|group)\b/gi, ' ')
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.split(/\s+/)
		.filter(Boolean);

	// Two words give one letter each; a single word gives its first two, so
	// "EY" stays EY rather than collapsing to a lone E.
	const letters =
		words.length >= 2
			? `${words[0]![0]}${words[1]![0]}`
			: (words[0] ?? name.replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 2);
	return letters.toUpperCase();
};

const tintFor = (name: string): string => {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
	return TINTS[h % TINTS.length]!;
};

export function CompanyMark({ job, size = 40 }: { job: Pick<Job, 'company' | 'logoUrl'>; size?: number }) {
	if (job.logoUrl) {
		return (
			<img
				className="mono mono--img"
				src={job.logoUrl}
				alt=""
				width={size}
				height={size}
				loading="lazy"
				decoding="async"
			/>
		);
	}
	return (
		<span
			className="mono"
			style={{ background: tintFor(job.company), width: size, height: size }}
			aria-hidden="true"
		>
			{initials(job.company)}
		</span>
	);
}
