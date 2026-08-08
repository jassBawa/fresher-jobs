# Market research

Verified August 2026. Ad-stack findings come from direct HTML inspection of the
live sites and are hard evidence. Traffic figures come from third-party estimators
and are directional only — Semrush and HypeStat disagree by 25–35% on the same
domain, and both can be wrong by 2–5×.

---

## 1. Who actually runs display ads

Method: fetched each homepage and an inner page, grepped the HTML for
`googlesyndication`, `adsbygoogle`, `ca-pub-`, `ezoic`, `doubleclick`,
`securepubads`, `taboola`, `outbrain`, `mgid`, `adsterra`, `propellerads`,
`monetag`. Also checked `/ads.txt`.

### Job boards — every single one runs zero ads

| Site | Segment | Ad networks | How it earns |
|---|---|---|---|
| freshersworld.com | Freshers | **NONE** (only GTM) | ₹649/6mo, ₹899/yr jobseeker subscriptions; hand-sold banners; campus hiring |
| naukri.com | Tech | **NONE** | Recruiter subscriptions, database access |
| instahyre.com | Tech | **NONE** | Recruiter SaaS |
| cutshort.io | Tech | **NONE** | Recruiter SaaS |
| hirist.tech | Tech | **NONE** | Recruiter listings |
| iimjobs.com | Tech | **NONE** | Premium recruiter listings |
| wellfound.com | Tech | **NONE** | Startup recruiter product |
| foundit.in | Tech | **NONE** | Recruiter subscriptions |
| **apna.co** | Blue-collar | **NONE** — no `ads.txt` at all | Employer subscriptions |
| **workindia.in** | Blue-collar | **NONE served** — publisher ID declared in `ads.txt`, never shipped | ₹2,350 / ₹4,999 / ₹11,000 employer plans |
| **jobhai.com** | Blue-collar | **NONE** detected | Info Edge brand |
| quikr.com/jobs | Classifieds | **NONE** | — |

### Government-exam content sites — full ad stacks

| Site | Ad stack | `ads.txt` |
|---|---|---|
| **sarkariresult.com** | AdSense + GAM, `ca-pub-9222595088627935`, VDO.AI managed video | **138 lines / 49 SSPs** |
| **freejobalert.com** | AdSense + GPT header bidding | **232 lines / 78 SSPs** — only 6 lines are Google |
| **rojgarresult.com** | AdSense only, 17 `adsbygoogle` units | 1 line |
| freshersdunia.in | AdSense `ca-pub-9858276231415006` + Ezoic, 6 slots/page | — |
| freshersnow.com | AdSense `ca-pub-4331013316377739` | — |

### The conclusion

> The dividing line is **not** tech vs blue-collar. It is **transactional job board
> (employer-paid, zero ads)** vs **informational content site (ad-paid)**.

Blue-collar boards sit on the same side as tech boards. Both segments concluded
independently that display advertising doesn't pay here.

Two corollaries worth keeping in mind:

- **fresherslive.com pivoted its entire brand** to government jobs. Its title tag
  now reads *"Latest Government Jobs 2026 | Sarkari Naukri, Results & Admit Card"*.
  The market is telling you where the ad money is.
- **The audience is not worthless.** FreeJobAlert runs 78 unique SSPs with header
  bidding. Nobody builds a stack that deep for inventory nobody bids on.

---

## 2. Traffic

Semrush public overview pages, June 2026 data unless noted.

| Site | Monthly visits | MoM | Organic share |
|---|---|---|---|
| naukri.com | 20.15M | −4.1% | 16.1% |
| **sarkariresult.com** | **12.25M** | **+57.6%** | 30.7% |
| internshala.com | 7.59M | +22.5% | 22.9% |
| ambitionbox.com | 7.08M | — | **52.2%** |
| **freejobalert.com** | **6.07M** | −14.0% | 35.6% |
| glassdoor.co.in | 5.72M | −9.1% | 41.3% |
| **apna.co** | **4.26M** | +17% | 27.9% |
| wellfound.com | 3.8M | +1.9% | 18.3% (India = 38%) |
| foundit.in | 2.86M | +0.2% | 15.2% |
| **workindia.in** | **2.05M** | **−21.2%** | 20.5% |
| shine.com | 1.65M | +16.9% | 20.6% |
| ncs.gov.in | 1.22M | −7% | 19.9% |
| instahyre.com | 960K | −13% | 19.9% |
| cutshort.io | 630K | +6.5% | 16.2% |
| iimjobs.com | 375K | −17% | 12.3% |
| **freshersworld.com** | **203K** | volatile | 29.1% |
| timesjobs.com | 169K | −6.9% | 12.8% |
| freshersnow.com | 168K | −4.6% | **49.3%** |
| freshersdunia.in | ~68K (HypeStat) | — | — |

