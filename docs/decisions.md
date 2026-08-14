# Decision log

What was chosen, what was rejected, and why. Newest last.

---

## D1 — Target segment: IT/tech + blue-collar, not tech alone

**Decision.** Cover both, with blue-collar as the volume engine.

**Why.** Tech-only gives an audience that blocks ads and doesn't click them —
which is precisely why every India tech board sells to employers instead.
Blue-collar/entry-level is demographically the same audience that makes sarkari
sites work on AdSense: high volume, mobile-first, low ad-blocker usage.

**Caveat found later.** Blue-collar *boards* also run zero ads (see D3). The
segment is right; the format is what matters.

---

## D2 — Two domains, not one

**Decision.** Blue-collar/vernacular content on Domain A (build first). IT/tech on
Domain B (month 6+), monetized employer-side.

**Why.** **Info Edge — India's most sophisticated job-board operator — runs
Naukri, FirstNaukri and Jobhai as three separate domains.** They had every
incentive to consolidate onto Naukri's authority and deliberately didn't. No
example was found, successful or failed, of an Indian site combining IT and
blue-collar with display ads.

Reasons ranked by real impact:

1. **RPM blending**, and it runs counter to intuition — the ad engine is the
   vernacular content, not the tech content.
2. **Topical authority.** Both AdSense winners are monomaniacally focused.
3. **Language architecture.** A Hindi-first domain can own `hi-IN`, which no
   incumbent declares. One domain forces awkward `hreflang`.

**Rejected:** single domain covering both.

---

## D3 — Revenue model inverted: employer-paid first, ads later

**Decision.** AdSense stays in the plan but becomes the margin topper, not the
model. Employer-paid featured listings come first.

**Why.** Twelve job boards inspected by HTML grep — **twelve run zero display
ads.** Google's own calculator dataset puts `Jobs & Education` at **$1.69 page RPM
in APAC**, 20th of 25 categories, with the steepest regional discount of any
category. India sits below that. ₹50,000/month needs ~1.1M pageviews.

Meanwhile: **4 featured listings at ₹2,500 = ₹10,000 in 2–4 weeks, with no website
at all** — and it answers "will employers pay?" before a year is spent on SEO.

**Rejected:** AdSense-first. Seven well-capitalized operators independently
concluded display doesn't pay in this vertical; the RPM data explains why.

---

## D4 — The wedge is Hindi content, not more listings

**Decision.** The differentiating content layer is Hindi/Hinglish informational
content, targeting `kaise` questions, the `-female` segment, and hyper-specific
qualifiers.

**Why.** Verified demand via Google autocomplete (`gl=in`), and verified zero
supply: apna.co declares `en-IN` only with **0 Devanagari characters**; WorkIndia
has neither; FreeJobAlert has **0 Devanagari URLs in 13,829 sampled**. Not one
incumbent serves a single Hindi page.

Informational intent is also the **only AdSense-compatible surface** — a listing
page sends the user away, an answer page holds them.

---

## D5 — Index cluster pages, `noindex` most job pages

**Decision.** `noindex` 60–80% of individual listings. Cluster pages
(`/{role}-jobs/{city}/{experience}`) are the indexable surface.

**Why.** Google's spam policy names this exact pattern: *"scraping feeds… to
generate many pages… where little value is provided."* An LLM paraphrase of a
scraped JD **is** minimal transformation — it adds tokens, not information.

Evidence this is the real failure mode: **Datanyze lost 96%** of organic traffic
with deindexing surgically confined to its programmatic folders, and **129 of 130
HCU-hit sites never recovered.**

Also: Freshersworld has 386 skill pages and 360 city pages but only **40** combined
`<role>-jobs-in-<city>` pages against a ~139,000 cross-product. The highest-intent
template in the vertical is unclaimed.

---

## D6 — Stack: Cloudflare Workers + Next.js (OpenNext) + Neon

**Decision.** Not Vercel.

**Why.** **Vercel Hobby bans AdSense by name** in its Fair Use Guidelines. Beyond
that, ISR writes on Pro have no included allowance — 500k pages revalidating daily
is ~$66/mo in writes alone at Mumbai rates.

