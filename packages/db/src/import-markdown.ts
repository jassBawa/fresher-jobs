/**
 * One-off: move the markdown listings into Postgres.
 *
 * Reads the facts records for the structured fields and the drafts for the
 * generated prose and the published flag, because neither file has all of it —
 * facts have no title, drafts have no requirements or responsibilities.
 *
 * Idempotent: re-running updates by slug rather than duplicating, so it can be
 * run again after a schema change without wiping the review decisions someone
 * already made.
 *
 *   pnpm --filter @jobs/db run import
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { connect } from './client.js';
import { jobs, seenPosts, type NewJob } from './schema.js';
import { slugify, toCities, roleFamily } from './normalize.js';

const ROOT = process.env.INGEST_DATA ?? join(process.cwd(), '..', '..', 'apps', 'ingest', 'data');

/** Minimal YAML reader — the frontmatter this pipeline writes is a flat map of
 *  quoted scalars and JSON arrays, nothing deeper. */
function parseFrontmatter(doc: string): Record<string, unknown> {
	const block = doc.match(/^---\n([\s\S]*?)\n---/);
	if (!block?.[1]) return {};
	const out: Record<string, unknown> = {};
	for (const line of block[1].split('\n')) {
		const m = line.match(/^([a-zA-Z]+):\s*(.*)$/);
		if (!m) continue;
		const [, key, raw] = m;
		if (!key || raw === undefined) continue;
		try {
			out[key] = raw.startsWith('[') || raw.startsWith('"') ? JSON.parse(raw) : raw;
		} catch {
			out[key] = raw;
		}
	}
	return out;
}

/** The body after the frontmatter, minus the trailing newline. */
const bodyOf = (doc: string): string => doc.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

/** The summary is the first paragraph; "About the Role" is its own section. */
function proseFrom(doc: string): { summary: string; about: string | null } {
	const body = bodyOf(doc);
	const summary = (body.split('\n\n')[0] ?? '').trim();
	const about = body.match(/## About the Role\n\n([\s\S]*?)(?:\n\n##|$)/)?.[1]?.trim() ?? null;
	return { summary, about };
}

export async function importMarkdown(): Promise<{ imported: number; published: number }> {
	const { sql: client, db } = connect();
	try {
		const factFiles = (await readdir(join(ROOT, 'facts'))).filter((f) => f.endsWith('.json'));
		const rows: NewJob[] = [];

		for (const file of factFiles) {
			const slug = file.replace(/\.json$/, '');
			const facts = JSON.parse(await readFile(join(ROOT, 'facts', file), 'utf8'));

			let doc = '';
			try {
				doc = await readFile(join(ROOT, 'drafts', `${slug}.md`), 'utf8');
			} catch {
				console.log(`  – skip ${slug} (facts with no draft)`);
				continue;
			}

			const fm = parseFrontmatter(doc);
			const { summary, about } = proseFrom(doc);
			const family = roleFamily(facts.role ?? '', facts.jobType);

			rows.push({
				slug,
				status: fm.status === 'published' ? 'published' : 'draft',
				company: facts.company,
				companySlug: slugify(facts.company ?? ''),
				role: facts.role,
				roleFamily: family?.slug ?? null,
				jobType: facts.jobType ?? null,
				batchYears: facts.batchYears ?? [],
				qualifications: facts.qualifications ?? [],
				experienceRequired: facts.experienceRequired ?? null,
				salary: facts.salary ?? null,
				locations: facts.locations ?? [],
				cities: toCities(facts.locations ?? []),
				lastDateToApply: facts.lastDateToApply ?? null,
				applyByDate: facts.applyByDate ?? null,
				applyUrl: facts.applyUrl ?? null,
				skills: facts.skills ?? [],
				requirements: facts.requirements ?? [],
				responsibilities: facts.responsibilities ?? [],
				title: String(fm.title ?? `${facts.company} ${facts.role}`),
				description: String(fm.description ?? ''),
				summary,
				about,
				generatedBy: fm.generatedBy === 'template' ? 'template' : 'llm+template',
				sourceRef: facts.discoveredVia ?? null,
				postedAt: (fm.postedAt as string) ?? null,
			});
		}

		for (const row of rows) {
			await db
				.insert(jobs)
				.values(row)
				.onConflictDoUpdate({
					target: jobs.slug,
					// Everything except status: a human already made that call and an
					// import must not silently unpublish their work.
					set: {
						company: row.company,
						companySlug: row.companySlug,
						role: row.role,
						roleFamily: row.roleFamily,
						jobType: row.jobType,
						batchYears: row.batchYears,
						qualifications: row.qualifications,
						experienceRequired: row.experienceRequired,
						salary: row.salary,
						locations: row.locations,
						cities: row.cities,
						lastDateToApply: row.lastDateToApply,
						applyByDate: row.applyByDate,
						applyUrl: row.applyUrl,
						skills: row.skills,
						requirements: row.requirements,
						responsibilities: row.responsibilities,
						title: row.title,
						description: row.description,
						summary: row.summary,
						about: row.about,
						generatedBy: row.generatedBy,
						sourceRef: row.sourceRef,
						postedAt: row.postedAt,
						updatedAt: sql`now()`,
					},
				});
		}

		// state.json → seen_posts, so the first DB-backed run does not re-ingest
		// everything the file pipeline had already processed.
		try {
			const state = JSON.parse(await readFile(join(ROOT, 'state.json'), 'utf8'));
			const source = process.env.SOURCE_BASE || 'https://freshersdunia.in';
			const seen = (state.seen ?? []).map((id: number | string) => ({
				source,
				externalId: String(id),
			}));
			if (seen.length) await db.insert(seenPosts).values(seen).onConflictDoNothing();
			console.log(`  ${seen.length} seen post ids carried over`);
		} catch {
			console.log('  no state.json to carry over');
		}

		const published = rows.filter((r) => r.status === 'published').length;
		return { imported: rows.length, published };
	} finally {
		await client.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { imported, published } = await importMarkdown();
	console.log(`\n  ${imported} listings imported · ${published} published\n`);
}
