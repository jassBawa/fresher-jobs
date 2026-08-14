// Postgres → markdown.
//
// The database is the source of truth; these files are a projection of it.
//
// Two reasons they still exist. The site reads them today, and will until it is
// ported. And the drafts were always meant to be portable — a directory of
// markdown with YAML frontmatter moves to WordPress, Next.js or anything else,
// which a Postgres table does not. Keeping the export means the data is never
// trapped in this schema.
//
// Rejected listings are never written. Files for listings that no longer exist
// in the database are removed, so a discard actually disappears from the site
// rather than lingering because nothing deleted it.

import { readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { connect, jobs, ne } from "@jobs/db";
import { buildDraft } from "../src/lib/render.mjs";

const DRAFTS_DIR = "data/drafts";

async function main() {
  const { sql: client, db } = connect();
  try {
    await mkdir(DRAFTS_DIR, { recursive: true });

    // Everything except rejections — drafts included, since the review gate
    // works by reading them.
    const rows = await db.select().from(jobs).where(ne(jobs.status, "rejected"));

    let written = 0;
    for (const job of rows) {
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
      written++;
    }

    // Anything on disk the database no longer has, or has rejected.
    const live = new Set(rows.map((r) => `${r.slug}.md`));
    const onDisk = (await readdir(DRAFTS_DIR)).filter((f) => f.endsWith(".md"));
    let removed = 0;
    for (const file of onDisk) {
      if (!live.has(file)) {
        await rm(`${DRAFTS_DIR}/${file}`);
        console.log(`  – removed ${file} (not in the database)`);
        removed++;
      }
    }

    const published = rows.filter((r) => r.status === "published").length;
    console.log(
      `\n  ${written} written · ${removed} removed · ${published} published · ${written - published} draft\n`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
