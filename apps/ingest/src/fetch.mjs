// Stage 1 — discover postings, extract FACTS ONLY, verify the apply link,
// and write what survives to Postgres.
//
// The source's article text is held in memory just long enough to pull
// structured fields out of it, then dropped. It is never persisted and never
// reaches the draft stage. Only facts and a provenance URL are stored.
//
// A posting has to earn its place. Anything that cannot be parsed into
// something a reader could act on is discarded here, before the drafting stage
// spends model tokens on it:
//
//   not a job posting        → no row at all, just marked seen
//   no usable apply link     → rejected
//   link is dead             → rejected
//   link is the wrong job    → rejected
//   link needs a browser     → kept, honestly unverified
//
// Rejections are rows rather than deletions. "Why did this one not make it" is
// a question worth being able to answer.

import {
  and,
  checkApplyUrl,
  connect,
  eq,
  inArray,
  jobs,
  roleFamily,
  seenPosts,
  slugify,
  toCities,
} from "@jobs/db";
import { askJSON, providerBanner } from "./lib/llm.mjs";
import { preExtract, chooseApplyUrl } from "./lib/extract.mjs";
import { parseApplyByDate, toIsoDay } from "./lib/dates.mjs";

const SOURCE = process.env.SOURCE_BASE || "https://freshersdunia.in";
const PER_RUN = Number(process.env.MAX_POSTS_PER_RUN || 15);
const UA = "Mozilla/5.0 (compatible; jobs-ingest/0.2; facts-extraction)";

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

/** Verdicts that mean the link proved itself wrong, rather than merely
 *  refusing to prove itself right. */
const REJECTING = new Set(["dead", "role_mismatch"]);

// ----------------------------------------------------------------------- main
const DRY = process.argv.includes("--dry") || process.env.DRY === "1";

async function main() {
  console.log(`\n  source    ${SOURCE}`);
  console.log(`  model     ${DRY ? "(dry run — no LLM calls, no writes)" : providerBanner()}`);

  let posts;
  try {
    posts = await fetchPosts(1, 30);
  } catch (err) {
    console.error(`\n  ✗ could not read source: ${err.message}\n`);
    process.exit(1);
  }

  // A dry run parses and prints; it touches neither the model nor the database,
  // so it stays usable with no key and no container running.
  if (DRY) {
    const fresh = posts.slice(0, PER_RUN);
    console.log(`  posts     ${posts.length} returned · showing ${fresh.length}\n`);
    for (const post of fresh) {
      const pre = preExtract(post, { sourceBase: SOURCE });
      console.log(`  · ${pre.title.slice(0, 58)}`);
      console.log(
        `      batches: ${pre.batchYears.join(", ") || "—"}   links: ${pre.candidateApplyUrls.length}   text: ${pre.text.length} chars`
      );
      console.log(`      apply?  ${(pre.bestApplyUrl || "— none confident, LLM will decide").slice(0, 88)}`);
    }
    console.log(`\n  ${fresh.length} posts parsed. Nothing written, no LLM called.\n`);
    return;
  }

  const { sql: client, db } = connect();
  try {
    const ids = posts.map((p) => String(p.id));
    const known = new Set(
      (
        await db
          .select({ externalId: seenPosts.externalId })
          .from(seenPosts)
          .where(and(eq(seenPosts.source, SOURCE), inArray(seenPosts.externalId, ids)))
      ).map((r) => r.externalId)
    );

    const fresh = posts.filter((p) => !known.has(String(p.id))).slice(0, PER_RUN);
    console.log(`  posts     ${posts.length} returned · ${fresh.length} new to process\n`);
    if (!fresh.length) {
      console.log("  nothing new. done.\n");
      return;
    }

    const tally = { kept: 0, rejected: 0, notAJob: 0, failed: 0 };

    for (const post of fresh) {
      const pre = preExtract(post, { sourceBase: SOURCE });
      const label = pre.title.slice(0, 52);
      const markSeen = () =>
        db
          .insert(seenPosts)
          .values({ source: SOURCE, externalId: String(post.id) })
          .onConflictDoNothing();

      try {
        const facts = await extractFacts(pre);

        if (!facts || facts.isValid === false || !facts.company || !facts.role) {
          console.log(`  – not a job   ${label}`);
          await markSeen();
          tally.notAJob++;
          continue;
        }

        const applyUrl = chooseApplyUrl(facts.applyUrl, pre.bestApplyUrl);
        const slug =
          slugify(`${facts.company}-${facts.role}`).slice(0, 70) || `posting-${post.id}`;

        // Verify before drafting. A link that proves itself wrong costs nothing
        // to discard here and two model calls to discard later.
        let check = { verdict: "unchecked", note: null, finalUrl: null };
        if (applyUrl) check = await checkApplyUrl(applyUrl, facts.role, facts.company);

        const rejected = !applyUrl
          ? "no usable apply link"
          : REJECTING.has(check.verdict)
            ? `apply link ${check.verdict}: ${check.note}`
            : null;

        const row = {
          slug,
          status: rejected ? "rejected" : "draft",
          rejectedReason: rejected,
          company: facts.company,
          companySlug: slugify(facts.company),
          role: facts.role,
          roleFamily: roleFamily(facts.role, facts.jobType)?.slug ?? null,
          jobType: facts.jobType ?? null,
          batchYears: facts.batchYears?.length ? facts.batchYears : pre.batchYears,
          qualifications: facts.qualifications ?? [],
          experienceRequired: facts.experienceRequired ?? null,
          salary: facts.salary ?? null,
          locations: facts.locations ?? [],
          cities: toCities(facts.locations ?? []),
          lastDateToApply: facts.lastDateToApply ?? null,
          applyByDate: parseApplyByDate(facts.lastDateToApply),
          applyUrl,
          skills: facts.skills ?? [],
          requirements: facts.requirements ?? [],
          responsibilities: facts.responsibilities ?? [],
          applyCheck: check.verdict === "unchecked" ? "unchecked" : check.verdict,
          applyCheckedAt: applyUrl ? new Date() : null,
          applyFinalUrl: check.finalUrl,
          applyNote: check.note,
          sourceRef: post.link,
          postedAt: toIsoDay(post.date),
        };

        // Facts only, never prose: an existing draft keeps its generated copy.
        const { status: _s, rejectedReason: _r, ...factsOnly } = row;
        await db
          .insert(jobs)
          .values(row)
          .onConflictDoUpdate({ target: jobs.slug, set: { ...factsOnly, updatedAt: new Date() } });

        await markSeen();

        if (rejected) {
          console.log(`  ✗ discard    ${label}  — ${rejected.slice(0, 46)}`);
          tally.rejected++;
        } else {
          const mark = check.verdict === "live" ? "✓" : "?";
          console.log(`  ${mark} keep       ${label}  — link ${check.verdict}`);
          tally.kept++;
        }
      } catch (err) {
        // Left unseen deliberately, so a transient model or network failure is
        // retried on the next run instead of silently losing the posting.
        console.log(`  ! failed     ${label}  — ${err.message.slice(0, 50)}`);
        tally.failed++;
      }

      await sleep(600); // be polite to the source, the model, and the ATS
    }

    const [{ count: awaiting }] = await db
      .select({ count: jobs.id })
      .from(jobs)
      .where(eq(jobs.status, "draft"))
      .then((rows) => [{ count: rows.length }]);

    console.log(
      `\n  ${tally.kept} kept · ${tally.rejected} discarded · ${tally.notAJob} not job postings · ${tally.failed} failed`
    );
    console.log(`  ${awaiting} listings awaiting a draft\n`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
