import test from 'node:test';
import assert from 'node:assert/strict';
import {
	classifyApplyPage,
	significantWords,
	visibleText,
	titleOf,
	metaContent,
	jsonLdTitles,
} from '../dist/verify-apply.js';

const page = (over = {}) => ({
	status: 200,
	finalUrl: 'https://careers.example.com/job/12345',
	html: '<html><head><title>Job</title></head><body></body></html>',
	role: 'Graduate Engineer Trainee',
	company: 'Wipro Limited',
	...over,
});

const filler = (n: number) => 'lorem ipsum dolor sit amet consectetur '.repeat(n);

test('an error status is dead', () => {
	assert.equal(classifyApplyPage(page({ status: 404 })).verdict, 'dead');
	assert.equal(classifyApplyPage(page({ status: 500 })).verdict, 'dead');
});

test('a redirect to the site root is dead', () => {
	// The failure the link scorer exists to prevent: the requisition is gone and
	// the ATS drops the visitor on the careers homepage.
	assert.equal(
		classifyApplyPage(page({ finalUrl: 'https://careers.example.com/' })).verdict,
		'dead'
	);
	assert.equal(classifyApplyPage(page({ finalUrl: 'https://careers.example.com' })).verdict, 'dead');
});

test('a title saying the posting is gone is dead', () => {
	for (const t of ['Job no longer available', 'Position has been filled', '404 Page Not Found']) {
		const html = `<title>${t}</title><body>${filler(50)}</body>`;
		assert.equal(classifyApplyPage(page({ html })).verdict, 'dead', t);
	}
});

test('that phrasing in body text alone is NOT dead', () => {
	// The regression this guard exists for: an earlier body-wide version of the
	// check reported two live requisitions — Amazon's and Wipro's — as gone,
	// because the phrase appears in cookie banners and related-jobs rails.
	const html = `<title>Graduate Engineer Trainee Job Details | Wipro Limited</title>
		<body>Graduate Engineer Trainee. ${filler(40)}
		Some other position has been filled. Apply now.</body>`;
	const r = classifyApplyPage(page({ html }));
	assert.equal(r.verdict, 'live');
});

test('a client-rendered shell asks for a browser rather than guessing', () => {
	// Most Indian ATS platforms render the posting client-side. Calling this a
	// mismatch would fail most of the real links on the site.
	const html = '<title>Honeywell</title><body><div id="root"></div></body>';
	const r = classifyApplyPage(page({ html, role: 'Data Scientist' }));
	assert.equal(r.verdict, 'needs_browser');
	assert.match(r.note, /client-rendered/);
});

test('a real page naming the role is live', () => {
	const html = `<title>Graduate Engineer Trainee Job Details | Wipro Limited</title>
		<body>Graduate Engineer Trainee at Wipro. ${filler(60)}</body>`;
	assert.equal(classifyApplyPage(page({ html })).verdict, 'live');
});

test('a page full of text that never names the role is the wrong job', () => {
	// Wipro serves this exact shape when a requisition id no longer resolves:
	// a generic "Job Details" title and boilerplate, on the same platform where
	// a live posting puts the role in the title.
	const html = `<title>Job Details | Wipro Limited</title><body>${filler(200)}</body>`;
	const r = classifyApplyPage(page({ html }));
	assert.equal(r.verdict, 'role_mismatch');
});

test('a partial role match still counts as live', () => {
	// "Full Stack Developer" against a page titled "Full stack Development".
	const html = `<title>Enabling Areas - Executive - Full stack Development - Bengaluru | Deloitte</title>
		<body>${filler(60)} full stack development role</body>`;
	const r = classifyApplyPage(page({ html, role: 'Full Stack Developer', company: 'Deloitte' }));
	assert.equal(r.verdict, 'live');
});

test('filler words carry no signal about which job this is', () => {
	// Without this, "Job", "India" and "Limited" would match every careers page.
	const w = significantWords('Full-time Job Role in India | Wipro Limited Pvt');
	for (const noise of ['job', 'role', 'india', 'limited', 'pvt', 'full', 'time']) {
		assert.ok(!w.includes(noise), `${noise} should be filtered`);
	}
	assert.ok(w.includes('wipro'));
});

test('text extraction drops scripts, styles and entities', () => {
	const t = visibleText('<style>.a{color:red}</style><script>var x=1</script><p>Real&nbsp;text</p>');
	assert.match(t, /real text/);
	assert.ok(!t.includes('color'));
	assert.ok(!t.includes('var x'));
});

