# jobs-ingest

Fetches job postings, extracts the **facts**, and writes original draft posts.

> **Research, strategy and decisions live in [`docs/`](./docs).** Start at
> [docs/README.md](./docs/README.md) — it has a 60-second summary and an index.
> If you're wondering *why* something is built this way, it's in
> [docs/decisions.md](./docs/decisions.md).

Two stages, two commands. No database, no framework. The ingest app itself has zero npm dependencies.

```
source posts ──► apps/ingest/src/fetch.mjs ──► apps/ingest/data/facts/*.json ──► apps/ingest/src/draft.mjs ──► apps/ingest/data/drafts/*.md
                (facts only)                                                 (original prose)                status: draft
```

## Structure

```
blogging/                    pnpm + Turborepo monorepo
├── apps/ingest/             the ingest pipeline (@jobs/ingest)
│   ├── src/fetch.mjs        pulls facts from the source, writes data/facts/
│   ├── src/draft.mjs        turns each facts file into a draft in data/drafts/
│   ├── src/lib/llm.mjs      model provider selection
│   ├── scripts/promote.mjs  flips a draft's status to published
│   └── data/                facts/, drafts/, state.json
├── apps/web/                static site (@jobs/web) — home, /jobs/[slug], sitemap
├── packages/schema/         shared TypeScript types + JSON Schema + zod (@jobs/schema)
├── docs/                    research, strategy, decisions
└── package.json             root scripts (turbo, typescript as devDependencies)
```

## Setup

```bash
pnpm install            # installs turbo + typescript at the root
cp apps/ingest/.env.example apps/ingest/.env   # add one API key
pnpm run ingest         # fetch + draft
```

Node 20+. The ingest app (`apps/ingest/`) has no npm dependencies to install — only the monorepo root needs `pnpm install`.

## Commands

Run from the repo root. Each maps to a script on `@jobs/ingest`:

| Command | What it does |
|---|---|
| `pnpm run fetch` | Reads new postings, extracts structured facts to `apps/ingest/data/facts/` |
| `pnpm run draft` | Turns each facts file into an original post in `apps/ingest/data/drafts/` |
| `pnpm run ingest` | Both, in order |
| `pnpm run fetch:dry` | Parses the source and prints what it found. **No API key needed, writes nothing.** Use this to check the source is reachable. |
| `pnpm run draft:nollm` | Renders drafts from templates alone. **No API key, no cost.** |

## How little the model actually does

The page is mostly rendered from templates, because a template restates structured
data more accurately than a model does — and costs nothing. The model is asked for
one small JSON object of connective prose, capped at 400 tokens:

| Part of the page | Produced by |
|---|---|
| Quick-facts table, Who Can Apply, What You Need, What You'll Do, How to Apply, all frontmatter | **Template** — deterministic, free |
| `title`, `description`, 2-sentence summary, one "About the Role" paragraph | **Model** — ~150 output tokens |

If the model call fails, the draft is still written from templates and marked
`generatedBy: template`. The pipeline never hard-fails on a bad LLM response.

## Choosing a model

Ordered cheapest and fastest first; the first key found wins.

| Provider | Default model | Notes |
|---|---|---|
| **Groq** | `llama-3.1-8b-instant` | Free tier, ~500 tok/s. Best default. |
| **Cerebras** | `llama3.1-8b` | Free tier, fastest available |
| **Gemini** | `gemini-2.5-flash-lite` | Free tier, strict JSON mode |
| **OpenRouter** | `llama-3.3-70b-instruct:free` | Genuinely free models |
| **Ollama** | `qwen2.5:3b` | Local. No key, no cost, no rate limit. Set `LLM_PROVIDER=ollama`. Use qwen2.5 (not qwen3 — its thinking blocks break strict JSON) |
| OpenAI / Anthropic | `gpt-5-nano` / `claude-haiku-4-5` | Paid fallbacks |

At 25 postings/day this runs comfortably inside a free tier. A larger model buys
you nothing here — longer, more florid copy is a downgrade on a page whose only
job is answering "can I apply, yes or no".

## How the facts-only rule is enforced

The source site's `robots.txt` sets `Content-Signal: ai-train=no, use=reference` and disallows AI crawlers. So the pipeline is built to use the source as a **discovery signal**, not as content:

- `apps/ingest/src/fetch.mjs` holds the source article in memory only long enough to pull structured fields out of it. **The prose is never written to disk.**
- `apps/ingest/data/facts/*.json` contains only facts — company, role, batch years, qualifications, salary, deadline, apply URL — plus a `discoveredVia` link as provenance.
- `apps/ingest/src/draft.mjs` never sees the source text. It only reads the facts file, so the prose it writes is generated from structured data rather than rewritten from anyone's article.

Facts aren't copyrightable; expression is. This keeps you on the right side of that line without slowing anything down.

## Output

Each draft is markdown with YAML frontmatter, portable to WordPress, Next.js, Astro or anything else:

```markdown
---
title: "Wipro Off Campus 2026 — Graduate Engineer Trainee"
description: "Wipro is hiring Graduate Engineer Trainees for 2024–2026 batches..."
slug: "wipro-graduate-engineer-trainee"
status: draft
company: "Wipro"
role: "Graduate Engineer Trainee"
batchYears: ["2024", "2025", "2026"]
locations: ["Bengaluru"]
applyUrl: "https://careers.wipro.com/job/..."
sourceRef: "https://..."
---
```

**Everything is written as `status: draft`.** Nothing publishes itself — review before you ship.

## Configuration

All optional, all in `apps/ingest/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | — | Set one. Auto-detected. |
| `LLM_PROVIDER` | auto | Force `gemini`, `anthropic` or `openai` |
| `LLM_MODEL` | per provider | Override the model |
| `MAX_POSTS_PER_RUN` | `15` | Throttle per run |
| `SITE_NAME` | `Your Jobs Site` | Used in the drafting prompt |
| `SOURCE_BASE` | `https://freshersdunia.in` | Any WordPress site with an open REST API |

`apps/ingest/data/state.json` tracks which posts have been seen, so reruns are incremental and cheap.

## Running on a schedule

`.github/workflows/ingest.yml` runs daily at 07:00 IST and commits new drafts back to the repo. Add your API key under **Settings → Secrets and variables → Actions**. The workflow installs with pnpm and runs the root scripts.

To run locally instead:

```
30 1 * * *  cd /path/to/blogging && pnpm run ingest
```

## Adding sources later

`apps/ingest/src/fetch.mjs` targets the WordPress REST API, so any WordPress site works by changing `SOURCE_BASE`. For non-WordPress sources, add an adapter that returns `{ id, slug, link, date, title: {rendered}, content: {rendered} }` and the rest of the pipeline is unchanged.
