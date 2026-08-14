// Stage 1 — discover postings, extract FACTS ONLY, discard the source prose.
//
// The source's article text is held in memory just long enough to pull structured
// fields out of it, then dropped. It is never written to disk and never reaches
// the draft stage. Only facts (company, role, eligibility, dates, apply link) and
// a provenance URL are persisted.
//
// The rule-based half of the extraction lives in lib/extract.mjs; this file is
// the I/O around it.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { askJSON, providerBanner } from "./lib/llm.mjs";
import { preExtract, chooseApplyUrl } from "./lib/extract.mjs";
import { parseApplyByDate } from "./lib/dates.mjs";

const SOURCE = process.env.SOURCE_BASE || "https://freshersdunia.in";
const PER_RUN = Number(process.env.MAX_POSTS_PER_RUN || 15);
const FACTS_DIR = "data/facts";
const STATE_FILE = "data/state.json";
const UA = "Mozilla/5.0 (compatible; jobs-ingest/0.1; facts-extraction)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- source read
async function fetchPosts(page = 1, perPage = 20) {
  const url = `${SOURCE}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&orderby=date&order=desc&_fields=id,slug,link,date,title,content`;
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`source returned HTTP ${res.status}`);
  return res.json();
}

// ------------------------------------------------------------- fact extraction
const SCHEMA_PROMPT = `You are a data extraction tool. Extract ONLY objective facts from the job announcement below.

CRITICAL RULES:
- Output FACTS, never the source's sentences. Do not copy phrasing, marketing language, or descriptive prose.
- Every string must be a short atomic fact (a name, a number, a date, a qualification), not a rewritten sentence.
- If a field is not stated, use null (or [] for lists). Never guess or invent.
- "responsibilities" and "requirements" must be terse noun phrases, max 8 words each, stripped of all adjectives and tone.

Return JSON exactly matching:
{
  "company": string,
  "role": string,
  "jobType": "full-time" | "internship" | "contract" | "trainee" | null,
  "batchYears": string[],
  "qualifications": string[],
  "experienceRequired": string | null,
  "salary": string | null,
  "locations": string[],
  "lastDateToApply": string | null,
  "applyUrl": string | null,
  "skills": string[],
  "requirements": string[],
  "responsibilities": string[],
  "isValid": boolean
}

Set "isValid" to false if this is not an actual job announcement (e.g. it is a results page, an admit card, or a generic article).

Pick "applyUrl" from the candidate URLs if one is clearly the official application link; otherwise null.

CANDIDATE URLS: {{URLS}}

HEADLINE: {{TITLE}}

ANNOUNCEMENT TEXT:
{{TEXT}}`;

async function extractFacts(pre) {
  const prompt = SCHEMA_PROMPT.replace("{{URLS}}", pre.candidateApplyUrls.join("\n") || "(none)")
    .replace("{{TITLE}}", pre.title)
    .replace("{{TEXT}}", pre.text);
  return askJSON(prompt, { maxTokens: 1400 });
}

// ----------------------------------------------------------------------- main
async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return { seen: [] };
  }
}

const DRY = process.argv.includes("--dry") || process.env.DRY === "1";

async function main() {
  await mkdir(FACTS_DIR, { recursive: true });

  console.log(`\n  source    ${SOURCE}`);
  console.log(`  model     ${DRY ? "(dry run — no LLM calls)" : providerBanner()}`);

  const state = await loadState();
  const seen = new Set(state.seen);

  let posts;
  try {
    posts = await fetchPosts(1, 30);
  } catch (err) {
    console.error(`\n  ✗ could not read source: ${err.message}\n`);
    process.exit(1);
  }

  const fresh = posts.filter((p) => !seen.has(p.id)).slice(0, PER_RUN);
  console.log(`  posts     ${posts.length} returned · ${fresh.length} new to process\n`);

  if (!fresh.length) {
    console.log("  nothing new. done.\n");
    return;
  }

  let ok = 0;
  let skipped = 0;

  for (const post of fresh) {
    const pre = preExtract(post, { sourceBase: SOURCE });
    const label = pre.title.slice(0, 58);

    if (DRY) {
      console.log(`  · ${label}`);
      console.log(
        `      batches: ${pre.batchYears.join(", ") || "—"}   links: ${pre.candidateApplyUrls.length}   text: ${pre.text.length} chars`
      );
      console.log(`      apply?  ${(pre.bestApplyUrl || "— none confident, LLM will decide").slice(0, 88)}`);
      ok++;
      continue;
    }

    try {
      const facts = await extractFacts(pre);

      if (!facts || facts.isValid === false || !facts.company || !facts.role) {
        console.log(`  – skip   ${label}  (not a job posting)`);
        seen.add(post.id);
        skipped++;
        continue;
      }

      const record = {
        // facts only — no source prose anywhere in this object
        company: facts.company,
        role: facts.role,
        jobType: facts.jobType ?? null,
        batchYears: facts.batchYears?.length ? facts.batchYears : pre.batchYears,
        qualifications: facts.qualifications ?? [],
        experienceRequired: facts.experienceRequired ?? null,
        salary: facts.salary ?? null,
        locations: facts.locations ?? [],
        lastDateToApply: facts.lastDateToApply ?? null,
        // Machine-readable form of the above, null whenever the source said
        // something like "ASAP" instead of naming a date. The site retires
        // those on a freshness horizon rather than a deadline.
        applyByDate: parseApplyByDate(facts.lastDateToApply),
        applyUrl: chooseApplyUrl(facts.applyUrl, pre.bestApplyUrl),
        skills: facts.skills ?? [],
        requirements: facts.requirements ?? [],
        responsibilities: facts.responsibilities ?? [],
        // provenance: a citation, not content
        discoveredVia: post.link,
        discoveredAt: post.date,
        extractedAt: new Date().toISOString(),
      };

      const slug = `${facts.company}-${facts.role}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70);

      await writeFile(`${FACTS_DIR}/${slug}.json`, JSON.stringify(record, null, 2));
      console.log(`  ✓ facts  ${label}`);
      seen.add(post.id);
      ok++;
    } catch (err) {
      console.log(`  ✗ fail   ${label}  — ${err.message.slice(0, 70)}`);
    }

    await sleep(600); // be polite to both the source and the model API
  }

  if (DRY) {
    console.log(`\n  ${ok} posts parsed. No files written, no LLM called.`);
    console.log(`  Add an API key to .env and rerun without --dry to extract facts.\n`);
    return;
  }

  await writeFile(STATE_FILE, JSON.stringify({ seen: [...seen].slice(-3000) }, null, 2));

  const total = (await readdir(FACTS_DIR)).filter((f) => f.endsWith(".json")).length;
  console.log(`\n  ${ok} extracted · ${skipped} skipped · ${total} total in ${FACTS_DIR}\n`);
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
