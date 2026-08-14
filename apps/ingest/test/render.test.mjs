import test from "node:test";
import assert from "node:assert/strict";
import { yr, list, quickFacts, renderBody, fallbackProse, yaml, buildDraft } from "../src/lib/render.mjs";

const FACTS = {
  company: "Wipro Limited",
  role: "Graduate Engineer Trainee",
  jobType: "full-time",
  batchYears: ["2024", "2025", "2026"],
  qualifications: ["B.E/B.Tech", "MCA"],
  experienceRequired: "0-1 years",
  salary: "₹4 to 6 LPA (Expected)",
  locations: ["Bengaluru", "Hyderabad"],
  lastDateToApply: "Rolling Basis",
  applyByDate: null,
  applyUrl: "https://careers.wipro.com/job/190712",
  skills: ["Java", "SQL"],
  requirements: ["Freshers welcome"],
  responsibilities: ["Software testing"],
  discoveredVia: "https://freshersdunia.in/wipro-2026/",
  discoveredAt: "2026-08-11T04:44:14",
  extractedAt: "2026-08-12T18:02:36.377Z",
};

const PROSE = {
  title: "Wipro Limited - Graduate Engineer Trainee",
  meta: "Wipro is hiring Graduate Engineer Trainees.",
  summary: "Wipro is hiring. Open to 2024-2026 batches.",
  about: "You will work on testing and quality assurance.",
};

const draft = (over = {}) =>
  buildDraft({
    facts: { ...FACTS, ...over.facts },
    prose: { ...PROSE, ...over.prose },
    slug: over.slug ?? "wipro-limited-graduate-engineer-trainee",
    usedLLM: over.usedLLM ?? true,
    createdAt: over.createdAt ?? "2026-08-12T18:02:36.377Z",
    postedAt: over.postedAt ?? "2026-08-11",
    status: over.status ?? "draft",
  });

// ------------------------------------------------------------------ helpers

test("yr keeps only things shaped like years, sorted", () => {
  assert.deepEqual(yr(["2026", "2024", "not-a-year", "", "99"]), ["2024", "2026"]);
  assert.deepEqual(yr(), []);
});

test("list drops empty entries", () => {
  assert.equal(list(["a", "", null, "b"]), "- a\n- b");
});

test("yaml quotes and escapes values", () => {
  assert.equal(yaml('He said "hi"'), '"He said \\"hi\\""');
  assert.equal(yaml(["a", "b"]), '["a", "b"]');
  assert.equal(yaml(null), "");
});

// ------------------------------------------------------------------ sections

test("quickFacts omits rows with no value", () => {
  const table = quickFacts({ company: "Acme", role: "Engineer", salary: null, locations: [] });
  assert.match(table, /\*\*Company\*\* \| Acme/);
  assert.doesNotMatch(table, /Salary/);
  assert.doesNotMatch(table, /Location/);
});