test('the title is read even when the tag carries attributes', () => {
	assert.equal(titleOf('<title data-x="1">  Spaced   Title </title>'), 'Spaced Title');
	assert.equal(titleOf('<body>no title</body>'), '');
});

test('a missing role name cannot fail a page', () => {
	// Nothing to match on means nothing to fail on. The company still has to be
	// there — that is a separate signal, and this test isolates the role.
	const html = `<title>Wipro Limited</title><body>Wipro. ${filler(200)}</body>`;
	assert.equal(classifyApplyPage(page({ html, role: '' })).verdict, 'live');
});

test('the company being absent is its own signal', () => {
	// A page with plenty of text that names neither the role nor the company is
	// not a page about this job, whatever else it is.
	const html = `<title>Some Job</title><body>${filler(200)}</body>`;
	const r = classifyApplyPage(page({ html, role: '' }));
	assert.equal(r.verdict, 'role_mismatch');
	assert.match(r.note, /company absent/);
});

// ------------------------------------------------- client-rendered ATS shells

test('a shell that names the role in og:title is live, not unverified', () => {
	// The common case, and the reason a headless browser turned out unnecessary:
	// the posting renders client-side but the shell still carries a link preview.
	const html = `<title>Honeywell</title>
		<meta property="og:title" content="Data Scientist I">
		<body><div id="root"></div></body>`;
	const r = classifyApplyPage(page({ html, role: 'Data Scientist & Data Analyst', company: 'Honeywell' }));
	assert.equal(r.verdict, 'live');
});

test("an apostrophe in a meta value does not truncate it", () => {
	// Honeywell's is literally "Intern (Bachelor's)". Capturing with [^"']+
	// stops at the apostrophe and loses every word after it.
	const html = `<meta property="og:title" content="Intern (Bachelor's) Software Engineer">`;
	assert.equal(metaContent(html, 'og:title'), "Intern (Bachelor's) Software Engineer");
});

test('meta tags are read whichever order the attributes come in', () => {
	assert.equal(metaContent('<meta content="Analyst-Data Science" property="og:title">', 'og:title'), 'Analyst-Data Science');
});

test('a JobPosting title in JSON-LD counts as the page naming the role', () => {
	const ld = JSON.stringify({ '@type': 'JobPosting', title: 'Summer 2027 Intern - Software Engineer' });
	const html = `<title>Workday</title><script type="application/ld+json">${ld}</script><body></body>`;
	const r = classifyApplyPage(
		page({
			html,
			// The company is its own signal, and on Workday it lives in the host.
			finalUrl: 'https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/JR337715',
			role: 'Summer Software Engineer Intern',
			company: 'Salesforce',
		})
	);
	assert.equal(r.verdict, 'live');
});

test('malformed JSON-LD proves nothing and does not throw', () => {
	assert.deepEqual(jsonLdTitles('<script type="application/ld+json">{not json</script>'), []);
});

test('a shell whose URL names the role is live, on weaker evidence', () => {
	// Flex ships no og:title, but its path is /job/India-Pune/Junior-Engineer_WD.
	const r = classifyApplyPage(
		page({
			html: '<title>Flex</title><body></body>',
			finalUrl: 'https://flextronics.wd1.myworkdayjobs.com/en-US/Careers/job/India-Pune/Junior-Engineer_WD123',
			role: 'Junior Engineer',
			company: 'Flex',
		})
	);
	assert.equal(r.verdict, 'live');
	assert.match(r.note, /from the URL/);
});

test('the URL cannot rescue a page full of text about another job', () => {
	// A careers category page has a role-shaped URL and plenty of prose, and is
	// exactly what the HCLTech campus landing page looked like. The URL signal is
	// allowed only when the page itself is empty.
	const html = `<title>Careers</title><body>${filler(200)}</body>`;
	const r = classifyApplyPage(
		page({
			html,
			finalUrl: 'https://careers.example.com/graduate-engineer-trainee-jobs',
			role: 'Graduate Engineer Trainee',
			company: 'Example',
		})
	);
	assert.equal(r.verdict, 'role_mismatch');
});

test('a shell with nothing naming the role still asks for a browser', () => {
	const r = classifyApplyPage(page({ html: '<title>Careers</title><body></body>', role: 'Data Scientist' }));
	assert.equal(r.verdict, 'needs_browser');
});
