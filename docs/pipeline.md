# Pipeline

How the current code works. This is the only thing built so far — there is no
site, no database and no hosting yet.

```
freshersdunia WP API ──► apps/ingest/src/fetch.mjs ──► apps/ingest/data/facts/*.json ──► apps/ingest/src/draft.mjs ──► apps/ingest/data/drafts/*.md
                        facts only,                            template + prose          status: draft
                        prose discarded
```

Node 20+. **Zero npm dependencies** — built-ins only.

---

## Files

| Path | Role |
|---|---|
| `apps/ingest/src/fetch.mjs` | Reads postings, extracts structured facts, writes `apps/ingest/data/facts/*.json` |
| `apps/ingest/src/draft.mjs` | Renders `apps/ingest/data/drafts/*.md` from facts — templates plus a small LLM call |
| `apps/ingest/src/lib/llm.mjs` | Provider-agnostic JSON-mode LLM call. 7 providers, one adapter for most |
| `apps/ingest/data/state.json` | Post IDs already seen, so reruns are incremental |
| `.github/workflows/ingest.yml` | Daily cron at 07:00 IST, commits new drafts |

## Commands

| Command | Needs a key? |
|---|---|
| `pnpm run fetch` | Yes |
| `pnpm run draft` | Optional |
| `pnpm run ingest` | Yes |
| `pnpm run fetch:dry` | **No** — parses the source and prints findings, writes nothing |
| `pnpm run draft:nollm` | **No** — renders complete drafts from templates alone |

---

## Stage 1 — `fetch.mjs`

### 1. Read

`GET {SOURCE_BASE}/wp-json/wp/v2/posts?per_page=30&orderby=date&order=desc&_fields=id,slug,link,date,title,content`

Filters against `apps/ingest/data/state.json`, takes up to `MAX_POSTS_PER_RUN` (default 15).

### 2. Deterministic pre-extraction (`preExtract`, no LLM)

- **Strip HTML** → plain text, capped at **6,000 chars** (`fetch.mjs:115`)
- **Extract outbound links**, decode `&amp;`, drop the source's own domain and
  social/sharing hosts
- **Rank links** so a real requisition page beats a bare homepage:

  | Signal | Score |
  |---|---|
  | Known ATS host (greenhouse, lever, workday, eightfold, oraclecloud, keka…) | +100 |
  | Path looks like a job detail (`/job/`, `jobdetail`, `requisition`, `/apply`) | +40 |
  | `careers.` subdomain | +20 |
  | Has a query string | +5 |
  | **Bare homepage** (empty path) | **−60** |

- **Strip tracking params** (`utm_*`, `fbclid`, `gclid`, `ref`) and drop
  `google.com/search` redirects — the source leaves both behind
- **Pull batch years** by regex as a fallback

This step alone turned `https://www.wipro.com/` into
`https://careers.wipro.com/job/Graduate-Engineer-Trainee/190712-en_US`.

### 3. Fact extraction (one LLM call)

The prompt at `fetch.mjs:120` is a **parser, not a writer**:

> "Output FACTS, never the source's sentences… Every string must be a short atomic
> fact (a name, a number, a date, a qualification), not a rewritten sentence."

Returns strict JSON: `company`, `role`, `jobType`, `batchYears`, `qualifications`,
`experienceRequired`, `salary`, `locations`, `lastDateToApply`, `applyUrl`,
`skills`, `requirements`, `responsibilities`, `isValid`.

`isValid: false` filters out results pages, admit cards and generic articles.

### 4. Persist facts only

The record written to `apps/ingest/data/facts/{slug}.json` contains **no prose field**. The
source text goes out of scope and is garbage collected. Provenance is kept as
`discoveredVia` — a citation, not content.

---

## Stage 2 — `draft.mjs`

Reads **only** the facts file. It has no access to the source text, so its output
is generated from structured data rather than rewritten from an article.

### Template vs model

A template restates structured data more accurately than a model does, and costs
nothing. So the split is:

| Part of the page | Produced by |
|---|---|
| Quick-facts table, Who Can Apply, What You Need, What You'll Do, How to Apply, all frontmatter | **Template** — deterministic, free |
| `title`, `description`, 2-sentence summary, one "About the Role" paragraph | **Model** — ~150 output tokens, capped at 400 |