test("renderBody omits the About section when the model gave no paragraph", () => {
  assert.doesNotMatch(renderBody(FACTS, { ...PROSE, about: "" }), /## About the Role/);
  assert.match(renderBody(FACTS, PROSE), /## About the Role/);
});

test("renderBody omits the apply block entirely when there is no link or date", () => {
  const bare = { ...FACTS, applyUrl: null, lastDateToApply: null };
  assert.doesNotMatch(renderBody(bare, PROSE), /## How to Apply/);
});

test("renderBody never leaves a run of blank lines", () => {
  assert.doesNotMatch(renderBody(FACTS, PROSE), /\n{3,}/);
});

test("fallbackProse writes usable copy with no model", () => {
  const p = fallbackProse(FACTS);
  assert.match(p.title, /Wipro Limited/);
  assert.ok(p.title.length <= 65);
  assert.ok(p.meta.length <= 155);
  assert.match(p.summary, /Graduate Engineer Trainee/);
  assert.equal(p.about, "");
});

test("fallbackProse copes with no batch years and no locations", () => {
  const p = fallbackProse({ company: "Acme", role: "Analyst", batchYears: [], locations: [] });
  assert.match(p.summary, /eligible candidates/);
});

// -------------------------------------------------------------- frontmatter

test("everything is written as a draft, never published", () => {
  // The review-before-ship gate. Nothing in this pipeline may publish itself.
  assert.match(draft(), /^status: draft$/m);
  assert.doesNotMatch(draft(), /^status: published$/m);
});

test("frontmatter carries the dated fields", () => {
  const doc = draft({ facts: { applyByDate: "2026-12-31" } });
  assert.match(doc, /^applyByDate: "2026-12-31"$/m);
  assert.match(doc, /^postedAt: "2026-08-11"$/m);
  assert.match(doc, /^createdAt: "2026-08-12T18:02:36.377Z"$/m);
});

test("optional frontmatter keys are omitted, not emitted empty", () => {
  const doc = draft({
    facts: { salary: null, applyUrl: null, skills: [], jobType: null, locations: [] },
  });
  for (const key of ["salary", "applyUrl", "skills", "jobType", "locations"]) {
    assert.doesNotMatch(doc, new RegExp(`^${key}:`, "m"), key);
  }
  assert.doesNotMatch(doc, /^\w+: *$/m); // no key with an empty value
});

test("applyByDate is omitted when the deadline could not be parsed", () => {
  assert.doesNotMatch(draft(), /^applyByDate:/m);
  assert.match(draft(), /^lastDateToApply: "Rolling Basis"$/m); // the raw text survives
});

test("generatedBy records whether the model was actually used", () => {
  assert.match(draft({ usedLLM: true }), /^generatedBy: "llm\+template"$/m);
  assert.match(draft({ usedLLM: false }), /^generatedBy: "template"$/m);
});

test("a quote in a company name cannot break the frontmatter", () => {
  const doc = draft({ facts: { company: 'Acme "Global" Ltd' } });
  assert.match(doc, /^company: "Acme \\"Global\\" Ltd"$/m);
});

test("frontmatter is delimited and the body follows it", () => {
  const doc = draft();
  const fence = doc.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fence, "frontmatter block present");
  assert.doesNotMatch(fence[1], /^---$/m); // no stray delimiter inside
  assert.match(doc.slice(fence[0].length), /Wipro is hiring/);
});

test("the source article never reaches the draft", () => {
  // Decision D10: facts in, prose out. Any field the renderer does not know
  // about must be ignored rather than passed through.
  const doc = buildDraft({
    facts: { ...FACTS, text: "COPYRIGHTED SOURCE PROSE", content: "ALSO COPYRIGHTED" },
    prose: PROSE,
    slug: "x",
    usedLLM: true,
    createdAt: "2026-08-12T18:02:36.377Z",
    postedAt: "2026-08-11",
  });
  assert.doesNotMatch(doc, /COPYRIGHTED/);
});

test("provenance is recorded as a citation", () => {
  assert.match(draft(), /^sourceRef: "https:\/\/freshersdunia\.in\/wipro-2026\/"$/m);
});

test("output is deterministic for the same inputs", () => {
  assert.equal(draft(), draft());
});

test("the exported status is whatever the row says, not always draft", () => {
  // The database is the source of truth now; the file is a projection of it.
  assert.match(draft({ status: "published" }), /^status: published$/m);
  assert.match(draft(), /^status: draft$/m);
});

test("provenance survives under either field name", () => {
  // Facts records called it discoveredVia; the database column is source_ref.
  const viaDb = buildDraft({
    facts: { ...FACTS, discoveredVia: undefined, sourceRef: "https://example.com/post" },
    prose: PROSE, slug: "x", usedLLM: true,
    createdAt: "2026-08-12T18:02:36.377Z", postedAt: "2026-08-11",
  });
  assert.match(viaDb, /^sourceRef: "https:\/\/example\.com\/post"$/m);
  assert.match(draft(), /^sourceRef: "https:\/\/freshersdunia\.in\/wipro-2026\/"$/m);
});
