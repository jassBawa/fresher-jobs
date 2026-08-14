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

## Open decisions

| # | Question | Blocks |
|---|---|---|
| 1 | **Read apna.co's ToS** — robots permits crawling, silent on republishing | Using apna as a source |
| 2 | Domain A name and niche | Everything downstream |
| 3 | City + vertical for the Phase 0 employer sales test | Phase 0 |
| 4 | ~~Publish target~~ — **resolved**: static site (Astro), built and working | — |
| 5 | **Government notification sources** — public-domain under Section 52(1)(q), safest and richest content available, never researched | Phase 3 content |
| 6 | Is 60 days the right freshness horizon? Set by judgement in D14, never measured | Listing accuracy |
| 7 | Cloudflare Pages project, secrets and domain — the only thing between the build and a live site | Launch |
