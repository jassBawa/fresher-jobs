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

The ingest pipeline and the site both exist; nothing is hosted.

- **Ingest** — two stages, reads postings, extracts facts, writes drafts. Real
  data flowing: 8 listings from freshersdunia's WordPress API.
- **Review gate** — everything lands `status: draft`; `pnpm run promote` is the
  only way anything goes live.
- **Site** — Astro static build with the D5 indexing policy implemented:
  listings mostly `noindex`, cluster pages as the indexable surface, expiry,
  and `JobPosting` structured data.
- **Not built** — hosting. `deploy.yml` targets Cloudflare Pages but the
  project, secrets and domain do not exist. Domain is still open decision D2.

No database, and none needed at this volume. See [pipeline.md](./pipeline.md).
