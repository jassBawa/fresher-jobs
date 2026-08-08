# Monetization

Verified August 2026.

---

## 1. The anchor number

Google's public AdSense revenue calculator is backed by an undocumented JSON file:

- Data: `https://adsense.google.com/start/calculator-data.json` (25 categories × 3 regions)
- Formula, from `https://adsense.google.com/start/static/revamp/index.min.js`:
  `yearly = 100 * floor( round(pageviews/1000 * multiplier * 12) / 100 )`

Solving it shows **`multiplier` is monthly page RPM in USD**. Verified against the
calculator's own output: 50,000 pv × 1.69 × 12 = $1,014/yr → displays "$1,000".

This is the only source with real account-level data behind it.

### Jobs & Education is one of the worst categories in the worst region

| Category | Americas | **APAC** | EMEA | APAC as % |
|---|---|---|---|---|
| **Jobs & Education** | $3.16 | **$1.69** | $1.86 | **53%** |
| Finance | $3.34 | $5.29 | $4.29 | 158% |
| Computers & Electronics | $4.34 | $4.04 | $2.60 | 93% |

Three compounding problems:

1. **20th of 25 categories in APAC.** Only News, Sports, People & Society, Games
   and Books pay less.
2. **Steepest regional discount of any real category** — 53% of Americas.
   Advertisers pay for jobs/education audiences in the US; they don't in Asia.
3. **"APAC" is blended** with Japan, Australia, Singapore, Korea and Hong Kong.
   **India sits well below $1.69.** Corroborating: India CPC ≈ **$0.07** vs
   US **$0.61** (~11%).

**Defensible India-only page RPM: $0.20–$1.00. Base case $0.40–$0.60.**

Treat Google's $1.69 as a **ceiling, not a target**.

> Indian SEO blogs quote ₹165–₹415 (~$2–5) RPM for education content. Discount
> these — they are lead-gen for SEO/hosting services, with no primary data and no
> methodology. One openly admits its figures are "based on real publisher
> reporting patterns."

---

## 2. Revenue table

Assumptions: 100% Indian traffic, **page** RPM (not session), ₹88 = $1, AdSense
only, ads served on every pageview.

| Monthly pageviews | $0.20 | **$0.50 (base)** | $1.00 | $1.69 (ceiling) |
|---|---|---|---|---|
| 10,000 | ₹176 | **₹440** | ₹880 | ₹1,487 |
| 100,000 | ₹1,760 | **₹4,400** | ₹8,800 | ₹14,872 |
| 500,000 | ₹8,800 | **₹22,000** | ₹44,000 | ₹74,360 |
| 1,000,000 | ₹17,600 | **₹44,000** | ₹88,000 | ₹148,720 |
| 5,000,000 | ₹88,000 | **₹220,000** | ₹440,000 | ₹743,600 |

### Pageviews needed for ₹50,000/month

| Page RPM | Pageviews/month |
|---|---|
| $0.20 | 2,840,000 |
| **$0.50 (base)** | **1,140,000** |
| $1.00 | 568,000 |
| $1.69 (ceiling) | 336,000 |

**~1.1M pageviews ≈ 450,000 sessions/month ≈ 15× FreshersDunia.**

Realistic 12-month outcome: **₹5,000/month** (~100k pageviews).

Calibration: SarkariResult — the country's #1 property in its niche after 15+
years, at 12.25M visits/month — earns roughly **₹9.7 lakh/month**.

---

## 3. Will AdSense even approve an aggregator?

This is the existential risk, and the policy text is not on your side.

### Google Publisher Policies ([source](https://support.google.com/adsense/answer/9335564))

> "We do not allow Google-served ads on screens: with embedded or copied content
> from others **without additional commentary, curation, or otherwise adding value
> to that content**."

> "…without publisher-content or with low-value content"

> "…with more ads or other paid promotional material than publisher-content."

Publisher Policies also **bind you to Search's spam policies by reference.**

