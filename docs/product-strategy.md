# India Jobs Platform — Product & Build Document

**Version 1.0 · 11 August 2026**
Research basis: 6 parallel research agents + direct live API measurement. Every number below is either measured in-session or cited to a primary source. Estimates are labelled as estimates.

---

## 0. The one-paragraph verdict

Your instinct to build a Freshersworld-style traffic business is sound, but **the specific monetization model you named does not work in the vertical you named, and the market has already proven it.** Freshersworld runs zero display ads. So do Naukri, Instahyre, Cutshort, Hirist, iimjobs, Wellfound, Foundit, apna, WorkIndia, Jobhai and Quikr — verified by direct page-source inspection of all twelve. Google's own AdSense data explains why: `Jobs & Education` in APAC pays **$1.69 page RPM**, 20th of 25 categories, and carries the steepest regional discount of any category (53% of US rates). India-only sits below that. **₹50,000/month from AdSense requires ~1.1 million pageviews.** However, the research surfaced one genuinely unclaimed, verified opening — **Hindi/vernacular job-search content, which not a single incumbent serves** — plus a free, legal data supply of ~75,000 India jobs. The business is real. The revenue model must be inverted: **employer-paid first, AdSense as a margin topper later.**

---

## 1. What was verified (hard evidence, not estimates)

### 1.1 Nobody in Indian jobs monetizes listings with ads

Direct HTML grep for `googlesyndication`, `adsbygoogle`, `ca-pub-`, `ezoic`, `doubleclick`, `taboola`, `mgid`, `adsterra` across homepages and inner pages:

| Site | Segment | Ad networks found | Verdict |
|---|---|---|---|
| freshersworld.com | Freshers | **NONE** (only GTM) | Sells ₹649/6mo subscriptions + campus hiring |
| naukri, instahyre, cutshort, hirist, iimjobs, wellfound, foundit | Tech | **NONE** | Employer-paid |
| apna.co | Blue-collar | **NONE**, no ads.txt at all | Employer subscriptions |
| workindia.in | Blue-collar | **NONE served** (pub ID declared in ads.txt, never shipped) | Employer subscriptions |
| jobhai.com | Blue-collar | **NONE** detected | Info Edge brand |
| quikr.com/jobs | Classifieds | **NONE** | — |
| **sarkariresult.com** | **Govt-exam content** | **AdSense + GAM, 49 SSPs, VDO.AI managed video** | **Full ad stack** |
| **freejobalert.com** | **Govt-exam content** | **AdSense + GPT header bidding, 78 SSPs / 232 ads.txt lines** | **Outgrown AdSense** |
| **rojgarresult.com** | **Govt-exam content** | AdSense, 17 ad units | Pure AdSense |

**The dividing line is not tech vs blue-collar. It is transactional job board (employer-paid, zero ads) vs informational content site (ad-paid).**

Note: FreeJobAlert runs 78 unique SSPs and only 6 of its 232 ads.txt lines are Google. Nobody builds a header-bidding stack that deep for inventory nobody bids on — **this audience does have real programmatic demand.**

### 1.2 The AdSense number, from Google's own data

Google's public AdSense calculator is backed by an undocumented JSON file (`adsense.google.com/start/calculator-data.json`). Reverse-engineering the formula in `index.min.js` shows the multiplier **is** monthly page RPM in USD.

| Category | Americas | **APAC** | APAC as % |
|---|---|---|---|
| **Jobs & Education** | $3.16 | **$1.69** | **53%** |
| Finance | $3.34 | $5.29 | 158% |
| Computers & Electronics | $4.34 | $4.04 | 93% |

APAC is blended with Japan, Australia, Singapore, Korea — **India sits well below $1.69** (India CPC ≈ $0.07 vs US $0.61). Defensible India range: **$0.20–$1.00, base case $0.40–$0.60.**

| Monthly pageviews | Base ($0.50 RPM) |
|---|---|
| 100,000 | **₹4,400** |
| 500,000 | **₹22,000** |
| 1,000,000 | **₹44,000** |
| 5,000,000 | **₹220,000** |

**₹50,000/month ≈ 1.1M pageviews ≈ 15× FreshersDunia.** Realistic 12-month outcome: **₹5,000/month.**

### 1.3 The Hindi gap — the single best finding in this research

