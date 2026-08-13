import test from "node:test";
import assert from "node:assert/strict";
import {
  decode,
  toText,
  scoreApplyUrl,
  cleanUrl,
  rankApplyUrls,
  batchYearsIn,
  preExtract,
} from "../src/lib/extract.mjs";

const SOURCE = "https://freshersdunia.in";

test("decodes the entities WordPress emits", () => {
  assert.equal(decode("Wipro &#8211; Trainee"), "Wipro - Trainee");
  assert.equal(decode("Dev&#8217;s role"), "Dev's role");
  assert.equal(decode("R&amp;D"), "R&D");
  assert.equal(decode("a&nbsp;b"), "a b");
  assert.equal(decode("  spaced   out  "), "spaced out");
});

test("toText drops scripts and styles entirely", () => {
  const html = "<p>Keep</p><script>var secret = 1;</script><style>.a{color:red}</style><p>This</p>";
  const text = toText(html);
  assert.match(text, /Keep/);
  assert.match(text, /This/);
  assert.doesNotMatch(text, /secret/);
  assert.doesNotMatch(text, /color:red/);
});

test("ranks an ATS requisition above a careers homepage", () => {
  const ats = "https://wipro.wd3.myworkdayjobs.com/careers/job/Bengaluru/Trainee_R123";
  const home = "https://careers.wipro.com/";
  assert.ok(scoreApplyUrl(ats) > scoreApplyUrl(home));
});

test("penalises a bare homepage", () => {
  assert.ok(scoreApplyUrl("https://example.com/") < 0);
  assert.ok(scoreApplyUrl("https://example.com/job/123") > 0);
});

test("strips tracking parameters but keeps meaningful ones", () => {
  const url = cleanUrl("https://careers.x.com/job?utm_source=fd&gclid=9&jobId=42");
  assert.match(url, /jobId=42/);
  assert.doesNotMatch(url, /utm_source/);
  assert.doesNotMatch(url, /gclid/);
});

test("cleanUrl passes through anything unparseable", () => {
  assert.equal(cleanUrl("not a url"), "not a url");
});

test("excludes the source's own domain and social links", () => {
  const html = `
    <a href="https://freshersdunia.in/other-post/">Related</a>
    <a href="https://www.facebook.com/sharer">Share</a>
    <a href="https://wa.me/123">WhatsApp</a>
    <a href="https://api.whatsapp.com/send">WhatsApp</a>
    <a href="https://careers.wipro.com/job/190712">Apply</a>
  `;
  const ranked = rankApplyUrls(html, SOURCE);
  assert.deepEqual(ranked, ["https://careers.wipro.com/job/190712"]);
});

test("drops google search redirects", () => {
  const html = `<a href="https://www.google.com/search?q=wipro+jobs">Search</a>
                <a href="https://careers.wipro.com/job/1">Apply</a>`;
  assert.deepEqual(rankApplyUrls(html, SOURCE), ["https://careers.wipro.com/job/1"]);
});

test("deduplicates and orders links best-first", () => {
  const html = `
    <a href="https://careers.acme.com/">Careers</a>
    <a href="https://boards.greenhouse.io/acme/jobs/44">Apply</a>
    <a href="https://boards.greenhouse.io/acme/jobs/44">Apply again</a>
  `;
  const ranked = rankApplyUrls(html, SOURCE);
  assert.equal(ranked.length, 2);
  assert.match(ranked[0], /greenhouse/);
});

test("handles entity-encoded ampersands in hrefs", () => {
  const html = `<a href="https://careers.acme.com/job?a=1&amp;b=2">Apply</a>`;
  assert.deepEqual(rankApplyUrls(html, SOURCE), ["https://careers.acme.com/job?a=1&b=2"]);
});

test("finds batch years and ignores other four-digit numbers", () => {
  assert.deepEqual(batchYearsIn("2024, 2025 and 2026 batches. Salary 4500 USD."), [
    "2024",
    "2025",
    "2026",
  ]);
  assert.deepEqual(batchYearsIn("no years here"), []);
});

test("preExtract reduces a post to facts and holds the text", () => {
  const post = {
    title: { rendered: "Wipro Off Campus &#8211; 2026" },
    content: {
      rendered: `<p>Batch 2025, 2026. Apply now.</p>
                 <a href="https://careers.wipro.com/job/190712">Apply</a>`,
    },
  };
  const pre = preExtract(post, { sourceBase: SOURCE });

  assert.equal(pre.title, "Wipro Off Campus - 2026");
  assert.deepEqual(pre.batchYears, ["2025", "2026"]);
  assert.equal(pre.bestApplyUrl, "https://careers.wipro.com/job/190712");
  assert.match(pre.text, /Batch 2025, 2026/);
});

test("preExtract reports no confident apply URL rather than a bad one", () => {
  const post = {
    title: { rendered: "Some post" },
    content: { rendered: `<a href="https://example.com/">Homepage</a>` },
  };
  const pre = preExtract(post, { sourceBase: SOURCE });
  assert.equal(pre.bestApplyUrl, null);
  assert.equal(pre.candidateApplyUrls.length, 1); // still offered to the model
});

test("preExtract survives an empty post", () => {
  const pre = preExtract({}, { sourceBase: SOURCE });
  assert.equal(pre.title, "");
  assert.equal(pre.bestApplyUrl, null);
  assert.deepEqual(pre.batchYears, []);
});

test("preExtract caps the text it holds in memory", () => {
  const post = { title: { rendered: "x" }, content: { rendered: "<p>" + "a ".repeat(9000) + "</p>" } };
  assert.ok(preExtract(post, { sourceBase: SOURCE }).text.length <= 6000);
});
