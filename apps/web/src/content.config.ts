import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { draftFrontmatterSchema } from '@jobs/schema';

// Content source is the ingest pipeline's output: apps/ingest/data/drafts/*.md
// Each draft is a markdown file whose YAML frontmatter is validated against the
// zod schema shared with the ingest pipeline (@jobs/schema) — one source of
// truth for the frontmatter contract. A draft only appears on the site once its
// frontmatter `status` is flipped to "published".
const jobs = defineCollection({
	loader: glob({
		base: '../ingest/data/drafts',
		pattern: '**/*.md',
	}),
	schema: draftFrontmatterSchema,
});

export const collections = { jobs };