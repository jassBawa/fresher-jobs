# fresher-jobs

Fetches job postings, extracts the **facts**, writes original draft posts, and
builds a static site from the ones a human approves.

> **Research, strategy and decisions live in [`docs/`](./docs).** Start at
> [docs/README.md](./docs/README.md) — it has a 60-second summary and an index.
> If you're wondering *why* something is built this way, it's in
> [docs/decisions.md](./docs/decisions.md).

No database. The ingest app has zero npm dependencies; the site is Astro and
nothing else.

```
source posts ──► fetch.mjs ──► data/facts/*.json ──► draft.mjs ──► data/drafts/*.md ──► promote ──► apps/web ──► dist/
                (facts only)                        (original prose)  status: draft     human       Astro build
                                                                                        review
```

## Structure

```
fresher-jobs/                pnpm + Turborepo monorepo
├── apps/ingest/             the ingest pipeline (@jobs/ingest)
│   ├── src/fetch.mjs        pulls facts from the source, writes data/facts/
│   ├── src/draft.mjs        turns each facts file into a draft in data/drafts/
│   ├── src/lib/             llm providers, extraction, templates, date parsing
│   ├── scripts/promote.mjs  the review gate — flips status to published
│   ├── test/                94 tests, node:test, no runner
│   └── data/                facts/, drafts/, state.json
├── apps/web/                static site (@jobs/web) — listings, clusters, sitemap
├── packages/schema/         shared types + JSON Schema + zod (@jobs/schema)
├── docs/                    research, strategy, decisions
└── package.json             root scripts
```

## Setup

```bash
pnpm install                                    # root only
cp apps/ingest/.env.example apps/ingest/.env    # add one API key
pnpm run ingest                                 # fetch + draft
pnpm run drafts                                 # see what came back
pnpm run promote <slug>                         # publish the good ones
pnpm run build                                  # build the site
```

Node 22+ (the ingest app alone runs on 20+). Only the monorepo root needs
`pnpm install` — `apps/ingest/` has no npm dependencies of its own.

## Commands

Run from the repo root.

| Command | What it does |
|---|---|
| `pnpm run fetch` | Reads new postings, extracts structured facts to `apps/ingest/data/facts/` |
| `pnpm run draft` | Turns each facts file into an original post in `apps/ingest/data/drafts/` |
| `pnpm run ingest` | Both, in order |
| `pnpm run drafts` | Lists every draft and whether it is live. **No key needed** |
| `pnpm run promote <slug>…` | Publishes one or more drafts. Add `draft` to pull one back |
| `pnpm run build` | Builds the static site into `apps/web/dist/` |
| `pnpm run test` | 94 tests. No runner, no dependencies |
| `pnpm run typecheck` | `tsc` + `astro check` |
| `pnpm run fetch:dry` | Parses the source and prints what it found. **No API key, writes nothing.** Use it to check the source is reachable |
| `pnpm run draft:nollm` | Renders drafts from templates alone. **No API key, no cost** |

## How little the model actually does

The page is mostly rendered from templates, because a template restates
structured data more accurately than a model does — and costs nothing. The model
is asked for one small JSON object of connective prose, capped at 400 tokens:

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
| **Ollama** | `qwen2.5:3b` | Local. No key, no cost, no rate limit. `LLM_PROVIDER=ollama` |

There is no paid tier at all. Metered frontier models cost ~30× more here for
output that is actually worse, and leaving them wired up meant a stray key in
the environment could quietly start billing. Driving a local coding-agent CLI
was measured too and came out worse still — see [D19 and D21](./docs/decisions.md).

At 25 postings/day this runs comfortably inside a free tier. A larger model buys
you nothing here — longer, more florid copy is a downgrade on a page whose only
job is answering "can I apply, yes or no".

Reasoning models are handled: `<think>` blocks are stripped before parsing, and a
block truncated by the token cap raises rather than being parsed out of half a
thought.

## How the facts-only rule is enforced

The source site's `robots.txt` sets `Content-Signal: ai-train=no, use=reference`
and disallows AI crawlers. So the pipeline uses the source as a **discovery
signal**, not as content:

- `fetch.mjs` holds the source article in memory only long enough to pull
  structured fields out of it. **The prose is never written to disk.**
- `data/facts/*.json` contains only facts — company, role, batch years,
  qualifications, salary, deadline, apply URL — plus a `discoveredVia` link as
  provenance.
- `draft.mjs` never sees the source text. It only reads the facts file, so the
  prose it writes is generated from structured data rather than rewritten from
  anyone's article. A test asserts that a field the renderer doesn't know about
  cannot reach the output.