Google autocomplete API (`gl=in`) returns high-frequency Hinglish and Devanagari job queries:

- `job chahiye contact number`, `naukri chahiye ghar baithe`, `ghar baithe job kaise kare`
- `जॉब वैकेंसी नियर मी`, `नौकरी चाहिए मोबाइल नंबर सहित`
- `delhi me job rehna khana free`, `10वीं पास नौकरी वेतन 30 000`

Who serves this demand:

| Site | hreflang | Devanagari in HTML | Devanagari URLs |
|---|---|---|---|
| apna.co | **`en-IN` only** | **0** | 0 |
| workindia.in | none | **0** | 0 |
| freejobalert.com | none | 16 (labels) | **0 of 13,829 sampled** |
| sarkariresult.com | none | 8 | 0 |

**Not one incumbent serves a single Hindi-language page.** Demand verified, supply zero.

Three behavioural signatures: these are **voice searches** (long, conversational), often **`kaise` questions** (informational intent — the only AdSense-compatible surface), and they explicitly demand **a phone number**.

### 1.4 Free, legal job supply — measured live

| Source | India jobs | Auth | Legal risk | Status |
|---|---|---|---|---|
| **Workday CXS** | **~31,900** (projected from 150-tenant sample) | none | Low | ✅ verified |
| **apna.co sitemap** | **31,949 active + 20,000 external** (exact) | none | Med (robots OK, ToS unread) | ✅ verified |
| **Greenhouse** | ~6,900 (projected) | none | Low | ✅ verified |
| **Keka** (India-native ATS) | **5,075** (exact, ~100% India) | none | Low | ✅ verified |
| Ashby + SmartRecruiters | ~1,000 | none | Low | ✅ verified |
| Lever | ~72 — **skip** | none | Low | measured, worthless |
| BambooHR | **0** — skip | none | Low | measured, worthless |
| Darwinbox | blocked (Cloudflare Turnstile) | — | **High** | do not attempt |
| NCS (ncs.gov.in) | blocked (**encrypted API payloads**) | — | **High** | do not attempt |
| Naukri | `Disallow: /` | — | **High** | off limits |

**Total realistic: ~75,000 India jobs, free and legal.**

**Token enumeration is already solved.** `github.com/Feashliaa/job-board-aggregator` (MIT, refreshed daily by GitHub Actions) ships pre-validated tokens. Independently verified in-session:

```
greenhouse_companies.json    8,333 entries
workday_companies.json      12,884 entries   ← ships full tri-part key: "2020companies|wd1|external_careers"
lever_companies.json         4,368 entries
```

The Workday file is the prize: the tri-part `tenant|wdN|site` key is the genuinely hard part to guess.

**Efficiency insight:** Keka yields **16.6 India jobs per token** vs Greenhouse's **0.83** — 20× better. Chasing Anglo ATS harder is the expensive path; adding India-native ATS is the cheap one.

### 1.5 My own measurements

| Probe | Result |
|---|---|
| 56 US-tech ATS tokens | 7,514 jobs → 320 India (**4.3%**) |
| 92 Indian company slugs across 3 ATSs | 12 live (13% hit rate) → **37% India share** |
| PhonePe (Greenhouse) | 61 of 79 jobs in India |
| Groww, Atlan | 100% India |

Indian companies largely don't use Western ATSs — but when they do, the India density is 8× higher.

---

## 2. Strategy

### 2.1 Two domains, not one

**Decisive evidence:** Info Edge — India's most sophisticated job-board operator — runs **Naukri** (tech), **FirstNaukri** (freshers) and **Jobhai** (entry-level) as *three separate domains*. They had every incentive to consolidate onto Naukri's authority and deliberately did not. No example was found, successful or failed, of an Indian site combining IT and blue-collar with display ads.

| Property | Audience | Revenue model | Priority |
|---|---|---|---|
| **Domain A — Blue-collar / vernacular content** | Hindi-first, mobile, tier 2/3 | **AdSense + employer listings** | **BUILD FIRST** |
| **Domain B — IT/tech jobs** | English, desktop, ad-blocking | **Employer-paid / affiliate** | Phase 3+ |

