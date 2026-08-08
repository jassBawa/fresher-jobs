// Stage 2 — turn extracted facts into original draft posts.
//
// This stage only ever sees the facts file. The source's wording is not available
// to it, so the prose it produces is written from structured data.
//
// Most of the page is rendered deterministically from the facts — the eligibility
// table, the lists, the apply block. Templates are more accurate than a model at
// restating structured data, and they cost nothing. The model is asked for one
// small JSON object of connective prose (~150 tokens), not a whole article.
//
// Run with --no-llm to render from templates alone and skip the model entirely.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { askJSON, providerBanner } from "./lib/llm.mjs";

const FACTS_DIR = "data/facts";
const DRAFTS_DIR = "data/drafts";
const SITE = process.env.SITE_NAME || "Your Jobs Site";
const NO_LLM = process.argv.includes("--no-llm") || process.env.NO_LLM === "1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------- the tiny ask
// The only thing a model does better than a template: readable connective prose.
const PROMPT = `Write listing copy for an Indian job board, from these facts only.

Plain Indian English. Short sentences. No hype — never "exciting opportunity",
"look no further", "we are seeking a passionate". Never invent a fact.
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

// ------------------------------------------------------------------ templates
const list = (arr) => arr.filter(Boolean).map((x) => `- ${x}`).join("\n");
const yr = (a = []) => a.filter((y) => /^20\d\d$/.test(String(y))).sort();

function quickFacts(f) {
  const rows = [
    ["Company", f.company],
    ["Role", f.role],
    ["Qualification", f.qualifications?.join(", ")],
    ["Batch", yr(f.batchYears).join(", ")],
    ["Experience", f.experienceRequired],
    ["Location", f.locations?.join(", ")],
    ["Salary", f.salary],
    ["Job type", f.jobType],
    ["Last date", f.lastDateToApply],
  ].filter(([, v]) => v && String(v).trim());

  return [
    "| | |",
    "|---|---|",
    ...rows.map(([k, v]) => `| **${k}** | ${v} |`),
  ].join("\n");
}

function renderBody(f, prose) {
  const out = [];

  out.push(quickFacts(f), "");

  const who = [];
  if (yr(f.batchYears).length) who.push(`**Batch:** ${yr(f.batchYears).join(", ")} graduates`);
  if (f.qualifications?.length) who.push(`**Qualification:** ${f.qualifications.join(", ")}`);
  if (f.experienceRequired) who.push(`**Experience:** ${f.experienceRequired}`);
  if (who.length) out.push("## Who Can Apply", "", who.join("  \n"), "");

  if (prose.about) out.push("## About the Role", "", prose.about, "");

  const need = [...(f.skills || []), ...(f.requirements || [])];
  if (need.length) out.push("## What You Need", "", list(need), "");

  if (f.responsibilities?.length)
    out.push("## What You'll Do", "", list(f.responsibilities), "");

  const apply = [];
  if (f.applyUrl) apply.push(`Applications are submitted on ${f.company}'s official careers page.`, "");
  if (f.lastDateToApply) apply.push(`**Last date to apply:** ${f.lastDateToApply}`, "");
  if (f.applyUrl) apply.push(`[Apply for ${f.role} at ${f.company}](${f.applyUrl})`, "");
  if (apply.length) out.push("## How to Apply", "", ...apply);

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Deterministic fallback copy, used with --no-llm or if the model call fails.
function fallbackProse(f) {
  const batch = yr(f.batchYears);
  const where = f.locations?.length ? ` in ${f.locations.join(", ")}` : "";
  const who = batch.length ? `${batch.join(", ")} batch` : "eligible candidates";
  return {
    title: `${f.company} ${f.role} ${batch.at(-1) || ""}`.trim().slice(0, 65),
    meta: `${f.company} is hiring for ${f.role}${where}. Open to ${who}.`.slice(0, 155),
    summary: `${f.company} is hiring for the role of ${f.role}${where}. The opening is open to ${who}.`,
    about: "",
  };
}

const yaml = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(String(x))).join(", ")}]`;
  return JSON.stringify(String(v));
};

// ----------------------------------------------------------------------- main
async function main() {
  await mkdir(DRAFTS_DIR, { recursive: true });

  let files;
  try {
    files = (await readdir(FACTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`\n  ✗ no ${FACTS_DIR} yet — run "npm run fetch" first\n`);
    process.exit(1);
  }

  const done = new Set(
    (await readdir(DRAFTS_DIR).catch(() => [])).map((f) => f.replace(/\.md$/, ""))
  );
  const todo = files.filter((f) => !done.has(f.replace(/\.json$/, "")));

  console.log(`\n  model     ${NO_LLM ? "(templates only — no LLM calls)" : providerBanner()}`);
  console.log(`  facts     ${files.length} total · ${todo.length} awaiting a draft\n`);

  if (!todo.length) return console.log("  nothing to draft. done.\n");

  let ok = 0;
  let templated = 0;

  for (const file of todo) {
    const slug = file.replace(/\.json$/, "");
    const facts = JSON.parse(await readFile(`${FACTS_DIR}/${file}`, "utf8"));
    const { discoveredVia, discoveredAt, extractedAt, ...clean } = facts;

    let prose = fallbackProse(facts);
    let usedLLM = false;

    if (!NO_LLM) {
      try {
        const out = await askJSON(PROMPT.replace("{{FACTS}}", JSON.stringify(clean)), {
          maxTokens: 400, // small on purpose — this is 4 short fields, not an article
        });
        if (out?.title && out?.summary) {
          prose = { ...prose, ...out };
          usedLLM = true;
        }
      } catch (err) {
        console.log(`  ! llm    ${slug.slice(0, 40)} — ${err.message.slice(0, 50)} (templated instead)`);
      }
    }
    if (!usedLLM) templated++;

    // Filter applies to the frontmatter only — conditional lines collapse to "".
    // The body's blank lines are structural (markdown needs them) and must survive.
    const frontmatter = [
      `title: ${yaml(prose.title)}`,
      `description: ${yaml(prose.meta)}`,
      `slug: ${yaml(slug)}`,
      "status: draft",
      `company: ${yaml(facts.company)}`,
      `role: ${yaml(facts.role)}`,
      facts.jobType ? `jobType: ${yaml(facts.jobType)}` : "",
      yr(facts.batchYears).length ? `batchYears: ${yaml(yr(facts.batchYears))}` : "",
      facts.locations?.length ? `locations: ${yaml(facts.locations)}` : "",
      facts.salary ? `salary: ${yaml(facts.salary)}` : "",
      facts.lastDateToApply ? `lastDateToApply: ${yaml(facts.lastDateToApply)}` : "",
      facts.applyUrl ? `applyUrl: ${yaml(facts.applyUrl)}` : "",
      facts.skills?.length ? `skills: ${yaml(facts.skills)}` : "",
      `generatedBy: ${yaml(usedLLM ? "llm+template" : "template")}`,
      `createdAt: ${yaml(new Date().toISOString())}`,
      `sourceRef: ${yaml(discoveredVia)}`,
    ].filter((l) => l !== "");

    const doc =
      ["---", ...frontmatter, "---"].join("\n") +
      "\n\n" +
      prose.summary +
      "\n\n" +
      renderBody(facts, prose) +
      "\n";

    await writeFile(`${DRAFTS_DIR}/${slug}.md`, doc);
    console.log(`  ✓ draft  ${prose.title.slice(0, 58)}`);
    ok++;

    if (!NO_LLM) await sleep(250);
  }

  console.log(
    `\n  ${ok} drafts in ${DRAFTS_DIR}/  (${templated} template-only)  · status: draft\n`
  );
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
