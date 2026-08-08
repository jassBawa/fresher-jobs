// Promote a draft to published (or unpublish) by flipping its frontmatter
// `status`. This is the review-before-ship gate: drafts land `status: draft`,
// a human runs this script, and the site only surfaces `status: published`.
//
// Usage:
//   node scripts/promote.mjs <slug> [draft|published]
//
// Running with no trailing arg publishes. Use "draft" to pull a live post back.
//
// Enforces: frontmatter must already be YAML; only the `status` line changes.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const DRAFTS_DIR = join(process.cwd(), "data", "drafts");

if (process.argv.length < 3 || !process.argv[2]) {
  console.error("usage: node scripts/promote.mjs <slug> [draft|published]");
  process.exit(1);
}

const slug = process.argv[2].replace(/\.md$/, "");
const toStatus = process.argv[3] || "published";
if (!["draft", "published"].includes(toStatus)) {
  console.error(`invalid status "${toStatus}" — must be draft or published`);
  process.exit(1);
}

const target = join(DRAFTS_DIR, `${slug}.md`);

let doc;
try {
  doc = await readFile(target, "utf8");
} catch {
  console.error(`no draft at data/drafts/${slug}.md`);
  process.exit(1);
}

const m = doc.match(/^---\n([\s\S]*?)\n---/);
if (!m) {
  console.error(`no frontmatter in data/drafts/${slug}.md`);
  process.exit(1);
}

let fm = m[1];
if (!/^status:\s*(draft|published)/m.test(fm)) {
  console.error(`no status field in frontmatter of data/drafts/${slug}.md`);
  process.exit(1);
}

fm = fm.replace(/^status:\s*(draft|published)/m, `status: ${toStatus}`);
const next = doc.replace(m[1], fm);

await writeFile(target, next);
console.log(`${slug} → status: ${toStatus}`);
console.log(`rerun "pnpm --filter @jobs/web run build" to publish it on the site.`);