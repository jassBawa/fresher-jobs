// The review gate.
//
// Listings land as `draft` and only a human moves them to `published`. Nothing
// in the pipeline publishes itself, which is the one rule the whole ingest is
// built around.
//
// Usage:
//   pnpm run drafts                       what is drafted, live, and discarded
//   pnpm run promote <slug> [<slug>...]   publish
//   pnpm run promote <slug> draft         pull one back
//   pnpm run promote <slug> --to draft    same, for several
//
// Rejected listings cannot be promoted by accident: the pipeline discarded them
// for a stated reason, and overriding that takes --force, which says so out loud.

import { writeFile } from "node:fs/promises";
import { connect, eq, inArray, jobs, sql } from "@jobs/db";
import { buildDraft } from "../src/lib/render.mjs";

const DRAFTS_DIR = "data/drafts";
const STATUSES = ["draft", "published"];
const argv = process.argv.slice(2);

function usage(message) {
  if (message) console.error(`\n  ✗ ${message}`);
  console.error(`
  usage: pnpm run drafts
         pnpm run promote <slug> [<slug>...] [--to draft|published] [--force]
`);
  process.exit(1);
}

/** Keep the markdown projection in step with the row that just changed. */
async function writeProjection(job) {
  const doc = buildDraft({
    facts: job,
    prose: {
      title: job.title ?? `${job.company} ${job.role}`,
      meta: job.description ?? "",
      summary: job.summary ?? "",
      about: job.about ?? "",
    },
    slug: job.slug,
    usedLLM: job.generatedBy === "llm+template",
    createdAt: (job.createdAt ?? new Date()).toISOString(),
    postedAt: job.postedAt ?? null,
    status: job.status,
  });
  await writeFile(`${DRAFTS_DIR}/${job.slug}.md`, doc);
}

const { sql: client, db } = connect();

try {
  if (argv.includes("--list") || argv.includes("-l")) {
    const rows = await db.select().from(jobs).orderBy(jobs.status, jobs.slug);
    console.log();
    for (const j of rows) {
      const mark = j.status === "published" ? "●" : j.status === "rejected" ? "✗" : "○";
      const check = j.applyCheck === "unchecked" ? "" : `  [link ${j.applyCheck}]`;
      console.log(`  ${mark} ${j.status.padEnd(9)} ${j.slug}${check}`);
      if (j.title) console.log(`              ${j.title.slice(0, 70)}`);
      if (j.rejectedReason) console.log(`              discarded: ${j.rejectedReason.slice(0, 70)}`);
    }
    const n = (s) => rows.filter((r) => r.status === s).length;
    console.log(
      `\n  ${n("published")} published · ${n("draft")} draft · ${n("rejected")} discarded · ${rows.length} total\n`
    );
    process.exit(0);
  }

  let toStatus = "published";
  let force = false;
  const slugs = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--to") toStatus = argv[++i];
    else if (arg.startsWith("--to=")) toStatus = arg.slice(5);
    else if (arg === "--force") force = true;
    else slugs.push(arg.replace(/\.md$/, ""));
  }
  if (slugs.length > 1 && STATUSES.includes(slugs.at(-1))) toStatus = slugs.pop();

  if (!slugs.length) usage("no slug given");
  if (!STATUSES.includes(toStatus)) usage(`invalid status "${toStatus}" — must be draft or published`);

  const found = await db.select().from(jobs).where(inArray(jobs.slug, slugs));
  const bySlug = new Map(found.map((j) => [j.slug, j]));

  let changed = 0;
  let failed = 0;

  for (const slug of slugs) {
    const job = bySlug.get(slug);
    if (!job) {
      console.error(`  ✗ ${slug} — not in the database`);
      failed++;
      continue;
    }
    if (job.status === "rejected" && !force) {
      console.error(`  ✗ ${slug} — discarded (${job.rejectedReason}). Use --force to publish anyway.`);
      failed++;
      continue;
    }
    if (job.status === toStatus) {
      console.log(`  · ${slug} — already ${toStatus}`);
      continue;
    }

    await db
      .update(jobs)
      .set({ status: toStatus, updatedAt: sql`now()` })
      .where(eq(jobs.id, job.id));
    await writeProjection({ ...job, status: toStatus });

    console.log(`  ✓ ${slug} → ${toStatus}`);
    changed++;
  }

  console.log(`\n  ${changed} changed${failed ? ` · ${failed} failed` : ""} — rebuild the site to see it.\n`);
  process.exitCode = failed ? 1 : 0;
} finally {
  await client.end();
}
