# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indian freshers and early-career candidates — final-year students and 0–2 year
graduates, mostly on mid-range Android phones on mobile data, often in tier 2/3
cities. They arrive from search or a WhatsApp forward with one question:
**"can I apply for this, yes or no?"** and they answer it in about 20 seconds by
checking batch year, qualification, location and deadline. If the answer is yes
they leave immediately for the employer's application form. Time on page is not
the goal; a correct decision is.

A second, later audience (Phase 3, not built) is the Hindi-language job seeker —
verified demand with zero incumbent supply. See `docs/decisions.md` D4.

## Product Purpose

Take job postings scattered across aggregators, extract the **facts**, and
republish them as pages that answer the eligibility question faster than the
source did. Success is a candidate reaching the right official application link
having wasted no time on a listing they were never eligible for.

## Positioning

Two things a neighbouring site could not truthfully copy:

1. **Facts-only provenance.** The pipeline holds source prose in memory only long
   enough to extract structured fields, never writes it to disk, and generates
   its own copy from the facts (`docs/decisions.md` D10). Competitors respin
   articles; this does not.
2. **Deliberate restraint about what gets indexed.** Most individual listings are
   `noindex`; cluster pages are the surface that competes in search (D5, D15).
   The category norm is the opposite — publish every listing and hope.

## Operating Context

- Discovery is search and WhatsApp forwards, not a homepage visit. **Most sessions
  land deep on a listing or cluster page**, so every page must be self-sufficient:
  it needs its own navigation back into the site, not just a back button.
- Mobile-first, frequently on slow connections. Mid-range Android, small screens.
- Listings go stale fast. A posting expires on its stated deadline, or 60 days
  after posting when it states none — which is the common case (D14).
- Content is machine-drafted from facts and **human-approved before publishing**
  (`pnpm run promote`). Nothing self-publishes.

## Capabilities and Constraints

- **Astro static site.** No server, no database, no client framework. Output is a
  plain `dist/` directory. Content comes from markdown with YAML frontmatter
  validated by a shared zod schema (`@jobs/schema`).
- **Page types that exist:** homepage, individual listing (`/jobs/{slug}/`),
  cluster pages (role, city, role-in-city, company, batch year), 404, sitemap,
  robots.
- **Fields available per listing:** title, description, company, role, jobType,
  batchYears, locations, salary, lastDateToApply, applyByDate, applyUrl, skills,
  generatedBy, postedAt, sourceRef. Body markdown adds a quick-facts table, Who
  Can Apply, About the Role, What You Need, What You'll Do, How to Apply.
- **Salary is unreliable.** Source values are estimates, frequently marked
  "(Expected)". Never presented as authoritative; excluded from structured data.
- **Some listings have no apply link.** Those are published without one rather
  than pointing at a company homepage. The UI must handle their absence.
- **Expired listings keep their URL**, lose the apply button, and say so.
- **AdSense is not approved yet.** Slots must be reserved as fixed-height space
  now so that adding the script later causes **zero layout shift**. Auto Ads are
  ruled out — manual slots only, never above the LCP element (D6 notes).
- **English only in this build.** `lang="en-IN"`. The font stack must already
  render Devanagari so the Hindi layer (D4) does not force a redesign.
- **Working name: "PehlaJob"** — Hinglish for "first job". Provisional pending
  the domain decision (D2). It is a single token in the layout, built to be
  swapped.

## Brand Commitments

Voice is already fixed by the drafting prompt and enforced in review: plain
Indian English, short sentences, **no hype**. The words "exciting opportunity",
"look no further" and "we are seeking a passionate" are explicitly banned, and
first-person employer voice is a review-gate failure. The interface copy must
match that register — factual, direct, never salesy.

## Evidence on Hand

- **13 published listings, 16 cluster pages**, real data ingested from a live
  source: Amazon, Deloitte ×2, Wipro ×2, Honeywell ×2, EY, HCLTech, Siemens EDA,
  American Express, Medpace, Salesforce.
- Verified market research in `docs/` — competitor ad inspection, AdSense RPM
  from Google's own dataset, the Hindi supply gap, data-source measurements.
- **No testimonials, no user counts, no traffic figures, no employer
  relationships.** None exist. Future work must not invent social proof, "trusted
  by" claims, application counts, or company logos implying partnership.
- No brand assets: no logo file, no chosen palette, no licensed fonts.

## Product Principles

1. **Answer the eligibility question above everything else.** Batch, qualification,
   location, deadline are the load-bearing facts. Everything else is secondary.
2. **The visitor is meant to leave.** The apply link is the success state, not a
   bounce. Do not obstruct it to inflate engagement.
3. **Never imply a fact the pipeline cannot stand behind.** Estimated salary is
   labelled as estimated; a missing deadline is not invented.
4. **Assume a deep, mobile, first-time landing.** Each page carries its own way
   into the rest of the site.
5. **Ads pay for the site, not the other way round.** Space is reserved
   deliberately and never allowed to displace or shift the content the visitor
   came for.

## Accessibility & Inclusion

Mid-range Android on mobile data is the design target, so weight and legibility
matter more than polish: readable at arm's length in daylight, tap targets sized
for thumbs, and full functionality without JavaScript — the site ships none.
