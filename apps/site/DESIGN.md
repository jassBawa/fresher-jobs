---
name: PehlaJob
description: A fresher job board built as the Indian job feed its readers already know — navy bar, thumbnail cards, sidebar — with every thumbnail generated from the listing's own columns.
colors:
  ink: "#12161a"
  ink-2: "#48525c"
  ink-3: "#616b75"
  paper: "#ffffff"
  page: "#eef1f5"
  ground-2: "#f4f6f8"
  rule: "#dce2e8"
  rule-strong: "#12161a"
  navy: "#13224b"
  navy-dark: "#0e1936"
  navy-lift: "#1e3068"
  on-navy: "#ffffff"
  on-navy-2: "#b9c7e4"
  live: "#0b6b35"
  live-field: "#0b6b35"
  live-field-press: "#095a2c"
  on-field: "#ffffff"
  soon: "#8a4700"
  closed: "#59636d"
  tg: "#1268b3"
  wa: "#0f7a41"
  li: "#0a5a8a"
  focus: "#0b6b35"
typography:
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "clamp(1.375rem, 1.05rem + 1.6vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  brand:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  card-title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.08em"
  mark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.06em"
  fine:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0"
  focus: "1px"
  dot: "50%"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  gutter: "1.125rem"
  shell: "70rem"
  measure: "44rem"
  side: "20rem"
  rail: "6.5rem"
components:
  bar:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.125rem"
  strip:
    backgroundColor: "{colors.navy-dark}"
    textColor: "{colors.on-navy-2}"
    typography: "{typography.fine}"
    rounded: "{rounded.none}"
  menu-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0"
  head:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.125rem"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.none}"
    padding: "1.5rem"
  card-closed:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
  chip:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    typography: "{typography.fine}"
    rounded: "{rounded.none}"
    padding: "0.15rem 0.75rem"
  side:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.none}"
    padding: "1rem"
  apply:
    backgroundColor: "{colors.live-field}"
    textColor: "{colors.on-field}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 1.5rem"
    height: "3rem"
  apply-hover:
    backgroundColor: "{colors.live-field-press}"
    textColor: "{colors.on-field}"
  apply-dead:
    backgroundColor: "transparent"
    textColor: "{colors.closed}"
    rounded: "{rounded.none}"
    padding: "0 1.5rem"
    height: "3rem"
  join-telegram:
    backgroundColor: "{colors.tg}"
    textColor: "{colors.on-field}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "3rem"
  join-whatsapp:
    backgroundColor: "{colors.wa}"
    textColor: "{colors.on-field}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "3rem"
  share-linkedin:
    backgroundColor: "{colors.li}"
    textColor: "{colors.on-field}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "2.5rem"
  ad-slot:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-3}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.none}"
    padding: "0.75rem"
  foot:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy-2}"
    rounded: "{rounded.none}"
    padding: "2rem 1.125rem 3rem"
---

# Design System: PehlaJob

## Overview

**Creative North Star: "Feed Standard"**

The reference object is the Indian fresher-jobs feed this audience already reads daily: a navy bar of category menus, a column of thumbnail cards, a sidebar of what closes next. The format was not chosen for novelty. It was chosen because it is the one this reader can already operate without being taught — they arrive from a WhatsApp forward or a search result, and every affordance is where their thumb expects it.

What separates this from a skin over that format is the thumbnail. On the sites this borrows from, each posting's card is drawn by hand in a graphics tool, which is why only the recent or important ones have one and the rest of the feed is bare text. Here every field on that card — company, role, batch, salary, location — is already a column in Postgres, so the card is *rendered* rather than drawn. It exists for every listing without exception, it updates when the facts do, and it costs nobody an afternoon in Canva. The same drawing serves twice: 1200×630 as the `og:image` on the share card, and 800×600 as the feed thumbnail, because 1.91:1 stretched to a card's height loses a third of its width to cropping.

The system's discipline is that **only one colour ever means anything**. Navy is chrome — the bar, the date strip, the footer, the thumbnail's banner — and carries no information. Grey is ground. Green (`#0b6b35`) says exactly one thing, *this is open, apply here*, and appears nowhere decorative: not in the brand, not as a tint, not as a badge. The brand splits by tone instead of hue for precisely this reason.

Everything is built for a mid-range Android phone held at arm's length in daylight, on mobile data. The site ships **zero JavaScript**: search is a GET form, the category menus are `<details>` elements, and the only third-party script is AdSense once `NEXT_PUBLIC_ADSENSE_CLIENT` is set.

