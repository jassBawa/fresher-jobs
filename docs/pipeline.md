# Pipeline

How the current code works, end to end: ingest, review gate, static site.
Nothing is hosted yet — the build produces a `dist/` and stops there.

```
freshersdunia WP API ──► fetch.mjs ──► data/facts/*.json ──► draft.mjs ──► data/drafts/*.md ──► promote ──► apps/web ──► dist/
                        facts only,                        template + prose   status: draft     human      Astro build
                        prose discarded                                                          review
```

Node 22+ (the ingest app alone runs on 20+). The ingest app has **zero npm
dependencies** — built-ins only.

---

## Files

| Path | Role |
|---|---|
| `apps/ingest/src/fetch.mjs` | Reads postings, extracts structured facts, writes `apps/ingest/data/facts/*.json` |
| `apps/ingest/src/draft.mjs` | Renders `apps/ingest/data/drafts/*.md` from facts — templates plus a small LLM call |
| `apps/ingest/src/lib/extract.mjs` | Rule-based pre-extraction: HTML→text, link ranking, batch years |
| `apps/ingest/src/lib/render.mjs` | Templates and frontmatter assembly. Pure — no clock, no I/O |
| `apps/ingest/src/lib/dates.mjs` | Free-text deadline → ISO date |
| `apps/ingest/src/lib/llm.mjs` | Provider-agnostic JSON-mode LLM call. 5 providers, all free-tier or local |
| `apps/ingest/scripts/promote.mjs` | The review gate — flips `status` to published |
| `apps/ingest/data/state.json` | Post IDs already seen, so reruns are incremental |
| `packages/schema/src/index.ts` | The fact/draft contracts: types, zod, JSON Schema |
| `apps/web/src/lib/listings.ts` | Expiry horizon and the D5 indexing gate |
| `apps/web/src/lib/clusters.ts` | Cluster pages — the indexable surface |
| `.github/workflows/ingest.yml` | Daily cron at 07:00 IST, commits new drafts |

## Commands

Run from the repo root.