### Google Search spam policies ([source](https://developers.google.com/search/docs/essentials/spam-policies))

> **Scraping:** "…reproducing feeds from other sites without providing some type
> of unique benefit to the user."

> **Scaled content abuse:** "**Scraping feeds, search results, or other content to
> generate many pages** (including through automated transformations like
> synonymizing, translating, or other obfuscation techniques), **where little
> value is provided to users.**"

**A job aggregator generating a page per scraped listing is the textbook example
in Google's own policy document.** Not an edge case — the named example.

### So how do sarkariresult and freshersnow stay approved?

Three reasons, and each is a design instruction:

1. **They transcribe, they don't scrape.** Government notifications arrive as PDFs
   on ~200 fragmented portals. These sites *read the PDF and restructure it* into
   eligibility, age limits, fees by category, dates, apply link. That is
   "additional commentary, curation, or otherwise adding value" in the literal
   policy sense — and the source is a government PDF, not another site's HTML.
2. **Public-domain, non-competing source.** No employer files a complaint.
3. **Grandfathering.** 10–15 year old domains with huge brand search. AdSense
   enforcement is reactive. **A new domain in 2026 gets the strict review they
   never faced.**

### What gets an aggregator rejected or banned

- **Rejected:** 95% listing pages / 5% content, three weeks old, listings visibly
  identical to Naukri. Trips "low-value content" and "copied content" at once.
- **Rejected:** thin pages — title, location, salary, Apply button, nothing else.
- **Banned:** invalid traffic (bought, incentivized, or heavy bot mix).
- **Banned:** scaling 500 → 50,000 pages in a month. **Page velocity is the loudest
  scaled-content signal you can send.**

### The minimum bar per indexed page

Something that exists on *your* site and nowhere else:

- Normalized data the source lacked (standardized salary bands, parsed eligibility)
- Your own aggregate: "₹4.5 LPA is 12% below median for this role, n=340"
- Proximity: "18 similar jobs within 10km", "3 other openings at this employer"
- Employer track record: first-seen date, repost frequency, dead-link history
- Original editorial alongside listings

### Approval timeline ([source](https://support.google.com/adsense/answer/76228))

> "This usually takes a few days, but in some cases it can take **2-4 weeks**."

> "Your site must be live and contain enough content for our specialists to evaluate."

Eligibility requires content that is "high-quality, original, **and attracts an
audience**" — note the trap: **Google wants traffic before approval.** Apply once
you have real organic traffic, not on day one.

---

## 4. Ad network ladder

| Network | Entry requirement (verified) | Verdict for India-majority jobs traffic |
|---|---|---|
| **AdSense** | Original content, 18+, live site | Your only realistic start |
| **Ezoic** | **No minimum.** "No visitor requirements or limits." | **The realistic step-up.** Accepts India traffic. |
| **Monumetric** | Propel 10k–80k pv/mo | Possible; setup fee, US-weighted demand |
| **Mediavine** | **$5,000+ annual ad revenue** + AdSense in good standing. "Journey by Mediavine… starts at 1K sessions" | $5k/yr ≈ ₹36,600/mo — you'd qualify around the time you hit ₹50k/mo. Journey is worth an early application |
| **Raptive** | 25,000 pv/mo **AND majority US/CA/UK/AU/NZ traffic** | **Permanently ineligible.** A geography rule, not a threshold. |
| Adsterra / Monetag / PropellerAds | None | Popunder. Adsterra's own GEO table doesn't list India; nearest comparables ~$1.8 CPM |

**When to switch to Ezoic: ~50–100k pageviews/month.** Below that its ML has too
little data and you may earn *less* than plain AdSense, while degrading page speed.

**What FreshersDunia and FreshersVoice both running Ezoic tells you:** they're too
small and too India-weighted for Mediavine or Raptive, and Ezoic is the only
quality-tier network that will take them. Read it as a **ceiling signal**, not
validation — two competitors independently confirming the RPM problem.

---

## 5. Programmatic SEO in 2026