### Freshersworld is declining, and its media kit is stale

574K (2023) → 149K (Sep 2025) → 203K (Jun 2026). Its own `/advertise` page claims
**7.5M visits/month** — roughly **35× what Semrush measures**. Treat that deck as
years-old marketing.

### Specialist tech boards are brand businesses, not SEO businesses

Most of their organic traffic is people googling their own name:

| Site | Organic | From own brand name |
|---|---|---|
| wellfound.com | 309K | 56.2% |
| iimjobs.com | 57.3K | 45.6% |
| instahyre.com | 192K | 41.7% |
| cutshort.io | 54.5K | 40.6% |

apna.co's top 5 organic keywords are `apna`, `apna job`, `apna jobs`, `apna app`.
WorkIndia's top 5 are *all* brand/login terms. You cannot take brand searches.

---

## 3. The Hindi gap — the strongest finding

### Demand exists

Pulled from Google's autocomplete API (`suggestqueries.google.com`, `gl=in`).
These are real query strings ranked by frequency. **Exact volumes: NOT FOUND** —
keyword tools are login-gated. Patterns: high confidence.

**Hinglish (romanized):**
`job chahiye` · `job chahiye contact number` · `job chahiye urgent` ·
`naukri chahiye ghar baithe` · `naukri chahiye koi bhi` · `ghar baithe job kaise kare` ·
`ghar baithe job kaise dhundhe` · `delhi me job vacancy` · `delhi me job 12th pass` ·
`delhi me job rehna khana free` · `delhi me job kaise khoje`

**Devanagari — including English phrases transliterated into Devanagari:**
`जॉब वैकेंसी नियर मी` · `जॉब वैकेंसी इन दिल्ली` · `जॉब वैकेंसी 12th पास` ·
`जॉब वैकेंसी इन कानपुर फॉर फीमेल` · `नौकरी चाहिए मुझे` · `नौकरी चाहिए प्राइवेट` ·
`नौकरी चाहिए मोबाइल नंबर सहित` · `10वीं पास नौकरी वेतन 30 000`

### Supply does not

| Site | `hreflang` | Devanagari in HTML | Devanagari URLs |
|---|---|---|---|
| apna.co | **`en-IN` only** | **0** | 0 |
| workindia.in | none | **0** | 0 |
| freejobalert.com | none | 16 (UI labels) | **0 of 13,829 sampled** |
| sarkariresult.com | none | 8 | 0 |
| rojgarresult.com | none | 6 | 0 |

**Not one incumbent serves a single Hindi-language page.** apna.co explicitly
declares itself English-India-only.

### Three behavioural signatures to design around

1. **Voice search.** `नौकरी चाहिए मोबाइल नंबर सहित` and `job chahiye urgent contact number`
   are spoken, not typed — long, conversational, and they demand a **phone number**.
2. **Question format.** `kaise kare` / `kaise dhundhe` / `kaise khoje` is informational
   intent. A listing page can't satisfy it; a content page can — and informational
   intent is the **only AdSense-compatible surface** here.
3. **Hyper-specific intent with zero competition.** `delhi me job rehna khana free`
   (job with free lodging and food). Nobody is writing this page.

---

## 4. Programmatic SEO patterns

### Freshersworld — ~18,194 URLs, and one enormous gap

Sitemap index at `/sitemap-index.xml` (note: `/sitemap.xml` 404s).