Cloudflare charges **zero egress** and static asset requests are free and
unlimited. An ad-supported SEO site is a bandwidth firehose with near-zero revenue
per pageview; every metered-egress platform taxes what you have most of.

**Rejected:** Vercel (commercial-use ban + ISR economics), Fly.io (India egress 6×
US), Render (free tier cold-starts kill SEO), Oracle Always Free (halved, reclaims
idle instances).

---

## D7 — Code, not no-code

**Decision.** Write it.

**Why.** No-code's only advantage is speed, and that evaporates when agents do the
typing. Concretely: Webflow's CMS caps around 10k items against 75k+ records
needed; WordPress works for content but means fighting the platform for
programmatic pages, and plugin bloat wrecks Core Web Vitals once AdSense JS loads.

The deciding factor: **the SEO strategy is surgical control over `noindex`,
canonicals and rendering (D5). No-code platforms don't give it to you.**

---

## D8 — Scope cut: ship an ingest script, not a platform

**Decision.** Phase 1 is a cron script — fetch, refine with an LLM, write drafts.
No app, no database, no hosting.

**Why.** User call, and correct: the platform work was premature. The ingest has
the longest lead time and zero blocking dependencies.

**Rejected:** scaffolding Next.js + Cloudflare + Neon up front.

---

## D9 — Sources narrowed to the two named sites

**Decision.** Drop the Greenhouse/Ashby/Keka adapters for now. Read one source.

**Why.** User call. The ATS adapters are documented in
[data-sources.md](./data-sources.md) with verified endpoints and can be restored
in an afternoon.

**Findings that reshaped this:**

- **freshersworld.com returns HTTP 403 to every non-browser client** — homepage,
  job pages, even `robots.txt`. Using it requires defeating bot protection.
  **Excluded.**
- **freshersdunia.in has a fully open WordPress REST API**, updated daily.

---

## D10 — Facts-only extraction

**Decision.** Extract structured facts from the source, discard all prose,
regenerate the article from facts.

**Why.** freshersdunia's `robots.txt` carries
`Content-Signal: search=yes, ai-train=no, use=reference` and disallows ClaudeBot,
GPTBot, CCBot and Google-Extended — framed as *"a condition of accessing this
website"* and citing Article 4 of EU Directive 2019/790.

**Facts are not copyrightable; expression is.** So the pipeline uses their
aggregation work (who is hiring) without keeping any of their wording.

Enforced structurally, not by convention: the source text is held in memory only
during extraction, is **never written to disk**, and `draft.mjs` reads only the
facts file — so it cannot reproduce phrasing it has never seen.

**Rejected:** direct respin of their posts (the use their signal explicitly
reserves against, and it inherits their errors and staleness).
**Also considered:** tip-sheet mode — use them for discovery, pull facts from the
primary `applyUrl`. Cleaner still, and the natural next step; deferred for now.

---

## D11 — Small, fast, near-free models

**Decision.** Detection order is Groq → Cerebras → Gemini → OpenRouter → OpenAI →
Anthropic. Ollama available for a hard zero.

**Why.** User call, and the measurements back it: **₹9/month on Groq at 25
postings/day vs ₹276 on Claude Haiku** — a 30× swing for a task that is JSON
extraction plus a two-sentence summary. A bigger model also writes *worse* copy
here; longer and more florid is a downgrade on a page whose job is "can I apply,
yes or no".

Most providers speak the OpenAI chat-completions shape, so they share one adapter.
Gemini keeps its native API because strict JSON mode is more reliable there.

---

## D12 — Templates for facts, model for prose only

**Decision.** Render the quick-facts table, eligibility, requirements, apply block
and all frontmatter from templates. The model produces only `title`,
`description`, a 2-sentence summary and one paragraph — capped at 400 tokens.

**Why.** A template restating a JSON field **cannot hallucinate a batch year**;
a model can. Output dropped from ~600 tokens to ~150, and the factual parts got
*more* accurate.

