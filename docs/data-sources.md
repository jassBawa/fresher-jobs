# Data sources

Every source below was tested live in August 2026. Job counts marked "measured"
were counted directly; "projected" means extrapolated from a sample.

---

## 1. Summary

| Source | India jobs | Auth | Legal risk | Status |
|---|---|---|---|---|
| **Workday CXS** | ~31,900 projected | none | Low | ✅ Build first |
| **apna.co sitemap** | 31,949 active + 20,000 external (measured) | none | Med — ToS unread | ⚠️ Read ToS |
| **Greenhouse** | ~6,900 projected | none | Low | ✅ Verified |
| **Keka** (India-native) | 5,075 measured, ~100% India | none | Low | ✅ Best efficiency |
| **Ashby** | ~12 per 84 tokens (0.4%) | none | Low | ✅ Cheap top-up |
| **SmartRecruiters** | untested at scale | none | Low | ✅ Endpoint verified |
| Lever | ~72 projected | none | Low | ❌ Skip — worthless |
| BambooHR | **0 measured** | none | Low | ❌ Skip |
| Darwinbox | — | Cloudflare Turnstile | **High** | ❌ Blocked |
| Zoho Recruit | ~3 India tenants of 29 | browser-only SPA | Med | ❌ Not worth it |
| NCS (ncs.gov.in) | — | **encrypted API payloads** | **High** | ❌ Do not |
| Naukri | — | `Disallow: /` | **High** | ❌ Off limits |
| WorkIndia / Jobhai | — | CloudFront 403 to bots | High | ❌ Blocked |
| **freshersworld.com** | — | **HTTP 403 to all non-browser clients** | — | ❌ Closed |
| **freshersdunia.in** | WP REST API open | none | See §5 | ⚠️ Facts only |

**Realistic total from the green rows: ~75,000 India jobs, free and legal.**

---

## 2. Verified endpoints

All return HTTP 200 with **no authentication**.

```
Greenhouse      GET  https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
Lever           GET  https://api.lever.co/v0/postings/{company}?mode=json
Ashby           GET  https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
SmartRecruiters GET  https://api.smartrecruiters.com/v1/companies/{company}/postings
Arbeitnow       GET  https://www.arbeitnow.com/api/job-board-api
Remotive        GET  https://remotive.com/api/remote-jobs
Adzuna          GET  https://api.adzuna.com/v1/api/jobs/in/search/1   (requires app_id + app_key)
```

### Keka — two unauthenticated calls

```
1. GET https://{tenant}.keka.com/careers/api/organization/default/careerportalinfo
   → tenant GUID is embedded in the JSON (in careersBackgroundPath)
2. GET https://{tenant}.keka.com/careers/api/embedjobs/default/active/{GUID}
   → array of jobs with full HTML descriptions
```

Measured across 306 discovered tenants: **247 returned jobs (81%), 5,075 jobs
total, avg 20.5/tenant, essentially 100% India.** Largest: `kpgroup` (915),
`toprankers` (115), `nimt` (102).

### Workday CXS — two-step, and one critical trap

```
1. POST https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
   {"appliedFacets":{},"limit":1,"offset":0,"searchText":""}
   → walk .facets for a node whose descriptor == "India"
   → capture its parent facetParameter (usually "locationHierarchy1") and node id

2. POST same URL with:
   {"appliedFacets":{"<param>":["<id>"]},"limit":20,"offset":0,"searchText":""}
   → .total is the exact India count; paginate via offset
```

> ⚠️ **Never use `searchText:"India"`.** It text-matches "Indiana" and
> "Indianapolis" and inflated one estimate from 32k to 82k — Papa John's
> "258 India jobs" were all in Tennessee. The facet GUID is **tenant-specific**,
> so step 1 is mandatory per tenant.

---

## 3. Token enumeration — already solved

`https://github.com/Feashliaa/job-board-aggregator` — **MIT licensed**, refreshed
daily by GitHub Actions. Verified live:

