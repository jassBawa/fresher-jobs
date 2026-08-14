# Costs

Measured August 2026. LLM figures come from building this pipeline's actual
prompts against live posts and counting. Infrastructure figures are from official
pricing pages.

---

## 1. LLM — measured, not estimated

Method: built the real `SCHEMA_PROMPT` and drafting `PROMPT` against 5 live posts
and counted characters (~4 chars/token).

```
extraction prompt template     1,312 chars
drafting prompt template         604 chars

INPUT  per posting   ~2,185 tokens   (both calls combined)
OUTPUT per posting     ~400 tokens   (250 facts JSON + 150 prose, capped at 400)
```

### Monthly cost

| Provider | 25 postings/day | 100 postings/day |
|---|---|---|
| **Groq** `llama-3.1-8b-instant` | **$0.11 · ₹9** | $0.42 · ₹37 |
| OpenAI `gpt-5-nano` | $0.20 · ₹18 | $0.81 · ₹71 |
| Gemini `2.5-flash-lite` | $0.28 · ₹25 | $1.14 · ₹100 |
| Claude Haiku 4.5 | $3.14 · ₹276 | $12.55 · ₹1,105 |

At 25/day that's 750 postings and ~1,500 API calls per month — comfortably inside
any free tier. **Realistic cost: ₹0.**

### Three things that table tells you

1. **Model choice swings this 30×.** Haiku costs ₹276 where Groq costs ₹9, for a
   task that is JSON extraction plus a two-sentence summary. A bigger model writes
   *worse* copy here — longer and more florid is a downgrade on a page whose only
   job is answering "can I apply, yes or no".
2. **75% of the cost is one line.** The extraction call sends 6,000 chars of source
   text (`fetch.mjs:115`); drafting sends ~550. That cap is the only lever, and it
   doesn't matter at these numbers.
3. **`--no-llm` is a hard zero.** Templates produce a complete, publishable draft.

> **Unverified:** Groq's exact free-tier daily caps sit behind a console login.
> At ~50 calls/day you're far below any published free tier, but confirm in your
> own dashboard.

### Rejected: self-hosting a GPU

A rented L4/A10 at $0.40–0.75/hr running 24/7 costs **~34× more** than serverless
at this volume, because you pay for idle. Local inference on a Mac tops out around
1k–4k jobs/day and makes your laptop a single point of failure. **Do not buy or
rent a GPU for this.**

---

## 2. Infrastructure

Not yet spent — no site exists. Figures from official pricing pages, Aug 2026.

### Recommended stack: Cloudflare Workers + Next.js (OpenNext) + Neon + R2

| Stage | Monthly |
|---|---|
| 0–10k visits | **~$6** |
| 100k visits | **~$32** |
| 1M visits | **~$82** |

Bandwidth is **$0 at every tier** — Cloudflare charges no egress, and static asset
requests are free and unlimited. That's the deciding factor: an ad-supported SEO
site is a bandwidth firehose with near-zero revenue per pageview, so every
metered-egress platform taxes exactly what you have most of.

**Breakdown at 100k visits/mo:**

| Item | Cost | Basis |
|---|---|---|
| Workers Paid | $5.00 | 10M req + 30M CPU-ms included |
| Neon Launch, 0.25 CU always-on | $19.35 | 0.25 × 730h × $0.106/CU-hr |
| Neon storage 5 GB | $1.75 | $0.35/GB-mo |
| R2 (ISR cache) | ~$2.00 | $0.015/GB + ops |
| SES ~20k emails | $3.20 | $0.16/1k |
| Domain | $1.00 | ~$12/yr |

### Alternative: one VPS

Contabo Cloud VPS 4 (4 vCPU / 8 GB / **unlimited traffic**, **Mumbai** location,
~€5.50/mo on a 24-month term) running Next.js + Postgres + Meilisearch behind free
Cloudflare CDN. Flat ~$6–15/mo, no scaling cliffs, best India latency. Trade-off:
you own all ops, and Contabo's reliability reputation is mediocre.

### Hosting comparison