If the model call fails, the draft is still written from templates and tagged
`generatedBy: template`. **The pipeline never hard-fails on a bad LLM response.**

### Output

Markdown with YAML frontmatter — portable to WordPress, Next.js, Astro, anything:

```markdown
---
title: "Wipro Graduate Engineer Trainee 2026"
description: "Wipro is hiring for Graduate Engineer Trainee in Bengaluru, Pune…"
slug: "wipro-graduate-engineer-trainee"
status: draft
company: "Wipro"
role: "Graduate Engineer Trainee"
batchYears: ["2024", "2025", "2026"]
locations: ["Bengaluru", "Pune"]
salary: "3.5 LPA"
lastDateToApply: "31 August 2026"
applyUrl: "https://careers.wipro.com/job/Graduate-Engineer-Trainee/190712-en_US"
skills: ["Java", "SQL", "Data Structures"]
generatedBy: "llm+template"
sourceRef: "https://freshersdunia.in/…"
---
```

**Everything writes as `status: draft`. Nothing self-publishes.**

---

## LLM layer

`apps/ingest/src/lib/llm.mjs`. Detection order — first key found wins:

| Order | Provider | Default model | Cost |
|---|---|---|---|
| 1 | **Groq** | `llama-3.1-8b-instant` | Free tier, ~500 tok/s |
| 2 | **Cerebras** | `llama3.1-8b` | Free tier, fastest |
| 3 | **Gemini** | `gemini-2.5-flash-lite` | Free tier, strict JSON mode |
| 4 | **OpenRouter** | `llama-3.3-70b-instruct:free` | Free models |
| — | **Ollama** | `qwen2.5:3b` | Local. Opt in with `LLM_PROVIDER=ollama`. Non-reasoning model — qwen3's thinking blocks break strict JSON |
| 5 | OpenAI | `gpt-5-nano` | Paid |
| 6 | Anthropic | `claude-haiku-4-5-20251001` | Paid |

Everything except Gemini and Anthropic speaks the OpenAI chat-completions shape,
so they share one adapter — adding a provider is one line. Gemini uses its native
API because strict JSON mode is more reliable there.

**Response parsing is defensive**: strips code fences, strips `<think>` blocks
(small models emit them), finds the first `{`/`[`, retries once on malformed JSON.

---

## Configuration

All optional except a key. See `apps/ingest/.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` etc. | — | Set one; auto-detected |
| `LLM_PROVIDER` | auto | Force a provider |
| `LLM_MODEL` | per provider | Override the model |
| `MAX_POSTS_PER_RUN` | `15` | Throttle per run |
| `SITE_NAME` | `Your Jobs Site` | Used in the drafting prompt |
| `SOURCE_BASE` | `https://freshersdunia.in` | **Any WordPress site with an open REST API** |

---

## Known limitations

1. **6,000-char cap** (`fetch.mjs:115`). Long postings get truncated, so a deadline
   at the bottom can be missed. Raise it if fields come back null.
2. **Facts inherit source errors.** If the source gets a batch year wrong, so do
   you. The fix is a verification pass against `applyUrl` — not built.
3. **Single source.** `SOURCE_BASE` handles any WordPress site, but non-WordPress
   sources need a new adapter returning
   `{ id, slug, link, date, title: {rendered}, content: {rendered} }`.
4. **No dedupe across runs** beyond post ID. Two sources covering the same job
   would produce two drafts. See the dedupe cascade in
   [data-sources.md](./data-sources.md#7-deduplication).
5. **No publish step.** Drafts sit on disk.

---

## Not built yet

Ordered by how much they'd matter:

- Publish target (WordPress REST, or a static site)
- Telegram broadcast — free, fully automatable, zero policy risk
- Verification pass against the official apply page
- Expiry handling (`validThrough`, 410 for dead listings)
- Cluster/aggregate pages — the actual SEO surface, see
  [product-strategy.md](./product-strategy.md#31-the-single-most-important-design-decision)
- Additional sources (Workday, Keka, Greenhouse — all verified, see
  [data-sources.md](./data-sources.md))
