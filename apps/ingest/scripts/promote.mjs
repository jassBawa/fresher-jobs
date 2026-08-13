// Promote drafts to published (or pull them back) by flipping frontmatter
// `status`. This is the review-before-ship gate: drafts land `status: draft`, a
// human runs this, and the site only surfaces `status: published`.
//
// Usage:
//   node scripts/promote.mjs --list                 show every draft and its status
//   node scripts/promote.mjs <slug> [<slug>...]     publish one or more
//   node scripts/promote.mjs <slug> draft           pull one back
//   node scripts/promote.mjs <slug>... --to draft   same, for several
//
// Only the `status` line is rewritten; nothing else in the file is touched.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const DRAFTS_DIR = join(process.cwd(), "data", "drafts");
const STATUSES = ["draft", "published"];

const argv = process.argv.slice(2);

function usage(message) {
  if (message) console.error(`\n  ✗ ${message}`);
  console.error(`
  usage: node scripts/promote.mjs --list
         node scripts/promote.mjs <slug> [<slug>...] [--to draft|published]
`);
  process.exit(1);
}

/** Read every draft's slug and current status. */
async function readAll() {
  let files;
  try {
    files = (await readdir(DRAFTS_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    usage(`no drafts directory at ${DRAFTS_DIR} — run "pnpm run ingest" first`);
  }

  return Promise.all(
    files.sort().map(async (file) => {
      const doc = await readFile(join(DRAFTS_DIR, file), "utf8");
      return {
        slug: file.replace(/\.md$/, ""),
        status: doc.match(/^status:\s*(draft|published)/m)?.[1] ?? "?",
        title: doc.match(/^title:\s*"?(.*?)"?$/m)?.[1] ?? "",
      };
    })
  );
}

if (argv.includes("--list") || argv.includes("-l")) {
  const all = await readAll();
  const published = all.filter((d) => d.status === "published").length;
  console.log();
  for (const { slug, status, title } of all) {
    const mark = status === "published" ? "●" : "○";
    console.log(`  ${mark} ${status.padEnd(9)} ${slug}`);
    if (title) console.log(`              ${title.slice(0, 70)}`);
  }
  console.log(`\n  ${published} published · ${all.length - published} draft · ${all.length} total\n`);
  process.exit(0);
}

// --to published | --to=published, else a trailing bare status (legacy form).
let toStatus = "published";
const args = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--to") {
    toStatus = argv[++i];
  } else if (arg.startsWith("--to=")) {
    toStatus = arg.slice(5);
  } else {
    args.push(arg);
  }
}
if (args.length > 1 && STATUSES.includes(args.at(-1))) toStatus = args.pop();

if (!args.length) usage("no slug given");
if (!STATUSES.includes(toStatus)) usage(`invalid status "${toStatus}" — must be draft or published`);

let changed = 0;
let failed = 0;

for (const raw of args) {
  const slug = raw.replace(/\.md$/, "");
  const target = join(DRAFTS_DIR, `${slug}.md`);

  let doc;
  try {
    doc = await readFile(target, "utf8");
  } catch {
    console.error(`  ✗ ${slug} — no draft at data/drafts/${slug}.md`);
    failed++;
    continue;
  }

  const block = doc.match(/^---\n([\s\S]*?)\n---/);
  if (!block) {
    console.error(`  ✗ ${slug} — no frontmatter`);
    failed++;
    continue;
  }

  const current = block[1].match(/^status:\s*(draft|published)/m)?.[1];
  if (!current) {
    console.error(`  ✗ ${slug} — no status field in frontmatter`);
    failed++;
    continue;
  }

  if (current === toStatus) {
    console.log(`  · ${slug} — already ${toStatus}`);
    continue;
  }

  // Rewrite inside the frontmatter block only, so a "status:" line occurring in
  // the body cannot be hit.
  const nextBlock = block[1].replace(/^status:\s*(draft|published)/m, `status: ${toStatus}`);
  await writeFile(target, doc.replace(block[1], nextBlock));
  console.log(`  ✓ ${slug} → ${toStatus}`);
  changed++;
}

console.log(
  `\n  ${changed} changed${failed ? ` · ${failed} failed` : ""} — rebuild the site to publish.\n`
);
process.exit(failed ? 1 : 0);
