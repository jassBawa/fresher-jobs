// Stage 2 — turn stored facts into original prose.
//
// This stage reads only the facts columns. The source's wording was never
// persisted, so the copy it writes is generated from structured data rather
// than rewritten from anyone's article.
//
// Most of the page is still rendered from templates: a template restating a
// JSON field cannot hallucinate a batch year, and it costs nothing. The model
// is asked for four short fields (~150 tokens), not an article.
//
// Only listings that survived stage one are drafted. Rejected postings are
// never worth model tokens.
//
// Run with --no-llm to fill from templates alone and skip the model entirely.

import {
  and,
  connect,
  eq,
  isNull,
  jobs,
} from "@jobs/db";
import { askJSON, providerBanner } from "./lib/llm.mjs";
import { fallbackProse } from "./lib/render.mjs";

const NO_LLM = process.argv.includes("--no-llm") || process.env.NO_LLM === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------- the tiny ask
const PROMPT = `Write listing copy for an Indian job board, from these facts only.

Plain Indian English. Short sentences. No hype — never "exciting opportunity",
"look no further", "we are seeking a passionate". Never invent a fact.
Write about the employer in the third person; you are the job board, not the company.
The reader is deciding in 20 seconds whether they qualify.

Return JSON:
{
  "title": string,    // max 65 chars, must contain the company and the role
  "meta": string,     // max 155 chars, factual
  "summary": string,  // exactly 2 sentences: who it is for, and what the job is
  "about": string     // ONE paragraph, 40-60 words, what the person will actually do
}

FACTS:
{{FACTS}}`;

/** Only the columns the model is allowed to see: facts, never provenance. */
const factsFor = (job) => ({
  company: job.company,
  role: job.role,
  jobType: job.jobType,
  batchYears: job.batchYears,
  qualifications: job.qualifications,
  experienceRequired: job.experienceRequired,
  salary: job.salary,
  locations: job.locations,
  lastDateToApply: job.lastDateToApply,
  skills: job.skills,
  requirements: job.requirements,
  responsibilities: job.responsibilities,
});

async function main() {
  const { sql: client, db } = connect();
  try {
    const todo = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, "draft"), isNull(jobs.draftedAt)));

    console.log(`\n  model     ${NO_LLM ? "(templates only — no LLM calls)" : providerBanner()}`);
    console.log(`  listings  ${todo.length} awaiting a draft\n`);
    if (!todo.length) return console.log("  nothing to draft. done.\n");

    let ok = 0;
    let templated = 0;

    for (const job of todo) {
      let prose = fallbackProse(job);
      let usedLLM = false;

      if (!NO_LLM) {
        try {
          const out = await askJSON(PROMPT.replace("{{FACTS}}", JSON.stringify(factsFor(job))), {
            maxTokens: 400, // small on purpose — four short fields, not an article
          });
          if (out?.title && out?.summary) {
            prose = { ...prose, ...out };
            usedLLM = true;
          }
        } catch (err) {
          console.log(`  ! llm    ${job.slug.slice(0, 40)} — ${err.message.slice(0, 46)} (templated)`);
        }
      }
      if (!usedLLM) templated++;

      await db
        .update(jobs)
        .set({
          title: prose.title,
          description: prose.meta,
          summary: prose.summary,
          about: prose.about || null,
          generatedBy: usedLLM ? "llm+template" : "template",
          draftedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      console.log(`  ✓ draft  ${prose.title.slice(0, 58)}`);
      ok++;

      if (!NO_LLM) await sleep(250);
    }

    console.log(`\n  ${ok} drafted (${templated} template-only) · status: draft — nothing is live yet\n`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
