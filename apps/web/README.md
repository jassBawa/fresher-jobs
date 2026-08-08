# @jobs/web

Static site for the jobs platform. Astro, static export, TypeScript (strict).

## Data source

Reads the ingest pipeline's output: `../ingest/data/drafts/*.md` (a sibling
workspace). Content is wired through `src/content.config.ts`, which validates
each draft's YAML frontmatter against the **shared zod schema** in
`packages/schema` — one contract, enforced in both the writer and the reader.

**Only `status: published` drafts render.** Drafts land `status: draft`; flip
them with the promote script and the next build includes them.

## Commands (from repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | Astro dev server (`apps/web`) |
| `pnpm --filter @jobs/web run build` | Static build to `apps/web/dist/` |
| `pnpm --filter @jobs/web run typecheck` | `astro check` — content + TS typecheck |
| `pnpm run build` / `pnpm run typecheck` | Whole monorepo via turbo |

## The publish loop

```
ingest cron → data/drafts/*.md (status: draft)
   → human runs: pnpm run promote -- <slug>   (apps/ingest script)
   → git push → GH Actions builds → Cloudflare Pages → live
```

The site is only as fresh as the last build — that's a feature at this stage
(immutable, reviewable, rollback-able deploys), and the documented escape hatch
(R2 + thin Worker, on-demand render) exists for when page count outgrows static.

## SEO surface

- `/` — homepage listing published jobs
- `/jobs/[slug]/` — individual listing
- `/sitemap.xml`, `/robots.txt` — auto-generated from published jobs
- Per-page `robots`, `canonical` set in `src/layouts/Base.astro`

**This is the `noindex` surface later.** Per the product strategy (D5), most
individual listings should carry `noindex` and the indexable surface should be
cluster/aggregate pages — not built yet, but the `robots` prop on `Base.astro`
is the hook that will be used for it.

## Deploy config

`.github/workflows/deploy.yml` deploys `apps/web/dist/` to Cloudflare Pages via
wrangler on every push to `main`. Requires repo variables/secrets:

| Key | Type | Value |
|---|---|---|
| `CF_API_TOKEN` | secret | Cloudflare API token with Pages perm |
| `CF_ACCOUNT_ID` | secret | Your Cloudflare account ID |
| `CF_PAGES_PROJECT` | var | Cloudflare Pages project name |
| `SITE_URL` | var | e.g. `https://jobs.example.com` (used for canonicals/sitemap) |