Corollary: `--no-llm` renders complete, publishable drafts. **The LLM is genuinely
optional** — it adds a readable intro paragraph and nothing structural. If a call
fails, the draft is still written and tagged `generatedBy: template`.

---

## D13 — Monorepo (pnpm + Turborepo)

**Decision.** Restructured the flat Node repo into a pnpm + Turborepo monorepo.
The ingest pipeline moved into `apps/ingest` (package `@jobs/ingest`); a new
shared `packages/schema` package (`@jobs/schema`) holds the fact/draft JSON
contracts. Root commands (`pnpm run fetch` / `draft` / `ingest`) route through
turbo.

**Why.** Separates the ingest pipeline from the web app to come, gives both a
single shared source of truth for the fact/draft contracts, and keeps installs
and scripts standard (`pnpm install`). The ingest package stays zero npm
dependencies — built-ins only.

---

## D14 — Expiry is a freshness horizon, not a deadline

**Decision.** A listing ends on its stated deadline where one exists, and
otherwise **60 days after it was posted**.

**Why.** The deadline field was expected to do this work. It cannot: of the first
8 postings ingested, **zero** stated a parseable date. Four said nothing at all
and four said "ASAP" or "Rolling Basis (Apply ASAP)". So the parser was built —
`applyByDate`, conservative, returns null on anything ambiguous — but it is the
precise case, not the general one.

Without a horizon nothing would ever retire, and an aggregator whose apply links
are dead is worse than no aggregator. Sixty days is a judgement call about when
an Indian fresher requisition has typically been filled; it is written down here
because it is a guess and should be revisited against real data.

Expired listings keep their URL rather than 404 — inbound links and bookmarks
should land somewhere useful — but lose the apply button, the structured data
and their place in every index surface.

