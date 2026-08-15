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

/**
 * Raw locations → the canonical city list a cluster groups by.
 *
 * States are excluded. A posting writes "Maharashtra" in the same field as
 * "Pune", and treating the two alike produced a /jobs-in-maharashtra/ page
 * sitting beside real cities — a reader looking for work in Pune is not served
 * by a page covering a state of 120 million people, and it is a weaker search
 * target than either the city or the country.
 */
export function toCities(locations: readonly string[]): string[] {
	const out: string[] = [];
	for (const raw of locations) {
		if (!isPlace(raw) || isState(raw)) continue;
		const city = normalizeCity(raw);
		if (city && !out.includes(city)) out.push(city);
	}
	return out;
}

/** The states a posting named, kept separate from its cities. */
export function toRegions(locations: readonly string[]): string[] {
	const out: string[] = [];
	for (const raw of locations) {
		if (!isState(raw)) continue;
		const region = normalizeCity(raw);
		if (region && !out.includes(region)) out.push(region);
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
	// Most specific first — the first match wins. "Data Scientist & Data Analyst"
	// used to land in data-analyst because that pattern was tested first.
	{ slug: 'data-engineer', label: 'Data Engineer', test: /\bdata engineer/i },
	{ slug: 'data-scientist', label: 'Data Scientist', test: /data scien|machine learning|\bml\b|\bai\b/i },
	{ slug: 'data-analyst', label: 'Data Analyst', test: /\bdata\b.*\banalyst\b|\banalytics\b/i },
	{ slug: 'qa-engineer', label: 'QA Engineer', test: /\bqa\b|quality assurance|\btest(ing|er)?\b|automation/i },
	{
		slug: 'software-engineer',
		label: 'Software Engineer',
		test: /software|\bsde\b|developer|programmer|full.?stack|back.?end|front.?end|web dev/i,
	},
	{ slug: 'support-engineer', label: 'Support Engineer', test: /support|help ?desk|service desk|technical support/i },
	{ slug: 'business-analyst', label: 'Business Analyst', test: /business analyst|market research|consultant/i },
	{ slug: 'analyst', label: 'Analyst', test: /\banalyst\b/i },
	{ slug: 'engineer', label: 'Engineer', test: /\bengineer\b/i },
];

export const ROLE_FAMILY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
	ROLE_FAMILIES.map((f) => [f.slug, f.label])
);

/**
 * The broad category a posting belongs to — the top level of the taxonomy.
 *
 * Role families are too fine to browse by: "data-scientist" holds one listing
 * and "qa-engineer" none, so a menu built on them is mostly empty and tells a
 * reader nothing about what the site covers. Categories are the level a fresher
 * actually thinks in, and they stay populated as volume grows.
 *
 * Core Engineering earns its place here even though a tech-only board would not
 * have it: mechanical, electrical and civil graduates are a large share of this
 * audience, and Volvo, Eaton and Carrier postings are exactly that.
 *
 * Order matters — first match wins, so a "Marketing Analyst" reads as Marketing
 * rather than Business, and a "Data Engineer" as Data rather than IT.
 */
interface Category {
	slug: string;
	label: string;
	/** Words that only ever mean this category. */
	test: RegExp;
	/** Words that appear across every function in Indian fresher postings —
	 *  "Associate", "Engineer", "Trainee". Real signal, but only once nothing
	 *  specific has matched anywhere. */
	weak?: RegExp;
}

const CATEGORIES: ReadonlyArray<Category> = [
	{
		slug: 'design',
		label: 'Design & Creative',
		// "visual" alone is a trap: Data Visualization is a data skill, and a
		// bare match filed an SQL apprenticeship under Design.
		test: /\b(ux|ui\/ux|graphic design|visual design|motion design|animator|illustrat|figma|photoshop|adobe|video edit|copywrit|content writ)\w*/i,
		weak: /\b(designer|creative)\b/i,
	},
	{
		slug: 'marketing',
		label: 'Marketing & Sales',
		test: /\b(marketing|seo\b|sem\b|social media|branding|campaign|growth|business development|telecall|inside sales|pre.?sales)\w*/i,
		weak: /\b(sales)\b/i,
	},
	{
		slug: 'data-analytics',
		label: 'Data & Analytics',
		test: /\b(data scien|data analy|data engineer|analytics|machine learning|\bml\b|deep learning|statistic|power ?bi|tableau|big data)\w*/i,
		weak: /\b(data)\b/i,
	},
	{
		slug: 'it-software',
		label: 'IT & Software',
		// Skill tokens as well as title words: "Graduate Engineer Trainee" says
		// nothing on its own, but Java and SQL beside it place the job here.
		test: /\b(software|developer|programmer|\bsde\b|full.?stack|back.?end|front.?end|web dev|cloud|devops|cyber|information security|\bqa\b|tester|testing|automation|system admin|\bit\b|java|python|javascript|typescript|react|angular|node|spring|\.net|\bc\+\+\b|\bsql\b|\bapi\b|linux|kubernetes|docker|\baws\b|azure)\w*/i,
		weak: /\b(technical support|application|network|system)\b/i,
	},
	{
		slug: 'finance',
		label: 'Finance & Accounts',
		test: /\b(finance|financial|accounting|accountant|audit|taxation|\btax\b|treasury|payroll|invoic)\w*/i,
		weak: /\b(banking|account)\b/i,
	},
	{
		slug: 'hr',
		label: 'HR & Recruitment',
		test: /\b(human resource|\bhr\b|recruit|talent acquisition|staffing|people ops)\w*/i,
	},
	{
		slug: 'business',
		label: 'Business & Consulting',
		test: /\b(business analyst|consult|strategy|market research|insights?|process improvement|supply chain|procurement)\w*/i,
		weak: /\b(associate|analyst|management|operations|coordinator|executive|officer)\b/i,
	},
	{
		slug: 'core-engineering',
		label: 'Core Engineering',
		// Mechanical, electrical and civil graduates are a large share of this
		// audience — Volvo, Eaton and Carrier postings are exactly that.
		test: /\b(mechanical|electrical|electronics|civil|chemical|manufactur|production engineer|maintenance|\bhvac\b|instrumentation|autocad|solidworks|catia)\w*/i,
		weak: /\b(engineer|technician|apprentice|trainee|quality|production)\b/i,
	},
];