| Platform | Cheapest usable | Egress | Verdict |
|---|---|---|---|
| **Cloudflare Workers** | **$5/mo** | **$0, unmetered** | ✅ Winner |
| Vercel | Pro $20/user/mo | $0.20/GB (bom1) after 1 TB | ❌ See traps |
| Netlify | Pro $20/mo | ~$0.13/GB | ❌ Free tier ≈ 15 GB |
| Railway | $5/mo | $0.05/GB | ⚠️ Not CDN-scale |
| Render | — | — | ❌ Free tier cold-starts ~1 min |
| Fly.io | $2.02/mo | **India $0.12/GB — 6× US** | ❌ Punitive for India |
| Deno Deploy | $20/mo | $0.50/GB overage | ⚠️ Caps too low |
| DigitalOcean | $4–6/mo | included | ✅ Bangalore region |
| Contabo | ~€5.50/mo | unlimited | ✅ Mumbai region |
| Oracle Always Free | $0 | free | ❌ See traps |

### Database

Every free tier is too small — a 500k-row job table is 3–8 GB.

| DB | Free tier | Killer |
|---|---|---|
| **Neon** ✅ | 0.5 GB, 100 CU-hrs | Scale-to-zero at 5 min, **not disableable on Free** |
| Supabase | 500 MB | **Project pauses after 1 week idle** |
| Turso | 5 GB, 10M writes/mo | SQLite — no `pg_trgm`, weaker facets |
| Cloudflare D1 | 500 MB (10 GB paid) | **Hard 10 GB ceiling**, 100 cols/table |
| PlanetScale | **none** | Free tier eliminated; $5 SKU is 1/16 vCPU |
| MongoDB Atlas | 512 MB | 100 ops/sec cap |

**Budget ~$20/mo for the database from day one and stop shopping.** Pair Neon with
**Cloudflare Hyperdrive** — free on both Workers tiers, gives connection pooling
(Workers can't hold PG connections) and edge query caching.

### Search

**Postgres FTS + `pg_trgm` is good enough to ~100–200k active listings** — $0, in
the database you already have. What degrades is multi-dimension facet counts, so
**precompute them into a summary table during the nightly ingest** and live-count
only the applied dimension.

Move to Meilisearch (self-host ~$6/mo VPS) when you want typo tolerance and
as-you-type UX — a product decision, not a scaling one. **Algolia is disqualified
on cost**: 300k searches/mo ≈ $145/mo.

---

## 3. The reframe

**Hosting will cost 20–50× the LLM bill.** Cloudflare at $5/mo is ₹440 — more than
a year of Groq at this volume.

LLM cost is not a line item worth thinking about again unless you scale past a few
thousand postings a day. The real costs are **hosting once you serve traffic**, and
**your time**.

---

## 4. Traps that cost money unexpectedly

1. **Vercel Hobby bans AdSense by name.** Fair Use Guidelines (updated 2026-07-29)
   prohibit *"the inclusion of advertisements, including but not limited to online
   advertising platforms like Google AdSense"*. Even donations count. Pro is the floor.
2. **Vercel ISR writes have no included allowance.** 500k pages revalidating daily
   = 15M writes/mo = **$66/mo in writes alone** at Mumbai rates. Mitigable with
   long revalidate windows, but you must architect for it.
3. **Cloudflare caps static assets at 100,000 files** (20,000 on Free). Full static
   export of a 500k-page site is **architecturally impossible**.
4. **Build-time explosion.** 500k paths in `generateStaticParams` = 7–28 hours.
   Prerender a bounded head set (~2–5k), let `dynamicParams` handle the tail.
5. **DB scale-to-zero destroys TTFB.** A Googlebot hit on a cold DB is a
   multi-second response.
6. **Oracle Always Free was halved** (now 2 OCPU / 12 GB Arm) and **reclaims
   instances idle below 20% for 7 days**. Free, not dependable.
7. **Fly.io charges $0.12/GB for India** — 6× its US rate.
8. ~~**GitHub Actions private-repo minutes are tight**~~ — 2,000/mo free; a
   60-minute nightly job burns 1,800. **No longer applies (D20):** ingest runs
   as a local cron/launchd job, so it costs nothing and needs no budget.
9. **AdSense Auto Ads wreck CLS.** Manual slots with reserved `min-height` only,
   and never above the LCP element.

> **Unverified:** Hetzner pricing — all five official URLs render prices
> client-side and returned no figures. The shared-CPU line is now CX23/33/43/53
> (was CX22/32/42/52), which is consistent with a repricing but proves nothing.
> Hetzner also has **no India region**, so Contabo Mumbai or DO Bangalore wins
> here regardless.