Reasons ranked by real impact:
1. **RPM blending is the killer** — the ad engine is the vernacular content, not tech. Tech visitors block ads; that's *why* every tech board sells to employers.
2. **Topical authority** — both AdSense winners are monomaniacally focused. Mixed signals lose to clean ones.
3. **Language architecture** — your edge is Hindi. One domain forces awkward hreflang; a Hindi-first domain can own `hi-IN`, which **no incumbent declares.**

### 2.2 The revenue inversion

You asked for AdSense-first. The evidence says invert it:

| Path | Time to first ₹10,000 | Why |
|---|---|---|
| **Employer-paid featured listings** | **2–4 weeks** | 4 listings × ₹2,500. No website required. |
| Affiliates (Coursera 15–45%, verified) | 6–10 weeks | 1 conversion ≈ ₹800 ≈ **1.6M pageviews of AdSense** |
| Resume review service (₹499) | 6–10 weeks | Near-100% margin |
| **AdSense** | **6–12 months** | ₹10,000 needs ~228,000 pageviews |

**AdSense is the margin topper on a business that already works, not the business model.**

### 2.3 What the 50k Instagram is actually worth

Link-in-bio CTR is measured against **profile visits, not followers**. A 50k account sees maybe 3,000–8,000 profile visits/month; at 1–3% that's **30–240 clicks/month ≈ ₹200–500/month** of ad revenue. **As a traffic bridge it is a vanity input.**

As a **sales channel** it is the most valuable asset you have:
1. **AdSense approval evidence** — Google requires the site "attract an audience" *before* approval. Real referral traffic clears that bar.
2. **Direct employer sales** — the ₹2,500 featured-listing offer runs entirely on IG + WhatsApp.
3. **Affiliate distribution** — 200 high-intent clicks beats 200 ad impressions by orders of magnitude.

---

## 3. Architecture

### 3.1 The single most important design decision

> **`noindex` 60–80% of individual job pages. Make cluster pages the indexable surface.**

Google's spam policy names your exact fact pattern: *"Scraping feeds… to generate many pages… where little value is provided to users."* An LLM paraphrase of a scraped JD **is** minimal transformation — it adds tokens, not information.

**Evidence this is the real failure mode:** Datanyze lost **96%** of organic traffic with deindexing surgically confined to its programmatic `/companies` and `/people` folders. 129 of 130 HCU-hit sites **never recovered**.

Indexable surface = `/{role}-jobs/{city}/{experience}` cluster pages carrying **your own aggregate data**:
- Salary benchmark from your corpus ("₹4.5 LPA is 12% below median for this role, n=340")
- Nearby-job counts, employer repost history, dead-link tracking
- Freshness/lifecycle state

The LLM summary is garnish. **The proprietary aggregate is the meal.**

**The unclaimed template:** Freshersworld has 386 skill pages and 360 city pages but only **40** combined `<role>-jobs-in-<city>` pages — against a ~139,000 cross-product. They built 0.03% of it. WorkIndia built 120,000+ such pages in English only; nobody built them in Hindi.

### 3.2 Publish gate

```
publish_decision(job):
  unique_data_fields < 3   → noindex, canonical → cluster
  duplicate_cluster > 3    → noindex all but canonical
  application_link dead    → unpublish
  unique word_count < 120  → noindex
  else                     → index + LLM summary
```

### 3.3 Stack

**Cloudflare Workers + Next.js 16 (OpenNext) + Neon Postgres + R2.**

Deciding factor: **Cloudflare charges zero egress, and static asset requests are free and unlimited.** An ad-supported SEO site is a bandwidth firehose with near-zero revenue per pageview — every metered-egress platform taxes exactly what you have most of.

| Stage | Monthly cost |
|---|---|
| 0–10k visits | **~$6** |
| 100k visits | **~$32** |
| 1M visits | **~$82** |

| Layer | Choice | Note |
|---|---|---|
| Hosting | Cloudflare Workers Paid | $5/mo, 10M req, zero egress |
| Framework | Next.js 16 App Router via `@opennextjs/cloudflare` | ISR **and** PPR both supported on Node runtime |
| DB | Neon Launch | No base fee; **disable scale-to-zero** before live traffic |
| Search | **Postgres FTS + pg_trgm** | Good to ~100–200k listings. Precompute facet counts nightly. |
| Storage | Cloudflare R2 | Zero egress; hosts IG carousel JPEGs |
| Ingest | **Local cron / launchd** | Free. Revised in D20 — was GitHub Actions |
| Analytics | Cloudflare Web Analytics | Free, no cookie banner, best CWV |