| Sitemap | URLs | Pattern |
|---|---|---|
| designation | 3,497 | `/net-core-developer-jobs/151510059` |
| activejobs | 3,142 | `/jobs/senior-manager-jobs-opening-in-…` |
| companies | 1,415 | `/jio-platform-ltd-recruitment-jobs/44444949` |
| skills | 386 | `/abap-jobs/3535046` |
| cities | 360 | `/jobs-in-hyderabad/999903705` |
| **frequently-searched-jobs** | **40** | `/accountant-jobs-in-bangalore/11110013365` |

**The gap:** 386 skills × 360 cities ≈ **139,000 possible `<role>-jobs-in-<city>`
pages. They have built 40** — 0.03%. Skill pages and city pages exist as separate
dimensions, never combined. This is the highest-intent template in the vertical
and it is essentially unclaimed.

### WorkIndia — the copyable part

**120,000+ hyperlocal pages** of the form `{category}-jobs-in-{locality}-{city}`:
`back-office-jobs-in-gandhi-nagar-ranchi`, `nurse-jobs-in-chikkadpally-hyderabad`.

Their top categories reveal real demand distribution: delivery (592),
customer-support (572), call-center (572), telesales (571), telecalling (571),
BPO (571), data-entry (530), back-office (527).

**Note the parallel gendered taxonomy** — `telecalling-female` (495),
`customer-support-female` (495), `call-center-female` (495), `bpo-female` (495).
They built it because it converts. Autocomplete confirms it independently
(`job vacancy near me for female`, `ghar baithe job for female`). **English listings
only — nobody covers it in Hindi content.**

### FreeJobAlert — not copyable

~53,829 URLs. Classified from a 13,829 sample: `recruitment` 56.5%, `apply-online`
20.0%, `result` 19.9%, `admit-card` 4.8%, `answer-key` 2.6%.

But the "recruitment" pages are **government exam notifications**, not jobs, and
**30%+ of pages are pure exam-lifecycle content** (results, admit cards, answer
keys). Its traffic is also brand-driven — `free job alert` alone is **41.1%** of
its organic traffic. That's a decade-old brand moat, not a repeatable template.

---

## 5. Competitor business models

| Company | Model | Financials |
|---|---|---|
| **WorkIndia** | Employer subscriptions: ₹2,350 (30d), ₹4,999 (90d), ₹11,000 (365d) | FY25 revenue **₹78.7 Cr** (+25%), loss **₹23.06 Cr**. Raising ₹114 Cr at ₹803 Cr valuation |
| **apna.co** | Employer listings + courses | FY22 revenue ₹64 Cr, losses up 4×. FY23–25 **NOT FOUND** |
| **Jobhai** | Info Edge brand (with Naukri, FirstNaukri, 99acres, AmbitionBox) | Not separately disclosed |
| **Freshersworld** | ₹649/6mo + ₹899/yr subscriptions, hand-sold ads, campus hiring | Rate card **NOT PUBLISHED** |

**The read:** India's biggest blue-collar player does ₹78.7 Cr and still loses
₹23 Cr selling employer subscriptions. That's a brutally expensive sales-led
business you can't fight head-on — but it also means **nobody is defending the
free, ad-supported content layer above it.**

---

## 6. Data quality warnings

- **Semrush contains obvious junk.** It reports sarkariresult organic traffic of
  53.95M against 12.25M total visits (impossible), and lists glassdoor.co.in's #1
  keyword as "xxnx". Treat individual keyword rows with suspicion.
- **HypeStat's traffic-source splits are unusable** — it claims 91.63% direct for
  freshersdunia and 89.86% for fresherslive. A WordPress SEO blog does not get 90%
  direct traffic. Its visit counts are weakly directional at best.
- **HypeStat's revenue estimates are worthless.** It models apna.co at $220/day
  despite apna serving **zero ads**. It's applying a flat India-wide RPM constant.
- Freshersworld's +103% MoM June swing is almost certainly a measurement artifact.
- **No Semrush profile at all** for: indeed.co.in, updazz, freshers.in, fresherslive,
  freshersvoice, hirist, jobhai. That absence is itself a signal about their size.

**The only hard facts in this document are the ad-stack findings, sitemap counts
and API measurements** — those were pulled directly from the sites.
