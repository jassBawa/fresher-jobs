/**
 * Turning what a source said into what the database stores.
 *
 * This ran at render time while the site read markdown, which meant every page
 * load re-derived it and the rules lived in the web app rather than beside the
 * data. It belongs here: these functions decide what goes in the `cities` and
 * `role_family` columns, and a cluster page is only one indexed query because
 * the work already happened at ingest.
 *
 * The raw value is always kept alongside. Normalization is lossy, the rules
 * have already changed twice, and re-deriving needs the original.
 */

export const slugify = (s: string): string =>
	s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * Indian cities are routinely written under both their current and colonial
 * names, and postings mix them freely. Left alone this splits one city across
 * two URLs — an early build produced /jobs-in-bangalore and /jobs-in-bengaluru
 * side by side, each too thin to index, when together they cleared the bar.
 */
const CITY_ALIASES: Readonly<Record<string, string>> = {
	bangalore: 'Bengaluru',
	bengaluru: 'Bengaluru',
	bombay: 'Mumbai',
	calcutta: 'Kolkata',
	madras: 'Chennai',
	gurgaon: 'Gurugram',
	poona: 'Pune',
	trivandrum: 'Thiruvananthapuram',
	cochin: 'Kochi',
	vizag: 'Visakhapatnam',
	mysore: 'Mysuru',
	mangalore: 'Mangaluru',
	baroda: 'Vadodara',
	pondicherry: 'Puducherry',
	secunderabad: 'Hyderabad',
	'new delhi': 'Delhi',
	'delhi ncr': 'Delhi',
	ncr: 'Delhi',
	noida: 'Noida',
	'greater noida': 'Noida',
};

/** States and union territories, which postings list in the same field as
 *  cities. Worth clustering, but they are not localities — the distinction
 *  matters for postal addresses in structured data. */
export const INDIAN_STATES: ReadonlySet<string> = new Set([
	'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
	'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
	'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
	'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
	'uttar pradesh', 'uttarakhand', 'west bengal', 'jammu and kashmir', 'ladakh',
	'puducherry', 'chandigarh', 'andaman and nicobar islands', 'lakshadweep',
	'dadra and nagar haveli and daman and diu',
]);

/**
 * Values that appear in a locations field but name no place at all.
 *
 * "PAN India" is the common one — Indian postings use it to mean nationwide —
 * and untreated it produced a /jobs-in-pan-india/ cluster beside real cities,
 * plus an addressLocality claiming a city of that name exists.
 */
const NON_PLACES: ReadonlySet<string> = new Set([
	'pan india', 'all india', 'across india', 'india', 'anywhere in india',
	'remote', 'work from home', 'wfh', 'anywhere', 'hybrid', 'onsite',
	'multiple locations', 'various locations', 'multiple cities', 'across india locations',
	'not specified', 'na', 'n/a', 'tbd',
]);

const titleCase = (s: string): string => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * Postings write the whole address into a single entry — "Hyderabad,
 * Karnataka", "Navi Mumbai, India". The leading segment is the city; the rest
 * is administrative tail. (That first example is also simply wrong — Hyderabad
 * is in Telangana — which is another reason not to keep it.)
 */
const clean = (raw: string): string =>
	(raw.split(',')[0] ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function normalizeCity(raw: string): string {
	const key = clean(raw);
	return CITY_ALIASES[key] ?? titleCase(key);
}

export const isState = (raw: string): boolean => INDIAN_STATES.has(clean(raw));

/** True when a location names somewhere real enough to build a page about. */
export const isPlace = (raw: string): boolean => {
	const key = clean(raw);
	return key !== '' && !NON_PLACES.has(key);
};

/** Raw locations → the canonical, deduplicated city list a cluster groups by. */
export function toCities(locations: readonly string[]): string[] {
	const out: string[] = [];
	for (const raw of locations) {
		if (!isPlace(raw)) continue;
		const city = normalizeCity(raw);
		if (city && !out.includes(city)) out.push(city);
	}
	return out;
}

/**
 * Role families. A raw job title is too sparse to cluster on — "Graduate
 * Engineer Trainee", "Associate Engineer" and "SDE I" are one intent expressed
 * three ways, and grouping by exact string yields clusters of one.
 *
 * Order matters: first match wins, so the specific patterns sit above the
 * general ones.
 */
const ROLE_FAMILIES: ReadonlyArray<{ slug: string; label: string; test: RegExp }> = [
	{ slug: 'data-analyst', label: 'Data Analyst', test: /\bdata\b.*\banalyst\b|\banalytics\b/i },
	{ slug: 'data-scientist', label: 'Data Scientist', test: /\bdata scien|machine learning|\bml\b|\bai\b/i },
	{ slug: 'data-engineer', label: 'Data Engineer', test: /\bdata engineer/i },
	{ slug: 'qa-engineer', label: 'QA Engineer', test: /\bqa\b|quality assurance|\btest(ing|er)?\b|automation/i },
	{
		slug: 'software-engineer',
		label: 'Software Engineer',
		test: /software|\bsde\b|developer|programmer|full.?stack|back.?end|front.?end|web dev/i,
	},
	{ slug: 'support-engineer', label: 'Support Engineer', test: /support|help ?desk|service desk|technical support/i },
	{ slug: 'business-analyst', label: 'Business Analyst', test: /business analyst|market research|consultant/i },
	{ slug: 'analyst', label: 'Analyst', test: /\banalyst\b/i },
	{ slug: 'graduate-trainee', label: 'Graduate Trainee', test: /trainee|graduate engineer|\bget\b|apprentice/i },
	{ slug: 'engineer', label: 'Engineer', test: /\bengineer\b/i },
	{ slug: 'internship', label: 'Internship', test: /\bintern(ship)?\b/i },
];

export const ROLE_FAMILY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
	ROLE_FAMILIES.map((f) => [f.slug, f.label])
);

export function roleFamily(role: string, jobType?: string | null): { slug: string; label: string } | null {
	if (jobType === 'internship') return { slug: 'internship', label: 'Internship' };
	for (const family of ROLE_FAMILIES) {
		if (family.test.test(role ?? '')) return { slug: family.slug, label: family.label };
	}
	return null;
}

export const roleFamilyLabel = (slug: string | null | undefined): string | null =>
	slug ? (ROLE_FAMILY_LABELS[slug] ?? null) : null;