Facts aren't copyrightable; expression is. This keeps you on the right side of
that line without slowing anything down.

## The review gate

**Everything is written as `status: draft`.** Nothing publishes itself.
`pnpm run promote <slug>` is the only thing that flips a listing live, and the
site only renders `status: published`.

## The site

`apps/web` builds a static site from the published drafts.

**Listings expire.** On their stated deadline where there is one, otherwise 60
days after posting. That fallback is the load-bearing rule, not the edge case —
of the first 8 postings ingested, zero stated a parseable deadline. Expired pages
keep their URL but lose the apply button and drop out of every index.

**Most listings are `noindex`.** A page restating a scraped requisition adds
tokens, not information, which is the pattern Google's spam policy names. A
listing is indexed only with a live apply link, model-written prose, and at least
three of salary, batch, location, skills or deadline.

**Cluster pages are the indexable surface** — `/software-engineer-jobs/`,
`/jobs-in-bengaluru/`, `/software-engineer-jobs-in-bengaluru/`,
`/wipro-limited-jobs/`, `/2026-batch-jobs/`. Under 3 listings they stay
`noindex` too. The sitemap lists exactly what is indexable and nothing else.

Indexable listings also carry schema.org `JobPosting` markup — without
`baseSalary`, because the source's figures are estimates marked "(Expected)" and
publishing a guess as structured data is a penalty risk.

The reasoning for all of this is [D5, D14–D16](./docs/decisions.md).

## Configuration

All optional except a key, all in `apps/ingest/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` / `GEMINI_API_KEY` / … | — | Set one. Auto-detected |
| `LLM_PROVIDER` | auto | Force a provider |
| `LLM_MODEL` | per provider | Override the model |
| `MAX_POSTS_PER_RUN` | `15` | Throttle per run |
| `INGEST_DELAY_MS` | `1500` | Minimum gap between model calls |
| `SOURCE_BASE` | `https://freshersdunia.in` | Any WordPress site with an open REST API |
| `SITE` | — | Canonical origin for the site build. **Required in CI** — the build fails rather than shipping the wrong domain |

`apps/ingest/data/state.json` tracks which posts have been seen, so reruns are
incremental and cheap.

## Running it on a schedule

Everything runs on your machine. There is no CI, no hosted cron and no
automation on GitHub — the repo is there to hold the code, nothing more.

`pnpm run daily` is the scheduled entry point: it fetches, drafts, logs to
`logs/`, and prunes logs older than a fortnight. Nothing publishes itself.

**launchd (macOS, preferred)** — runs a missed job when the machine next wakes,
where cron just skips it:

```bash
sed -i '' "s|__REPO__|$PWD|g" scripts/com.fresherjobs.ingest.plist
cp scripts/com.fresherjobs.ingest.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.fresherjobs.ingest.plist
launchctl start com.fresherjobs.ingest     # run it now to check
```

**cron**, if you prefer:

```
0 7 * * *  /path/to/fresher-jobs/scripts/daily.sh
```

Either way the job runs with a near-empty PATH, which is the usual reason a
scheduled task works by hand and silently does nothing overnight.
`scripts/daily.sh` sets PATH up front and fails loudly if `pnpm` is still
missing.

## Checking your work

`pnpm run check` runs build, typecheck and tests together — what a CI pipeline
would have run, on your machine, before you commit.

## Publishing the site

The build writes a plain static directory to `apps/web/dist/` — no server, no
runtime, no platform assumed:

```bash
SITE=https://your-domain.example pnpm run build
```

`SITE` is the canonical origin. Every canonical tag, the sitemap and robots.txt
derive from it, so the build refuses to run without it under `CI=1` rather than
silently shipping the wrong domain. Locally it falls back to
`http://localhost:4321`.

From there `dist/` can be dropped anywhere that serves files — Cloudflare Pages,
Netlify, a VPS, `python3 -m http.server` for a look. Cloudflare remains the
recommendation on cost grounds (zero egress, free unlimited static requests;
Vercel's Hobby tier bans AdSense by name) — see [D6](./docs/decisions.md) — but
nothing in the repo is wired to it, and no deploy runs automatically.

Preview the built site locally:

```bash
pnpm --filter @jobs/web run preview
```

## Adding sources later

`fetch.mjs` targets the WordPress REST API, so any WordPress site works by
changing `SOURCE_BASE`. For non-WordPress sources, add an adapter returning
`{ id, slug, link, date, title: {rendered}, content: {rendered} }` and the rest
of the pipeline is unchanged.