export const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
	CATEGORIES.map((c) => [c.slug, c.label])
);

export const ALL_CATEGORIES: ReadonlyArray<{ slug: string; label: string }> = CATEGORIES.map(
	({ slug, label }) => ({ slug, label })
);

/**
 * Which category a posting belongs to.
 *
 * Specific evidence is exhausted everywhere before generic evidence is used
 * anywhere. Without that ordering "Associate — Market Research and Insights"
 * lost to a "Database Expertise" skill and filed as Data, and an SQL
 * apprenticeship filed as Design because "Data Visualization" contains
 * "visual".
 */
export function jobCategory(
	role: string,
	skills: readonly string[] = []
): { slug: string; label: string } | null {
	const title = role ?? '';
	const text = skills.join(' ');
	const found = (c: Category | undefined) => (c ? { slug: c.slug, label: c.label } : null);

	return (
		found(CATEGORIES.find((c) => c.test.test(title))) ??
		found(CATEGORIES.find((c) => text && c.test.test(text))) ??
		found(CATEGORIES.find((c) => c.weak?.test(title))) ??
		found(CATEGORIES.find((c) => text && c.weak?.test(text)))
	);
}

export const categoryLabel = (slug: string | null | undefined): string | null =>
	slug ? (CATEGORY_LABELS[slug] ?? null) : null;

/**
 * What the work is — never how it is arranged.
 *
 * These used to be one axis, and it went wrong in both directions: an
 * internship jobType hijacked the family, so EY's "Analyst" was filed under
 * Internship, while "Intern Bachelors Software Engineer" was filed under
 * Software Engineer because its jobType happened to be null. A reader browsing
 * "analyst jobs" wants analyst work whether it is an internship or not, and a
 * reader browsing internships wants them across every function.
 *
 * Employment type is its own axis now. See `inferJobType`.
 */
export function roleFamily(role: string, _jobType?: string | null): { slug: string; label: string } | null {
	for (const family of ROLE_FAMILIES) {
		if (family.test.test(role ?? '')) return { slug: family.slug, label: family.label };
	}
	return null;
}

export const JOB_TYPE_LABELS: Readonly<Record<string, string>> = {
	internship: 'Internship',
	trainee: 'Trainee & apprentice',
	'full-time': 'Full-time',
	contract: 'Contract',
};

/**
 * Employment type, filled in from the title when the extractor left it null.
 *
 * "Summer Software Engineer Intern" is an internship whether or not the model
 * said so, and for this audience the internship/trainee/full-time split is one
 * of the two questions they actually filter on.
 */
export function inferJobType(role: string, jobType?: string | null): string | null {
	if (jobType) return jobType;
	const r = role ?? '';
	if (/\bintern(ship)?\b/i.test(r)) return 'internship';
	if (/trainee|apprentice|\bget\b|graduate engineer/i.test(r)) return 'trainee';
	return null;
}

/**
 * Batch years worth a page.
 *
 * The extractor scrapes any four-digit year out of the posting body, which
 * yields 2022 and 2028 alongside the real ones — a 2028 batch is two years from
 * graduating and is not looking at this. Anything outside a plausible window
 * around the current year is noise, and a cluster built on noise is a thin page
 * Google is invited to judge.
 */
export function plausibleBatchYears(years: readonly string[], now = new Date()): string[] {
	const y = now.getFullYear();
	return years.filter((v) => /^\d{4}$/.test(v) && Number(v) >= y - 4 && Number(v) <= y + 1);
}

export const roleFamilyLabel = (slug: string | null | undefined): string | null =>
	slug ? (ROLE_FAMILY_LABELS[slug] ?? null) : null;