**Key Characteristics:**
- Every listing has a generated thumbnail; there is no "no image" state to design around.
- One green, one meaning. Navy is chrome, grey is ground, green is the only colour that carries information.
- Status is a drawn glyph plus a word; colour never carries meaning alone.
- Content always sits on paper; the navy never touches body text.
- Ad heights reserved up front; zero layout shift when the script goes live, and never above the first content block.
- All 24 foreground/background pairs clear 4.5:1 — measured, not eyeballed.
- Zero JavaScript ships. Archivo self-hosted as two woff2 subsets.

## Colors

A cool-grey page under white paper, with deep navy chrome and one committed green.

Every foreground/background pair in the system clears 4.5:1, verified by measuring all 24 rather than by eye. The pairs most easily got wrong are the reversed ones — Field White at 6.63:1 on green, Bar Light at 9.10:1 on navy and 7.36:1 on the menu hover — and quiet ink, which is measured against the *darkest* ground it ever sits on rather than against white. See The Contrast Guard.

### Primary
- **Committed Green** (`{colors.live}` / `{colors.live-field}`): The one hue that means something. It owns the apply action, the "open" status mark, the in-card call to action, the sidebar's "see all", the focus ring, and the thumbnail's APPLY NOW bar. It is never a tint, a badge fill, a brand accent, or a background for body text.
- **Press Green** (`{colors.live-field-press}`): The apply action's hover ground, filling background and border together so the block darkens as one shape.
- **Field White** (`{colors.on-field}`): Reversed type on any green or channel ground.

### Chrome
- **Bar Navy** (`{colors.navy}`): The main bar, the footer, and the thumbnail's banner. Structure only — it never encodes state.
- **Strip Navy** (`{colors.navy-dark}`): The date strip above the bar, one step deeper so the two bands separate without a rule.
- **Lift Navy** (`{colors.navy-lift}`): The hover and open ground for a bar item, and the bar's search field.
- **Bar White** (`{colors.on-navy}`): The brand, an active bar item, and footer links.
- **Bar Light** (`{colors.on-navy-2}`): Resting bar items, the date strip, the footer's body copy, and the second half of the brand — tone, not hue, so the brand never borrows the action green.

### Neutral
- **Ink** (`{colors.ink}`): Headings, card titles, values in every key-value rail. 18.18:1 on paper.
- **Ink Two** (`{colors.ink-2}`): Card excerpts, closed listings, the scan table's date column.
- **Ink Three** (`{colors.ink-3}`): Labels, meta lines, counts, the ad marker. Held at 4.79:1 against `page`, the darkest ground it ever sits on — the previous value cleared white and failed there.
- **Paper** (`{colors.paper}`): Every content surface. Content never sits directly on the page ground.
- **Page** (`{colors.page}`): The ground behind the cards, visible only as the gaps between them.
- **Ground Two** (`{colors.ground-2}`): Chip fills and hover states inside paper.
- **Rule** (`{colors.rule}`): Every hairline. **Rule Strong** (`{colors.rule-strong}`) is reserved for the two places a border must read as structural: the search control and the scan table's header.

### State and channels
- **Soon** (`{colors.soon}`) and **Closed** (`{colors.closed}`): Status only, and never without their glyph and word.
- **Telegram / WhatsApp / LinkedIn** (`{colors.tg}` / `{colors.wa}` / `{colors.li}`): Each network's own identity, darkened until white type clears 4.5:1 — 5.74, 5.41 and 7.39 respectively. They are borrowed identity, not palette, and appear only on a button that opens that network.

### Named Rules
- **One Green, One Meaning** — `{colors.live}` says *this is open, apply here*. If a green appears anywhere it does not mean that, it is a bug.
- **Chrome Says Nothing** — navy is structure. The moment navy encodes a state, the reader has two colour systems to learn.
- **Content On Paper** — body text never sits on `{colors.page}` or on navy. The page ground is the gap between cards, nothing more.
- **The Contrast Guard** — quiet ink is measured against `{colors.page}`, and reversed type against its own ground, never against white.

## Typography

One family, Archivo, self-hosted as two woff2 subsets — the second carries ₹ (U+20B9), without which every salary line breaks.