| Command | Needs a key? |
|---|---|
| `pnpm run fetch` | Yes |
| `pnpm run draft` | Optional |
| `pnpm run ingest` | Yes |
| `pnpm run fetch:dry` | **No** — parses the source and prints findings, writes nothing |
| `pnpm run draft:nollm` | **No** — renders complete drafts from templates alone |
| `pnpm run drafts` | **No** — lists every draft and whether it is live |
| `pnpm run promote <slug>…` | **No** — publishes one or more drafts |
| `pnpm run test` | **No** — 94 tests, no runner, no dependencies |
| `pnpm run build` | **No** — builds the static site into `apps/web/dist/` |

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
applyByDate: "2026-08-31"
applyUrl: "https://careers.wipro.com/job/Graduate-Engineer-Trainee/190712-en_US"
skills: ["Java", "SQL", "Data Structures"]
generatedBy: "llm+template"
createdAt: "2026-08-12T18:02:36.377Z"
postedAt: "2026-08-11"
sourceRef: "https://freshersdunia.in/…"
---
```

**Everything writes as `status: draft`. Nothing self-publishes.**

`lastDateToApply` is whatever the source said; `applyByDate` is that parsed into
a real date, and is absent far more often than not — see the freshness horizon
below. `postedAt` is when the employer announced it, which is what drives both
expiry and JSON-LD `datePosted`.

---

## Stage 3 — the site

`apps/web` is an Astro static build that reads `apps/ingest/data/drafts/*.md` as
a content collection, validated against the shared zod schema, filtered to
`status: published`.

### What gets shown

A listing drops off the site when it expires: on its stated deadline if it has
one, otherwise **60 days after `postedAt`**. The horizon is the load-bearing
rule, not the fallback — of the first 8 postings ingested, **zero** stated a
parseable deadline; four said nothing and four said "ASAP" or "Rolling Basis".
Without it, dead apply links would accumulate forever.

Expired pages keep their URL rather than 404 — inbound links should land
somewhere useful — but they lose the apply button, drop out of every listing and
the sitemap, and say applications have closed.

### What gets indexed

Implementing D5. Individual listings default to `noindex, follow`; one earns
`index, follow` only with a live apply link, model-written prose, and at least
three of salary, batch, location, skills or deadline.

The indexable surface is the cluster pages, generated from one rest route:

| Shape | Example |
|---|---|
| Role family | `/software-engineer-jobs/` |
| City | `/jobs-in-bengaluru/` |
| Role in city | `/software-engineer-jobs-in-bengaluru/` |
| Company | `/wipro-limited-jobs/` |
| Batch year | `/2026-batch-jobs/` |

Under 2 listings a cluster gets no page at all; under 3 it gets a page for
navigation but stays `noindex`. Raw job titles are collapsed into role families
first — "Graduate Engineer Trainee", "Associate Engineer" and "SDE I" are one
intent written three ways. City aliases are merged for the same reason
(Bangalore/Bengaluru was producing two thin pages).

The sitemap lists exactly the pages that are `index, follow` — advertising a URL
and then serving it `noindex` sends two contradictory signals.

Listing pages that clear the gate also carry schema.org `JobPosting` markup.
`baseSalary` is deliberately omitted: the source's figures are estimates marked
"(Expected)", and publishing a guess as structured data is a penalty risk.

---

## LLM layer

`apps/ingest/src/lib/llm.mjs`. Detection order — first key found wins:

| Order | Provider | Default model | Cost |
|---|---|---|---|
| 1 | **Groq** | `llama-3.1-8b-instant` | Free tier, ~500 tok/s |
| 2 | **Cerebras** | `llama3.1-8b` | Free tier, fastest |
| 3 | **Gemini** | `gemini-2.5-flash-lite` | Free tier, strict JSON mode |
| 4 | **OpenRouter** | `llama-3.3-70b-instruct:free` | Free models |
| — | **Ollama** | `qwen2.5:3b` | Local. Opt in with `LLM_PROVIDER=ollama` |

No paid tier. The OpenAI and Anthropic adapters were removed — see D11 and D19.
If every free provider is rate-limited at once the run degrades to
`generatedBy: template`, which is a complete draft, rather than falling through
to something metered.

Everything except Gemini and Anthropic speaks the OpenAI chat-completions shape,
so they share one adapter — adding a provider is one line. Gemini uses its native
API because strict JSON mode is more reliable there.

**Response parsing is defensive**: strips reasoning blocks, strips code fences,
finds the first `{`/`[`, retries once on malformed JSON, and waits out 429s using
the provider's `Retry-After`.

The reasoning-block strip was broken until August — the opening tag in the
pattern had been mangled into a literal `" thinking"`, so a real `<think>` block
was never removed, and any brace inside the model's scratchpad broke the parse.
That is what the qwen3 warning above was about. Fixed, and covered by tests; a
block left unterminated by the token cap now raises rather than being parsed out
of half a thought.

---

## Configuration

All optional except a key. See `apps/ingest/.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` etc. | — | Set one; auto-detected |
| `LLM_PROVIDER` | auto | Force a provider |
| `LLM_MODEL` | per provider | Override the model |
| `MAX_POSTS_PER_RUN` | `15` | Throttle per run |
| `INGEST_DELAY_MS` | `1500` | Minimum gap between model calls |
| `SOURCE_BASE` | `https://freshersdunia.in` | **Any WordPress site with an open REST API** |
| `SITE` | — | Canonical origin for the web build. **Required in CI** |

`SITE_NAME` used to be listed here as "used in the drafting prompt". It never
was — the binding was read from the environment and then never interpolated into
anything. Removed rather than documented.

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
5. **Expiry is a guess for most listings.** The 60-day horizon is a judgement
   call, not a fact about any particular opening. A posting filled in a week
   stays up for eight; one open for six months disappears at two. The real fix
   is checking `applyUrl` for a live requisition — not built.
6. **`locations` mixes cities and states.** The source writes "Maharashtra"
   where it means Pune. Structured data handles it (states go to
   `addressRegion`) but a `/jobs-in-maharashtra/` cluster is still weaker than a
   city page.
7. **Nothing is hosted.** The build produces `apps/web/dist/`; deploy.yml is
   written but the Cloudflare project, secrets and domain do not exist yet.

---

## Not built yet

Ordered by how much they'd matter:

- Hosting: the Cloudflare Pages project, its secrets, and a domain (open D2)
- Verification pass against the official apply page — would fix both limitation
  2 and limitation 5
- Telegram broadcast — free, fully automatable, zero policy risk
- Hindi content layer, the actual wedge (D4)
- Additional sources (Workday, Keka, Greenhouse — all verified, see
  [data-sources.md](./data-sources.md))