```
.../main/data/greenhouse_companies.json    8,333 entries
.../main/data/workday_companies.json      12,884 entries   ← the valuable one
.../main/data/icims_companies.json        10,108
.../main/data/bamboohr_companies.json     11,316
.../main/data/lever_companies.json         4,368
```

Raw URL prefix: `https://raw.githubusercontent.com/Feashliaa/job-board-aggregator/`

**The Workday file is the prize** — it ships the full tri-part key
`tenant|wdN|site` (e.g. `2020companies|wd1|external_careers`), which is the
genuinely hard part to guess.

### Validation (random samples, live)

| List | Sampled | Live rate | India/token | Projection |
|---|---|---|---|---|
| Greenhouse | 120 | 64.2% | 0.83 | ~6,900 |
| Workday | 150 | 42.0% | 2.47 | ~31,900 |
| Lever | 120 | 44% | 0.017 | ~72 |
| BambooHR | 120 | 73% | 0 | 0 |

### Methods that DON'T work

- **Certificate transparency — dead twice over.** crt.sh returns HTTP 404 on all
  queries right now (use `api.certspotter.com/v1/issuances?domain=X&include_subdomains=true`
  instead). More fundamentally, **every ATS uses wildcard certs** (`*.keka.com`,
  `*.darwinbox.in`, `*.ashbyhq.com`) — zero per-tenant certificates exist. And
  Greenhouse/Lever/Ashby put the token in the **path**, not a subdomain, so CT was
  never applicable to them.
- **Common Crawl for Anglo ATS — 90% redundant.** One index yielded 146 Greenhouse
  tokens; **131 were already in the GitHub list**, and several novel ones were junk.

### Where Common Crawl IS essential: India-native ATS

No public list exists for Keka/Darwinbox/Zoho. Working recipe:

```bash
curl "https://index.commoncrawl.org/CC-MAIN-2026-30-index?url=keka.com&matchType=domain&output=json"
```

One index yielded **306 Keka tenants**, 13 Darwinbox, 29 Zoho Recruit. Union
across ~12 monthly indexes should multiply this. **The index rate-limits hard —
serialize with a 2–3s sleep or you get 503s.**

---

## 4. Own measurements

### US-tech-heavy ATS tokens

56 tokens → 35 live boards → **7,514 jobs → 320 India (4.3%)**, 9.1 India jobs
per live company.

### Indian company slugs

92 slugs across Greenhouse/Lever/Ashby → **12 live (13% hit rate)** → 343 jobs →
**127 India/remote (37%)**, 10.6 per hit.

| Company | ATS | Total | India | % |
|---|---|---|---|---|
| phonepe | greenhouse | 79 | 61 | 77% |
| groww | greenhouse | 8 | 8 | 100% |
| atlan | ashby | 5 | 5 | 100% |
| cred | lever | 4 | 4 | 100% |
| netradyne | greenhouse | 30 | 15 | 50% |
| druva | greenhouse | 28 | 12 | 43% |

**Conclusion:** Indian companies largely don't use Western ATSs (13% hit rate),
but when they do, India density is **8× higher** (37% vs 4.3%). The Western ATS
feed gives you **premium GCC/MNC India roles** — high quality, low volume. Mass
Indian IT volume lives on India-native platforms.

### Efficiency comparison

| ATS | India jobs per token |
|---|---|
| **Keka** | **16.6** |
| Greenhouse | 0.83 |
| Ashby | 0.14 |
| Lever | 0.017 |
| BambooHR | 0 |

**Keka is 20× more efficient than Greenhouse.** Chasing Anglo ATSs harder is the
expensive path; adding one India-native ATS beat 8,333 Greenhouse tokens per unit
of effort.

---

## 5. The two sites this project actually reads

### freshersworld.com — CLOSED

**HTTP 403 to every non-browser client** — homepage, job pages, even `robots.txt`.
Actively blocking. Using it requires defeating bot protection. **Do not.**