### The graveyard

- **129 of 130 HCU-hit sites never recovered** (Lily Ray / Amsive). Recovery rate
  under 1%. **Getting hit is effectively terminal.**
- **Datanyze lost 96%** of organic traffic, with deindexing surgically confined to
  its `/companies` and `/people` programmatic folders. **This is the closest
  analogue to a job board** — templated entity directories removed, rest of site
  survived.
- **Causal lost 99.52%** after publishing 1,800 AI articles.
- **G2 lost ~80%** since 2023.
- March 2024 update: 837 of 49,345 monitored sites deindexed; "100% of deindexed
  sites had at least some AI-generated posts."

### The survivors — all share unique non-replicable data per page

Wise (260k currency pages → 46M visits), Zapier (50k integration pages → 5.8M),
Canva (21k template pages → 13.1M).

### The distribution nobody quotes

**Median programmatic page: 5–15 visits/month. Bottom 50%: 0–2 visits/month.**

So **100,000 pageviews/month needs roughly 10,000–20,000 genuinely useful indexed
pages.** Wise gets ~177 visits/page; you will not.

### Timeline

**6–12 months to meaningful organic traffic on a new domain; 18–24 months to 1M
pageviews/month.** Treat anyone promising faster as selling something.

### AI Overviews

Organic CTR for informational queries with AI Overviews **dropped 61%** (Seer
Interactive, 3,119 queries). Your `kaise` content play is in the blast radius.
Transactional listing queries are safer.

---

## 6. Instagram funnel — what 50k followers is actually worth

**CTR is measured against profile visits, not followers.** Benchmarks: 1–3%
industry standard, 5–10% high-intent niches, <1% lifestyle.

A 50k account might see 3,000–8,000 profile visits/month. At 1–3%:
**30–240 clicks/month.** Even generously at 2,000–5,000 sessions/month, 2 pages
per session, $0.50 RPM → **₹176–₹440/month.**

**As a direct AdSense traffic source it is a vanity input.**

**As a sales channel it is the most valuable asset in the plan:**

1. **AdSense approval evidence** — real referral traffic clears the "attracts an
   audience" bar. Possibly its single highest-value use.
2. **Direct employer sales** — the ₹2,500 featured-listing offer runs entirely on
   Instagram + WhatsApp, no website needed.
3. **Affiliate distribution** — 200 high-intent clicks beats 200 ad impressions by
   orders of magnitude.

Note freshersvoice runs a 178K-follower Instagram account — the format works, and
you're not first.

---

## 7. Faster revenue at low traffic

| Path | Time to ₹10,000 | Note |
|---|---|---|
| **Employer featured listings** | **2–4 weeks** | 4 × ₹2,500. No website required. |
| Affiliates | 6–10 weeks | **Coursera: 15–45% commission, 30-day cookie** (verified). One conversion ≈ ₹800 ≈ **1.6M pageviews of AdSense** |
| Resume review ₹499 | 6–10 weeks | Near-100% margin |
| Sponsored Instagram/WhatsApp broadcast | Immediate | Monetizes the account directly, zero traffic needed |
| AdSense | 6–12 months | ₹10,000 needs ~228,000 pageviews |

> **upGrad, Simplilearn, Great Learning affiliate pages 404'd — commission rates
> NOT VERIFIED.** Apply directly and get a rate card in writing. Only Coursera is
> confirmed.

---

## 8. Gaps

- **India-only RPM is derived**, not published (APAC $1.69 discounted by the ~11%
  India/US CPC ratio). Google publishes no country-level figures.
- **Social vs organic session RPM**: mechanism confirmed by Ezoic ("upstream
  sources… organic vs social" is a named EPMV driver), magnitude not sourced.
  "Roughly half" is arithmetic from pages/session, not a citation.
- **India-specific time-to-traffic**: no cited source found; the 6–12 month figure
  is inference from general pSEO data.
- **Ad creative categories** served to this audience: not verified — requires live
  browser rendering.