**⚠️ Vercel Hobby bans AdSense by name.** Fair Use Guidelines (updated 2026-07-29) list *"the inclusion of advertisements, including but not limited to online advertising platforms like Google AdSense"* as prohibited commercial use. Pro ($20/mo) is the floor there, and 500k pages revalidating daily = **~$66/mo in ISR writes alone** at Mumbai rates.

### 3.4 Traps

1. **Build-time explosion** — 500k paths in `generateStaticParams` = 7–28 hours. Cloudflare also hard-caps static assets at 100k files. **Full SSG is architecturally impossible.** Prerender ~2–5k head pages; `dynamicParams` renders the tail on demand.
2. **Every free DB tier is too small** — Neon 0.5GB, Supabase 500MB, D1 500MB. A 500k-row job table is 3–8GB. Budget ~$20/mo immediately.
3. **DB scale-to-zero destroys TTFB** — Neon Free autosuspends at 5 min and can't be disabled; Supabase Free pauses after a week.
4. **Expired listings rot into a scaled-content liability.** Honour `validThrough`, 410 dead jobs.
5. **AdSense Auto Ads wreck CLS.** Manual slots with reserved `min-height` only. Never place an ad above the LCP element.
6. **Oracle Always Free was halved** (2 OCPU/12GB) and reclaims instances idle <20%.

---

## 4. Agent architecture

**Total LLM ops cost: ~$10–30/month.** Cost is not the constraint; architecture is.

| Agent | Trigger | Model | $/mo | Autonomy |
|---|---|---|---|---|
| **Ingest / self-heal** | Cron 30–60 min | Rules; Claude on parse failure | $0–3 | **L2** — opens PR, self-merges on green tests |
| **Enrich / normalize** | Queue, batched | Gemini 2.5 Flash-Lite (batch) | $0–8 | **L3** — schema-validated |
| **Content / SEO** | Nightly | Claude Sonnet (Batch API) | $3–10 | **L1** — bulk human approval |
| **Social** | 3×/day | Flash-Lite copy + code-rendered images | $0–2 | **L1 Instagram, L3 Telegram** |
| **Growth** | Weekly | Claude (reads GSC + GA4) | $2–5 | **L1** — proposes only |
| **QA / monitoring** | Every 6h | Rules + Haiku | $1–3 | **L2** — may unpublish, never publish |
| **Builder** | `@claude` / cron | Claude Code | $20 sub | **L1** — you merge |

### 4.1 The rules-first cascade (this is the 100× saving)

```
JD → rules pipeline → confidence score
  ≥ 0.85  → publish, no LLM       (~80% of jobs)
  < 0.85  → LLM extraction        (~20%)
  will-be-indexed + passes gate → LLM summary  (~15%)
```

10,000 jobs/day → **~2,000 LLM calls/day ≈ $0.25/day.**