### freshersdunia.in — open API, but rights reserved

WordPress REST API is fully open:

```
GET https://freshersdunia.in/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc
    &_fields=id,slug,link,date,title,content
GET https://freshersdunia.in/wp-json/wp/v2/categories?per_page=100     (100 categories)
```

Returns full post content, updated daily. Sitemap: `/sitemap_index.xml`.

**But `robots.txt` carries an explicit machine-readable reservation:**

```
Content-Signal: search=yes, ai-train=no, use=reference
User-agent: ClaudeBot     Disallow: /
User-agent: GPTBot        Disallow: /
User-agent: CCBot         Disallow: /
User-agent: Google-Extended  Disallow: /
User-agent: Bytespider    Disallow: /
```

Framed as *"a condition of accessing this website"* and citing **Article 4 of EU
Directive 2019/790** as an express reservation of rights.

**Our position:** facts are not copyrightable; expression is. The pipeline
extracts structured facts and discards all prose — see
[pipeline.md](./pipeline.md) and [decisions.md](./decisions.md). Their article
text is never written to disk and never reaches the drafting stage.

---

## 6. Legal position

**Scraping law.** *hiQ v. LinkedIn* established that scraping public,
unauthenticated data isn't CFAA "unauthorized access". But it settled with hiQ
enjoined on **breach-of-contract** grounds — the durable lesson being that
**CFAA is rarely the exposure; ToS contract and copyright in the listing text
are.** (Post-2024 developments NOT VERIFIED — confirm with counsel before scaling.)

This maps onto what was measured:

- **Public JSON APIs, no auth, no anti-bot** (Greenhouse, Lever, Ashby,
  SmartRecruiters, Workday CXS, Keka) — lowest risk. Published for syndication.
- **Encrypted payloads (NCS), CAPTCHA (Darwinbox), `Disallow: /` (Naukri)** — these
  are access controls. Crossing them moves you from "reading public data" to
  **circumvention**, which is where liability lives.

**Government notifications are the safest content available.** Section 52(1)(q) of
the Indian Copyright Act exempts government works from copyright. This remains the
**highest-value unexplored source** — state Rojgar Sangam portals and employment
exchanges were never researched.

**Google for Jobs.** Required `JobPosting` fields: `title`, `description` (HTML),
`datePosted` (ISO 8601), `hiringOrganization`, `jobLocation`. Recommended:
`baseSalary`, `employmentType`, `validThrough`, `identifier`. Postings with **no
way to apply are prohibited**. The Indexing API still accepts `JobPosting` — but
**default quota is 200/day**, described as for "onboarding and submission testing";
more requires approval.

---

## 7. Deduplication

Cheapest filter first:

1. **Exact key.** Most sources expose a stable ID (`identifier` in apna's JSON-LD,
   `id` in Keka, `JR…` requisition IDs in Workday). Free, instant, zero false
   positives.
2. **Canonical URL / ATS-native ID.** Prefer the ATS record over any aggregator
   copy — better data, cleaner attribution.
3. **Blocking key + fuzzy match.** Block on `(normalized_company, city)`, then
   compare normalized titles (strip seniority ornamentation, req numbers) with
   token-set ratio. ≥0.9 = duplicate.
4. **Salary as tiebreaker.** apna's structured INR min/max/unit is an unusually
   strong disambiguator.
5. **Employer aliasing.** Maintain a canonical-name map — "Everest Fleet Pvt. Ltd."
   / "Everest Fleet" / "EVEREST FLEET PVT LTD". **This is where naive dedupe fails
   on Indian data**, since legal-entity suffixes are applied inconsistently.
6. **Recrawl and expire.** Honour `validThrough`; 410 anything that disappears.

**Order matters: exact hash → SimHash/MinHash → embeddings, on a small bucket
only.** Most teams start with embeddings and burn money solving a problem
`sha256` already solved. Embeddings at 0.94 cosine will merge "Java Developer"
and "Senior Java Developer" at the same company — a real revenue loss.
