# Docs

Research, decisions and reference for this project. Everything here was verified
in August 2026 — measured live, or cited to a primary source. Estimates are
labelled as estimates. Anything that could not be verified says so.

| Doc | What's in it | Read it when |
|---|---|---|
| [product-strategy.md](./product-strategy.md) | The full product document — market thesis, positioning, phased roadmap, risk register | Deciding **what** to build |
| [market-research.md](./market-research.md) | Verified competitor evidence: who runs ads, traffic numbers, the Hindi gap | Questioning the strategy, or picking a niche |
| [monetization.md](./monetization.md) | AdSense RPM from Google's own dataset, revenue tables, ad-network ladder | Planning revenue, or applying to an ad network |
| [data-sources.md](./data-sources.md) | Every job source tested, with live measurements, endpoints and legal position | Adding a new source |
| [pipeline.md](./pipeline.md) | How the current code works, end to end | Changing the code |
| [costs.md](./costs.md) | Measured LLM and infrastructure costs | Budgeting, or choosing a model |
| [decisions.md](./decisions.md) | Decision log — what was chosen, what was rejected, and why | Wondering "why is it built this way?" |

## The 60-second version

- **No Indian job board monetizes listings with display ads.** Twelve inspected, twelve run zero. They all sell to employers. The AdSense money is in government-exam *content* sites.
- **Google's own data**: `Jobs & Education` pays **$1.69 page RPM in APAC**, 20th of 25 categories. ₹50,000/month needs ~1.1M pageviews.
- **The one unclaimed opening**: Hindi-language job content. Verified demand, and *not one incumbent serves a single Hindi page*.
- **Free, legal job supply exists** — roughly 75,000 India jobs across Workday, apna, Greenhouse and Keka.
- **Revenue order should be inverted**: employer-paid listings first (₹10,000 in 2–4 weeks, no website needed), AdSense as a margin topper later.
- **Running cost is trivial**: ~₹9/month in LLM spend, ~$6/month hosting. Time is the real cost.

## Current build status

The pipeline and the site both work end to end on real data. Nothing is hosted.

- **Data** — Postgres (Docker locally, Neon in production per D6). 22 postings
  ingested from freshersdunia's WordPress API; 13 published, 5 awaiting review,
  4 discarded.
- **Ingest** — extracts facts, **verifies the apply link before drafting**, and
  discards anything it cannot parse into something a reader could act on.
  Markdown is exported from the database so the data stays portable.
- **Review gate** — everything lands `draft`; `pnpm run promote` is the only way
  anything goes live, and a discarded listing needs `--force`.
- **Site** — Next.js App Router on the database, prerendered with 15-minute
  revalidation. D5 implemented: listings mostly `noindex`, cluster pages as the
  indexable surface, expiry, `JobPosting` structured data.
- **Not built** — hosting, and a second source. Domain is still open decision D2;
  the ATS adapters in [data-sources.md](./data-sources.md) are the bigger gap.

See [pipeline.md](./pipeline.md).