### Hierarchy
- **Title** (`{typography.title}`): One per page, in the head band. The only fluid step.
- **Brand** (`{typography.brand}`): The bar's wordmark. The one fixed size above body.
- **Card Title** (`{typography.card-title}`): The feed's headline link, a hair above body so a screen of cards has a scan line.
- **Body** (`{typography.body}`): Everything else on a listing surface. Tabular numerals throughout, so batch years and salaries align down a column.
- **Label** (`{typography.label}`): Uppercase, letterspaced, at body size — key columns, section titles, chip keys.
- **Mark** (`{typography.mark}`): The status word beside its glyph.
- **Fine** (`{typography.fine}`): Meta lines, counts, the ad marker, legal copy. Never a listing's facts.

### Named Rules
- **Rank By Weight, Not Scale** — labels and values share one size and differ by case, weight and colour. There are four sizes in the system and three of them appear once per page.
- **Tabular Always** — `font-variant-numeric: tabular-nums` on `body`, so no number column ever wobbles.

## Layout

A 70rem shell holding a fluid main column and a 20rem sidebar, collapsing to one column below 64rem. Prose is capped at 44rem inside it regardless of how wide the shell gets.

The feed card is a two-column grid: thumbnail left, body right, side by side above 34rem and stacked below it, where a 280px image in a 320px column would be a stamp. The thumbnail is **centred** in its column rather than stretched — the body is always a little taller than a 4:3 image, and forcing the image to fill meant `object-fit: cover` sliced a third off both edges. The dividing rule lives on the body, which does run full height.

### Named Rules
- **Cards, Not Boxes-In-Boxes** — a card is paper with a hairline. Nothing nests a bordered panel inside another bordered panel.
- **Never Above The Fold's First Block** — no ad slot precedes the first content block on any page, so an ad can never be the LCP element.
- **Reserve Before You Fill** — ad heights are declared at the size the eventual unit occupies, before AdSense exists.

## Elevation & Depth

Effectively flat. One shadow exists in the entire system, under the open bar menu, because a panel overlapping content is the one place a hairline cannot establish which surface is in front.

### Named Rules
- **One Shadow, One Reason** — depth is only ever used to resolve overlap, never to decorate a resting surface.

## Shapes

Square. `{rounded.none}` everywhere; the only curves are the focus ring's 1px softening, the status glyphs, and the 3px separator dot in a card's meta line. A radius here would be the only curve on the page and would read as a different product.

## Components

### Bar
Navy, full width, holding brand, category menus and search. Menus are `<details>`/`<summary>` — no JavaScript, keyboard-accessible for free, and safe on touch where a hover menu is a trap. Below 48rem they wrap onto their own row rather than scrolling, because a panel inside an `overflow-x: auto` strip is clipped by it.

### Job Card
Generated thumbnail, title link, status and dates, fact chips, two-line excerpt, and a green way in. The thumbnail carries `alt=""` and is wrapped in an `aria-hidden` link: every word inside it appears as real text alongside, so it is decoration to a screen reader and information to everyone else.

### Status Mark
A drawn glyph plus a word — filled disc, clock, struck circle. Colour is never the only carrier.

### Apply Action
Full-width green block on a listing, with a note underneath stating that it opens the employer's own form in a new tab, and saying so only when the link has actually been checked.

### Sidebar
Closing this week, latest openings, channel buttons, a provenance note, then the ad. Ordered by what a returning visitor came for; the ad is last because above the fold in a sidebar is still above the fold. The channel buttons render only when a real channel URL is configured — a button that opens nothing is worse than no button for an audience already targeted by fake job channels.

### Ad Slot
Paper with a hairline, an uppercase marker that stays when the script goes live, and a reserved inner height per placement.

## Do's and Don'ts

### Do:
- Generate the thumbnail from the listing's columns; never require a hand-made asset.
- Keep green for "open / apply here" and nothing else.
- Pair every status colour with a glyph and a word.
- Put body content on paper, always.
- Measure quiet ink against `{colors.page}`, not white.
- Let the thumbnail keep its aspect ratio and centre it; do not stretch it to card height.
- Reserve ad height before the script exists.
- Keep the menus working with JavaScript disabled.

### Don't:
- Use green as a brand accent, a tint, or a badge fill.
- Let navy encode state.
- Add a border radius.
- Add a shadow to a resting surface.
- Place an ad above the first content block, or enable Auto Ads.
- Introduce a fifth type size to create hierarchy — use weight, case and colour.
- Ship a channel button whose URL is not configured.
