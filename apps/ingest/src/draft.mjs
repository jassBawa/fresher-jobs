// Stage 2 — turn extracted facts into original draft posts.
//
// This stage only ever sees the facts file. The source's wording is not available
// to it, so the prose it produces is written from structured data.
//
// Most of the page is rendered deterministically from the facts — the eligibility
// table, the lists, the apply block. Templates are more accurate than a model at
// restating structured data, and they cost nothing. The model is asked for one
// small JSON object of connective prose (~150 tokens), not a whole article.
// The rendering itself lives in lib/render.mjs; this file is the I/O around it.
//
// Run with --no-llm to render from templates alone and skip the model entirely.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { askJSON, providerBanner } from "./lib/llm.mjs";
import { buildDraft, fallbackProse } from "./lib/render.mjs";
import { toIsoDay } from "./lib/dates.mjs";

const FACTS_DIR = "data/facts";
const DRAFTS_DIR = "data/drafts";
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

// ----------------------------------------------------------------------- main
async function main() {
  await mkdir(DRAFTS_DIR, { recursive: true });

  let files;
  try {
    files = (await readdir(FACTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`\n  ✗ no ${FACTS_DIR} yet — run "pnpm run fetch" first\n`);
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

    const doc = buildDraft({
      facts,
      prose,
      slug,
      usedLLM,
      createdAt: new Date().toISOString(),
      postedAt: toIsoDay(facts.discoveredAt),
    });

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