**Deterministic — never call an LLM:** dedupe (SHA-256 of normalized title+company+city+first-200-chars), salary parsing (~40 regexes cover >95% of `₹3.5–5 LPA` / `25,000/month` formats), experience extraction, location normalization (8k-city gazetteer), skill extraction (Aho-Corasick over a closed taxonomy), remote flags, SEO titles/metas/slugs (**templates outrank LLM copy**), JSON-LD, internal linking (graph query — an LLM invents links to pages that don't exist).

**The trick that removes the biggest recurring cost:** label 5,000 jobs *once* with an LLM, train a classifier on embeddings, run it free forever.

**Where LLMs genuinely earn their cost:** self-healing scrapers, messy Hinglish JD parsing, Hindi/Tamil/Telugu translation, editorial content, GSC pattern-finding, scam-risk judgment.

### 4.2 Cost per 1,000 jobs (verified pricing, 1,500 in + 200 out)

| Option | $/1k jobs |
|---|---|
| Gemini 2.5 Flash-Lite (free tier) | **$0.00** |
| DeepInfra Mistral-Nemo | $0.035 |
| **Gemini 2.5 Flash-Lite (batch)** | **$0.115** ← recommended |
| OpenAI gpt-5-nano (batch) | $0.078 |
| Claude Haiku 4.5 (batch + cache) | ~$0.85–1.25 ← escalation tier only |

**Do not self-host.** A rented GPU 24/7 costs ~34× more than serverless at this volume because you pay for idle.

### 4.3 Distribution channels

| Channel | Automatable? | Constraints |
|---|---|---|
| **Telegram** | ✅ **Fully — free, zero policy risk** | 20 msg/min to a group. **Highest-ROI surface.** |
| **Instagram** | ⚠️ Yes, keep human-approved | Professional account; **100 posts/24h**; carousel = 1 post; **JPEG only**; media must sit on a **public URL** (→ R2); **no native scheduling** |
| WhatsApp | Broadcast | Employer-sales channel |

---

## 5. Roadmap

### Phase 0 — Sell before you build (Weeks 1–4) · Revenue target ₹10,000
**No website required.** Take the IG account to 20–30 SMB employers in **one city, one vertical** (blue-collar: retail, logistics, hospitality, field sales — Naukri underserves these and the employers are reachable). Offer featured placement on IG + WhatsApp broadcast for **₹2,000–3,000**.

**4 sold listings = ₹10,000.** More importantly it answers the only question that matters: *will employers pay?* — before you spend a year on SEO.

### Phase 1 — Data spine (Weeks 1–6, parallel with Phase 0)
Build the five day-1 sources in priority order:

1. **Workday** — pull `workday_companies.json` (12,884 tri-part keys). Two-step per tenant: POST for facets → find the node whose descriptor is `India` → POST again with that facet ID.
   **⚠️ Never use `searchText:"India"`** — it matches "Indiana"/"Indianapolis" and inflates counts ~2.5×.
2. **apna.co** — `apna.co/api/sitemap-index.xml` → `job-listing-sitemap.xml`. Full JobPosting JSON-LD **including real INR salary with monthly units**. Prefer `active-*` over `external-*`. **Read their ToS before ingesting — this is your one genuine legal decision point.**
3. **Greenhouse** — 8,333 tokens, 64% live.
4. **Keka** — 2 unauthenticated GETs; best India efficiency of anything.
5. **Ashby + SmartRecruiters** — cheap top-up.

**Skip entirely:** Lever (~72 India jobs), BambooHR (0), Darwinbox (Turnstile), NCS (encrypted), Naukri (`Disallow: /`).

### Phase 2 — Narrow deep site (Weeks 2–8)
**One city, one or two categories, 200–400 pages maximum.** Every page carries original normalized data plus 20–30 genuine content pieces.

**Resist launching 10,000 pages.** Page velocity is the loudest scaled-content signal you can send. Programmatic pages perform at a **median 5–15 visits/month**; the bottom half get 0–2. 100k pageviews/month needs ~10,000–20,000 *genuinely useful* indexed pages — that is an 18–24 month build, not a launch.

### Phase 3 — Hindi content layer (Weeks 6–12) · **the actual wedge**
Three plays, in order:

1. **The `kaise` question cluster** — `ghar baithe job kaise kare`, `delhi me job kaise khoje`, `जॉब वैकेंसी नियर मी`, `नौकरी चाहिए मोबाइल नंबर सहित`. Hindi-first with real `hreflang="hi-IN"`. Write for **voice search**: long conversational headings, and always answer the "contact number" demand explicitly.
2. **The `-female` segment** — WorkIndia built 495 hyperlocal pages *each* for `telecalling-female`, `customer-support-female`, `bpo-female`. They know it converts. **Nobody covers it in Hindi**, and nobody answers the safety/legitimacy questions this segment actually asks.
3. **Hyper-specific long-tail qualifiers** — `delhi me job rehna khana free`, `10वीं पास नौकरी वेतन 30 000`, `job chahiye urgent`. Salary-, accommodation- and urgency-qualified queries the incumbents' rigid templates structurally cannot generate.

### Phase 4 — Monetization layering (Week 10+)
- **Week 10+:** Apply to AdSense — only with real organic traffic, 30+ content pieces, and About/Contact/Privacy pages. Timeline: *"a few days… in some cases 2-4 weeks."*
- **50–100k pageviews:** Add Ezoic (no minimum; accepts India traffic). Below 50k it may earn *less* than plain AdSense.
- **Never:** Raptive — requires majority US/UK/CA/AU/NZ traffic. **Permanently ineligible.**
- **~₹36,600/mo ad revenue:** Mediavine becomes reachable ($5,000/yr threshold).

### Phase 5 — Domain B (Month 6+)
Only after Domain A works. IT/tech jobs, English, **employer-paid** — the model every tech board actually uses. The free Western ATS feed already gives you premium GCC/MNC India roles (Databricks Bengaluru, MongoDB India, PhonePe) at zero cost.

---

## 6. Risk register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **AdSense rejects for "low value content"** | **Existential** | Launch narrow (200–400 pages), content-heavy, real traffic first. Never apply on day one. |
| 2 | **Category is structurally low-CPM** | **High** | Cannot be fixed operationally. Invert to employer-paid revenue. |
| 3 | Scaled-content penalty | **Existential** | `noindex` 60–80% of listings. Index clusters only. 129/130 hit sites never recovered. |
| 4 | Expired listings accumulate | High | Honour `validThrough`; 410 dead jobs; QA agent auto-unpublishes |
| 5 | apna.co ToS unread | **Medium-High** | **Read before ingesting.** robots.txt permits crawling; says nothing about republishing. |
| 6 | Scam listings (blue-collar) | **High — legal + moral** | Deterministic blocklist: reject fee/deposit/document demands. Human report queue. Not delegable. |
| 7 | Traffic timeline optimism | High | Plan 6–12 months to meaningful organic; 18–24 to 1M pageviews. |
| 8 | AI Overviews | Medium | Informational CTR fell **61%**. Transactional queries safer. |
| 9 | DPDP Act compliance | Medium | One hour with a lawyer. Cheapest line item in this document. |

---

## 7. What agents cannot do for you

1. **Get past bot defenses.** Self-healing fixes DOM changes, not Turnstile, IP bans or encrypted payloads. You'll spend more time on data access than on the entire AI pipeline.
2. **Make Google index you.** You can generate 200,000 pages tonight; Google will index a few thousand. The first 6–12 months are a *distribution* problem.
3. **Survive an enforcement action.** AdSense appeals are a human process.
4. **Judge whether a listing is a scam.** Highest-stakes decision on a blue-collar board, and you are on the hook.
5. **Own the taxonomy.** Whether "helper" and "labourer" are one category is a product decision grounded in how Indian job-seekers actually search.
6. **Hold employer relationships.** An agent drafts the email; it cannot be the person the HR manager calls.
7. **Decide what not to build.** Agents have no scarcity instinct.

---

## 8. Open questions before build

1. **apna.co Terms of Service** — the one genuine legal decision point. Read it.
2. **Government job notifications** — public-domain under **Section 52(1)(q), Indian Copyright Act**, making them the safest and richest content available. State Rojgar Sangam portals and employment exchanges were not researched. **This is the highest-value unexplored area.**
3. **India-only RPM** — derived, not published. Google publishes no country-level data.
4. **Domain/brand choice** for Domain A.
5. **City + vertical** for the Phase 0 sales test.

---

## 9. Immediate next actions

| # | Action | Owner | Blocks |
|---|---|---|---|
| 1 | Read apna.co ToS | You | Phase 1 item 2 |
| 2 | Pick city + vertical; list 30 target employers | You | Phase 0 |
| 3 | Register Domain A; Cloudflare + Neon + R2 accounts | Agent-assisted | Phase 2 |
| 4 | Build Workday + Greenhouse + Keka ingest | **Agent** | Phase 1 |
| 5 | Research govt notification sources | **Agent** | Phase 3 |
| 6 | Instagram professional account + Graph API access | You | Social agent |

---

### Sources

Google AdSense calculator dataset · [Google Publisher Policies](https://support.google.com/adsense/answer/9335564) · [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies) · [Vercel Fair Use](https://vercel.com/docs/limits/fair-use-guidelines) · [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [OpenNext Cloudflare](https://opennext.js.org/cloudflare) · [Neon pricing](https://neon.com/pricing) · [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing) · [Telegram Bot FAQ](https://core.telegram.org/bots/faq) · [Mediavine requirements](https://www.mediavine.com/mediavine-requirements) · [Raptive creators](https://raptive.com/creators/) · [Coursera Affiliates](https://www.coursera.org/about/affiliates) · [Arvow pSEO statistics 2026](https://arvow.com/blog/programmatic-seo-statistics-2026) · `github.com/Feashliaa/job-board-aggregator` (MIT) · Semrush public overview pages (Jun 2026)