**Rejected:** deleting expired drafts (breaks links, loses the record);
410 Gone (a static host can't, and it discards accumulated authority).

---

## D15 — Which listings get indexed, and what they feed

**Decision.** Individual listings default to `noindex, follow`. One earns
`index, follow` only by having a live apply link, model-written prose, and at
least three of salary, batch, location, skills or deadline. The indexable surface
is cluster pages: role family, city, role-in-city, company, batch year.

**Why.** This is D5 made executable. D5 said "noindex 60–80% of listings" and
"cluster pages are the indexable surface" but named no rule for either. A policy
with no predicate is not a policy.

Measured on the 8 listings ingested: 4 of 8 listings and 6 of 10 clusters index.
That is 50% noindex against D5's 60–80% target — the ratio should drift toward it
as volume grows, since template-only drafts and postings without an apply link
accumulate. Worth re-measuring at 100 listings rather than tuning the gate now.

Two thresholds on clusters, because a thin cluster page is the exact thing D5
exists to prevent: under 2 listings no page is generated, under 3 the page exists
for navigation but stays out of the index.

Raw job titles proved unusable as cluster keys — "Graduate Engineer Trainee",
"Associate Engineer" and "SDE I" are one intent written three ways, and exact
matching yields clusters of one. Titles map to role families instead.

`follow` throughout, never `nofollow`: the apply links and the cluster pages
still need crawling.

**Also found:** city aliases split clusters. The first build produced
`/jobs-in-bangalore` and `/jobs-in-bengaluru` side by side, each too thin to
index, where merged they clear the bar. Aliases are normalized.

---

## D16 — JobPosting markup, minus the salary

**Decision.** Emit schema.org `JobPosting` on indexable listings. Omit
`baseSalary` and `directApply`.

**Why.** The salary figures are the source's estimates, labelled "(Expected)" —
"₹4 to 6 LPA (Expected)" is not the employer's number. Publishing a guess as
structured salary data is the sort of mismatch Google penalizes, and it is a
promise to the reader that cannot be kept. The figure stays on the visible page,
labelled as expected.

`directApply` states whether the application can be completed at the URL in the
markup. Ours hands off to the employer's ATS, so either answer is a guess about
someone else's flow, and a wrong one costs rich-result eligibility.

Markup is emitted only where it can do something — a `noindex` page cannot
produce a rich result, and Google asks that filled postings lose their markup.

---

## D17 — Tests, on node:test, with no runner

**Decision.** 86 tests using Node's built-in test runner. No vitest, no jest.

**Why.** The ingest app's zero-dependency rule is worth keeping, and the built-in
runner is now good enough that a framework buys nothing here. Web logic is
written as pure functions over plain frontmatter so it tests without booting
Astro, and runs straight off the `.ts` sources via Node 22's type stripping.

Two real bugs surfaced in the writing, which is the argument for having done it:
the social-link filter matched on service names and so let `wa.me` and `t.me`
through into apply-URL candidates, and the schema's TypeScript interface had
silently drifted from its zod schema.

---

## D18 — Contracts assert their own agreement

**Decision.** The hand-written types and the zod schemas in `@jobs/schema` carry
a compile-time assertion that they are identical.

**Why.** They are two views of one contract, maintained by hand, and they had
already drifted: the draft frontmatter schema reused a nullable `jobType` meant
for facts records, so every consumer typed against the interface failed to
compile against the content collection. `astro build` never noticed, because it
does not typecheck.

The first version of the check used mutual assignability and was too weak — an
optional property added to one side only is assignable in both directions, which
is precisely the likeliest drift. Verified by adding one; it passed. The check
compares the types as conditional-type identities instead.

---

## D19 — No paid model tier at all

**Decision.** Remove the OpenAI and Anthropic adapters. Detection order is now
Groq → Cerebras → Gemini → OpenRouter, with Ollama available locally. There is no
metered fallback.

**Why.** D11 already established that a small fast model is the right tool here,
and kept the frontier providers only as a safety net. The net was worth less than
it cost:

- **The measured spread is ~30×** — ₹9/month against ₹276 for the same 25
  postings/day, for JSON extraction plus four short prose fields.
- **A bigger model writes worse copy for this page.** Longer and more florid is a
  downgrade when the reader's only question is "can I apply, yes or no".
- **A fallback that bills is a fallback that fires unnoticed.** Detection is by
  environment variable, so a stray `OPENAI_API_KEY` in a shell or a runner would
  silently start charging for work an 8B model already does well.

The failure mode without them is better, not worse: if every free provider is
rate-limited at once, the run degrades to `generatedBy: template`, which is a
complete and publishable draft (D12), rather than falling through to something
metered.

**Kept:** the cost table in [costs.md](./costs.md) still lists the paid options.
That is the evidence for this decision, and it should stay legible.

---

## D20 — Everything runs locally; no CI, no hosted cron

**Decision.** Delete all three GitHub Actions workflows. The repo holds code, and
nothing else happens there. Ingest runs on a local cron or launchd job via
`scripts/daily.sh`; `pnpm run check` does locally what CI did remotely.

**Why.** User call. The automation was solving problems this project does not
have yet: there is one contributor, one machine, no reviewers to gate, and no
deploy target. Against that, the hosted setup carried real friction — three
workflows to keep green, secrets to mirror into a second place, a red X on
every push from a deploy job that could not possibly succeed, and a
2,000-minutes-per-month budget to think about on a private repo.

Running locally also removes the whole class of bug that dominated the first
day of this repo being on GitHub: two consecutive CI failures caused purely by
Turborepo's strict env mode stripping `SITE`, neither reproducible with a plain
local build.

**What is given up, honestly:** the machine has to be awake for the daily run.
launchd is preferred over cron for exactly this — it runs a missed job when the
machine next wakes, where cron skips the day silently. And nothing now verifies
a push from a clean checkout, so `pnpm run check` before committing is a habit
rather than a gate.

**Reversible.** The workflows were deleted, not disabled; they are in the history
if a second contributor or a real deploy target ever makes them worth having.

---

## D21 — A local coding-agent CLI is not a cheap model

**Decision.** Do not use the Claude Code CLI (or any coding agent) as the
extraction model. Considered, built, measured, removed.

**Why.** It looks free — the binary is installed, signed in, and needs no API
key — and that intuition is wrong by two orders of magnitude. Measured on this
exact workload:

| Provider | Per call | 25 postings/day |
|---|---|---|
| Groq `llama-3.1-8b-instant` | ~₹0.01 | **~₹9/month** |
| Claude Code `--model haiku` | $0.012 | ~$18/month |
| Claude Code `--model opus` | $0.159 | ~$240/month |

The cause is structural, not a tuning problem: the CLI rebuilds a
multi-thousand-token system prompt on every invocation (~5k on haiku, ~15k on
opus), and this workload is two short calls per posting. It is paying agent
prices for a parser. On a subscription it is not billed per call, but it draws
down the same usage limits real coding work needs.

**Rejected with it:** a generic `AGENT_CMD` escape hatch for piping prompts to
any local CLI. Neat, and one more code path to keep working for no benefit once
the cost argument killed the main use case.

**Kept from the exercise:** nothing in `llm.mjs`. The measurements are the
deliverable, and they are above.

---

## D22 — Postgres becomes the source of truth; markdown becomes a projection

**Decision.** The pipeline reads and writes a Postgres database. Local
development runs it in Docker; production is Neon, per D6. The markdown files
still exist, but they are now exported *from* the database rather than being the
database.

**Why.** User call, and the thing that forced it was D23 below: verifying apply
links needs state that a directory of files cannot hold — when each link was
last checked, what the verdict was, where it redirected to. "Re-check every
listing older than a week" is a query, not a directory scan.

The rest follows from that. Deduplicating one job across two sources, expiring by
date, counting a cluster without reading every file — all of it is a `WHERE`
clause and none of it is reasonable against markdown at the 75,000-listing scale
in [product-strategy.md](./product-strategy.md).

**What it cost.** The ingest app's zero-dependency rule, which was real and worth
something. It now depends on `@jobs/db`, and through it on drizzle and a
Postgres driver. Stated plainly rather than quietly dropped.

**What was kept.** The export. A directory of markdown with YAML frontmatter
moves to WordPress, Next.js or anything else; a Postgres table does not. The
export means the data is never trapped in this schema, and it is what keeps the
current site working while it is still reading files.

**Also kept:** the review gate. `promote` flips a column instead of a line in a
file, and nothing publishes itself.

---

## D23 — A posting that cannot be parsed is discarded, not published

**Decision.** Stage one verifies the apply link before stage two spends a model
call on prose. A posting is discarded when it has no usable apply link, when the
link is dead, or when the link goes to a different job. Discards are rows with a
stated reason, not deletions.

**Why.** Nothing checked this before. The apply URL was chosen by a model from
the candidate links on a source page, scored by a heuristic, and published — and
a spot check of the sixteen live listings found one, Wipro's Associate Analyst,
pointing at a requisition that no longer resolved. It had been live on the site
the whole time. An aggregator whose apply links are dead is worse than no
aggregator, because it costs the reader the click to find out.

Verification runs on a schedule too, not just at ingest. A requisition that was
live when drafted goes dead without telling anyone, and re-checking is the only
thing that would ever notice. A listing whose link fails a later check is retired
from published automatically.

**The classifier is deliberately reluctant to say "dead."** The two errors cost
differently: marking a live job dead takes an opportunity away from someone who
could have applied, while leaving a dead one up wastes a click. Only an explicit
signal — a 4xx, a redirect to a site root, or a title saying the posting is gone
— will do it.

**`needs_browser` is a verdict, not a failure.** Most Indian ATS platforms
(Oracle CX, Workday, SuccessFactors) render the posting client-side, so a plain
fetch sees an empty shell. Four of the fourteen live links are in this state.
Calling them dead would retire real jobs; calling them live would be a guess.
They are kept and honestly marked unverified.

**A regression worth recording:** the first version of this check looked for "no
longer available" anywhere in the body, and reported two *live* requisitions —
Amazon's and Wipro's — as gone, because that phrasing lives in cookie banners and
related-jobs rails. Only the `<title>` is trusted now.

**Known limit.** The HCLTech link goes to a campus-hiring landing page rather
than a requisition and still passes at 80%, because such a page genuinely does
say "graduate", "engineer" and "trainee". Catching it needs a rendering pass,
which is the same thing `needs_browser` is waiting on.

---

## D24 — The site is Next.js on the database, and Astro is retired

**Decision.** `apps/site` replaces `apps/web`. Next.js App Router reading
Postgres directly, prerendered with 15-minute revalidation. The Astro app is
deleted rather than kept alongside.

**Why.** D6 chose this stack in the first place — Next.js via OpenNext on
Cloudflare, because 500k pages need rendering that a static build cannot give
you. Astro was the Phase 1 scope cut (D8), and the database made keeping it
pointless: the site was reading markdown that was itself exported from Postgres,
so every page load went through a projection of the real data.

What the move actually buys, beyond the roadmap:

- **Cluster pages are SQL aggregates, not scans.** `/jobs-in-bengaluru/` was
  reading every markdown file, parsing frontmatter, normalizing city names and
  grouping in memory. It is now one `GROUP BY` over an indexed column, because
  the normalization happened once at ingest.
- **The indexing gate can see the link check.** A listing whose apply link
  failed verification is now excluded from the index — the file-backed site had
  no way to know that.

**Two rules kept, deliberately.** Markdown export stays (D22): the data must not
be trapped in this schema. And the design is unchanged — the same class names,
the same `globals.css`, the same direction contract in the layout. Porting the
markup was mechanical; nothing about the visual world was reopened.

**One thing the port broke and had to fix:** Astro scoped component styles per
file, and copying only `global.css` left fifty rules behind — the masthead, the
category strip, the apply action and the "more like this" block all rendered
unstyled. They are in `globals.css` now under the same selectors. Splitting them
into CSS modules would have fragmented a design system whose whole premise is a
small shared vocabulary.

**Rejected:** keeping both apps. Two frontends over one database is a
maintenance trap and an ambiguity about which one is real. The Astro app is in
git history if it is ever wanted.

---

## D25 — Read the shell, not a browser

**Decision.** Before calling an apply page unverifiable, read its `og:title`,
`twitter:title` and any `JobPosting` JSON-LD, and fall back to the slug in its
URL path. No headless browser.

**Why.** Seven of nineteen links were sitting at `needs_browser` — client-rendered
ATS shells with an empty body. The obvious fix was Playwright, at roughly 300MB
of browser download for a pipeline whose whole point is that it costs ₹9 a
month.

Probing the shells first showed it was unnecessary: four of five carried the
real role in `og:title`, because every ATS wants a link preview to work, and one
shipped a full JobPosting JSON-LD. The fifth had the role slugified in its URL.
That is the entire signal a browser would have rendered, already in the HTML.

Result: **17 of 19 links now verify, up from 9.** One remains genuinely
unverifiable — Honeywell titles a posting "Intern (Bachelor's)" where the
listing says "Intern Bachelors Software Engineer", so the page really does not
name the role. That is a correct verdict, not a gap.

**The URL is weaker evidence than the page, and the code says so.** A slugified
role in the path only counts when the body is empty. It must never rescue a page
full of prose about something else, because that is exactly what a careers
category page looks like — the HCLTech landing page that started all of this.

**Also fixed here:** capturing a meta value with `[^"']+` truncates at the first
apostrophe, which turned `Intern (Bachelor's)` into `Intern (Bachelor`. Values
are now captured by the delimiter that opened them.

---

## D26 — @jobs/schema removed

**Decision.** Delete the package. The database schema is the contract now.

**Why.** Nothing imported it after the Astro app went. It existed to validate
markdown frontmatter with zod at build time, and that build no longer exists.

Keeping it would have meant two hand-maintained descriptions of one contract,
which is precisely the failure D18 was written about — the interface and the zod
schema there drifted apart silently and broke every consumer. The Drizzle schema
in `@jobs/db` is generated from, and migrated with, the actual table.

**What was given up:** the JSON Schema files describing the exported markdown.
The portability promise in D22 is now carried by the export itself rather than
by a document about it.

---

## D27 — Two axes, not one: what the work is, and how it is arranged

**Decision.** The taxonomy has a broad **category** at the top (IT & Software,
Data & Analytics, Business & Consulting, Marketing & Sales, Design & Creative,
Core Engineering, Finance & Accounts, HR & Recruitment), a finer **role family**
under it, and **employment type** as a separate axis entirely.

**Why.** One axis was doing two jobs and getting both wrong. `jobType` overrode
the role, so EY's "Analyst" was filed under Internship; where `jobType` happened
to be null, "Intern Bachelors Software Engineer" was filed under Software
Engineer. The same situation, opposite treatment. A reader browsing analyst work
wants it whether or not it is an internship, and a reader browsing internships
wants them across every function.

Role families were also too fine to browse by — "data-scientist" held one
listing and "qa-engineer" none, so a menu built on them was mostly empty and
told a visitor nothing about what the site covers. Categories stay populated as
volume grows.

**Core Engineering earns its place** even though a tech-only board would not have
it: mechanical, electrical and civil graduates are a large share of this
audience, and the Volvo, Eaton and Carrier postings are exactly that.

**Specific evidence beats generic evidence, everywhere before anywhere.** Two
real misfilings drove this: "Associate — Market Research and Insights" lost to a
"Database Expertise" skill and landed in Data, and an SQL apprenticeship landed
in Design because "Data Visualization" contains "visual". Categories now declare
their specific words separately from generic ones like Associate, Engineer and
Trainee, and every specific test runs before any generic one.

**Also fixed here:** states were being treated as cities, so /jobs-in-maharashtra/
sat beside real city pages; batch clusters were built from any four-digit number
in the posting body, yielding a /2028-batch-jobs/ page; and the role-family list
tested data-analyst before data-scientist.

---

## D28 — Search is a database query, and is never indexed

**Decision.** A plain GET form posting to `/search`, answered by Postgres
full-text search over a generated `search_doc` column. No client JavaScript.
The results page is `noindex`.

**Why.** The site ships zero JavaScript by design, for a mid-range Android on
mobile data — a client-side search index would have been the single largest
thing the reader downloads, to do worse what Postgres already does.

`websearch_to_tsquery` because it parses what people actually type — quoted
phrases, `or`, a leading minus — and never throws on malformed input the way
`to_tsquery` does. A search box that 500s on an apostrophe is worse than none.
A prefix match runs alongside it, so a half-typed "beng" still finds Bengaluru,
which matters on a phone keyboard.

`simple` rather than `english`: the corpus is Indian job titles, company names
and city names. Stemming "Bengaluru" or "Wipro" gains nothing, and English
stopword removal would drop "IT" from "IT Engineering Streams".

**Never indexed.** A search page is generated by whatever anyone types, which is
the definition of the thin programmatic surface D5 exists to keep out of the
index. It is for the visitor already here.

**One Postgres detail worth recording:** `array_to_string` and the enum-to-text
cast are STABLE, not IMMUTABLE, so a generated column cannot call them. The
expression lives in a function declared IMMUTABLE — the standard workaround, and
sound over text arrays.

---

## D29 — Thumbnails are monograms until a logo is actually available

**Decision.** Keep a `logo_url` column, render a monogram derived from the
company name, and design the layout so the monogram is the normal state.

**Why.** Logos are not reliably resolvable from what we hold. Probing all
thirteen published companies through a favicon service returned four usable
images: the apply link points at the employer's ATS, whose host is usually the
vendor rather than the company — Honeywell's is
`ibqbjb.fa.ocs.oraclecloud.com`, which resolves to nothing.

Hotlinking a third-party image service on every row would also add a
per-pageview request to someone else's server, on an ad-supported page, for an
asset that is missing more often than not.

So the monogram is the design rather than the fallback: same size, same square,
same weight in the row whichever renders. Nothing shifts when a logo appears
later, and nothing looks broken while none does. The tint is derived from the
company name, so a company keeps its colour across the site with no mapping to
maintain.

**The real fix, when it is worth it:** fetch `og:image` or `apple-touch-icon`
from the employer's careers page at ingest and serve it from our own origin.
That is the same trick D25 used to verify apply links, applied to assets.

---

## D30 — The thumbnail is rendered, not drawn

The reference layouts in this vertical are built around a per-posting banner
image: company name, role, and an eligibility table, laid out in a graphics tool
and uploaded with the post. It is the format's best idea — the reader can judge
whether they qualify without opening anything — and its worst constraint, because
someone has to draw one for every posting. On the sites that use it, the recent
and important postings have a card and the long tail does not.

Every field on those cards is already a column here. So the card is rendered from
the row rather than drawn: `apps/site/lib/thumb.tsx` lays out company, role,
batch, salary and location, and two routes render it through `next/og`.

It exists for every listing, it cannot go stale against the facts, and it costs
nothing per posting. It also replaces the thing D29 could not solve — a listing's
visual identity no longer depends on finding an employer logo, so the 4-of-13
resolution rate stops mattering for the feed. D29's monogram stays where a small
inline mark is wanted, in the scan table.

**Two shapes, one drawing.** 1200×630 is the `og:image`, because that is the crop
every messaging preview expects, and PRODUCT.md names the WhatsApp forward as a
main discovery channel — a forward with no preview card is a forward nobody opens.
800×600 is the feed thumbnail: 1.91:1 stretched to a card's height lost a third of
its width to `object-fit: cover`, arriving as "iemens" and "PLY NOW". Both derive
every dimension from one scale factor, so they are the same drawing twice rather
than two drawings to keep in sync. Type carries a second multiplier on the feed
shape, which is drawn at 800px and displayed at ~320.

**Rejected:** shipping a headless browser to screenshot a template (D25 already
rejected ~300MB for a smaller win); a build-time image pipeline writing PNGs to
disk (the facts change under the image, and ISR already caches the route).

---

## D31 — Feed Standard replaces Confirmation Screen

The previous visual world was built on a defensible idea — a listing read as a
transaction confirmation, one type size, hairlines instead of cards — and it was
the wrong instrument. The reader arrives from a WhatsApp forward or a search
result already fluent in one layout: navy bar with category menus, a column of
thumbnail cards, a sidebar of what closes next. Making them learn a better layout
is a cost they did not agree to pay.

So the world is replaced, not softened. Navy chrome, cool-grey ground, white
paper cards, a 70rem shell with a 20rem sidebar. `DESIGN.md` is rewritten rather
than amended; the old one describes a site that no longer exists.

What survived the change, because it was never about the look:

- **One green, one meaning.** `#0b6b35` says *this is open, apply here* and is
  allowed nowhere else — not as a brand accent, which is why the wordmark splits
  by tone instead of hue.
- **Status is a mark plus a word**, never colour alone.
- **Zero JavaScript.** Search is a GET form; the category menus are `<details>`
  elements, which are keyboard-accessible for free and safe on touch, where a
  hover menu is a trap.
- **Ad heights reserved**, never above the first content block.
- **Every pair at 4.5:1** — all 24 measured, not eyeballed. Quiet ink is held
  against the darkest ground it sits on rather than against white, which moved
  `--ink-3` from `#67717b` (4.39 on the new page ground) to `#616b75` (4.79).

**Not built:** the reference's Telegram and WhatsApp channel buttons. The markup
and styling exist and render only when `NEXT_PUBLIC_TELEGRAM_URL` /
`NEXT_PUBLIC_WHATSAPP_URL` are set. There is no channel yet, and a button that
opens nothing is worse than no button for an audience already targeted by fake
job channels.

---

## Open decisions

| # | Question | Blocks |
|---|---|---|
| 1 | **Read apna.co's ToS** — robots permits crawling, silent on republishing | Using apna as a source |
| 2 | Domain A name and niche | Everything downstream |
| 3 | City + vertical for the Phase 0 employer sales test | Phase 0 |
| 4 | ~~Publish target~~ — **resolved**: static site (Astro), built and working | — |
| 5 | **Government notification sources** — public-domain under Section 52(1)(q), safest and richest content available, never researched | Phase 3 content |
| 6 | Is 60 days the right freshness horizon? Set by judgement in D14, never measured | Listing accuracy |
| 7 | Somewhere to put `apps/web/dist/`, and a domain — the only thing between the build and a live site | Launch |
