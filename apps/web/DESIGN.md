---
name: PehlaJob
description: A fresher job board built as the confirmation screen its readers already know — outcome first, proof second, one action last.
colors:
  ink: "#12161a"
  ink-2: "#4a545e"
  ink-3: "#67717b"
  ground: "#ffffff"
  ground-2: "#f4f6f8"
  rule: "#dde3e8"
  rule-strong: "#12161a"
  live: "#0b6b35"
  live-field: "#0b6b35"
  live-field-press: "#095a2c"
  on-field: "#ffffff"
  live-on: "#eaf4ee"
  live-on-2: "#cfe3d7"
  soon: "#8a4700"
  closed: "#59636d"
  closed-on-2: "#dbdfe3"
  focus: "#0b6b35"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "clamp(1.375rem, 1.05rem + 1.6vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.08em"
  mark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.06em"
  fine:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Noto Sans Devanagari', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
rounded:
  none: "0"
  focus: "1px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  gutter: "1.125rem"
  measure: "44rem"
  rail: "6.5rem"
components:
  status-field:
    backgroundColor: "{colors.live-field}"
    textColor: "{colors.live-on}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.125rem"
  status-field-closed:
    backgroundColor: "{colors.closed}"
    textColor: "{colors.live-on}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.125rem"
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
  row:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.5rem 0"
  row-closed:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
  nav:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.125rem"
  ad-slot:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0 0"
---

# Design System: PehlaJob

## Overview

**Creative North Star: "The Confirmation Screen"**

The reference object is the transaction confirmation this audience reads a hundred times a month: the outcome states itself first in a field that owns the full width of the viewport, the facts that prove it follow as key-value rails, and one unmissable action closes the page. Nothing is decorated, because a confirmation screen that decorated itself would be suspicious. The whole system is built for a mid-range Android phone held at arm's length in daylight, on mobile data, by someone who wants a yes-or-no answer in twenty seconds and then wants to leave.

It refuses the vertical's two defaults with equal force. There is no sarkari bordered results table: no cell borders, no boxed grid, no coloured header bands. There is no SaaS job board either: no rounded cards, no shadows, no chips floating on tinted surfaces, no gradients. Separation is done by a single hairline and by whitespace. What remains is white ground, near-black ink, and one committed green that only ever appears at region scale — as a full-bleed field or as a full-width action — never as a decorative tint.

The most consequential decision is that rank is never carried by size. Every listing surface is set at exactly one type size; hierarchy is produced by weight, case, colour, reversal and rule. Each page gets exactly one display moment, its heading inside the status field, and nothing else on the page is permitted to grow. The system ships zero JavaScript; the single third-party script is AdSense, and only once `PUBLIC_ADSENSE_CLIENT` is set.

**Key Characteristics:**
- One type size across every listing surface; one display moment per page.
- Status is a drawn glyph plus a word; colour never carries meaning alone.
- Full-bleed colour fields, hairline separation, zero cards and zero shadows.
- Fixed key column so the value edge never moves between page types.
- Ad heights reserved up front; zero layout shift when the script goes live.
- Every foreground/background pair clears 4.5:1 — measured across seventeen pairs, not eyeballed.
- Zero JavaScript ships; Archivo self-hosted as two woff2 subsets (67.6KB total).

## Colors

A white-ground, near-black-ink neutral field with one committed green that commits at region scale, plus two state colours that never appear without a glyph and a word beside them.

Every foreground/background pair in the system clears 4.5:1, verified by measuring seventeen pairs rather than by eye — including the pairs most easily got wrong, the reversed type inside the status fields: Field White at 6.63:1 on green and 8.37:1 on Press Green, Field Reverse Two at 4.93:1 on green, Closed Reverse Two at 4.57:1 on slate. Reversed type is measured against its own ground and quiet ink against Ground Two, never against white; see The Contrast Guard.

### Primary
- **Committed Green** (`{colors.live}` / `{colors.live-field}`): The one committed hue. It owns full-width status fields, the full-width apply action, the current-item underline in the category strip, the brand dot, the focus ring, and the `theme-color` meta. It is never used as a light tint, a badge fill, or a background for body text.
- **Press Green** (`{colors.live-field-press}`): The apply action's hover and press ground, filling both background and border so the block darkens as one shape. The only place the committed green appears at a second value.
- **Field White** (`{colors.on-field}`): The bright end of reversed type — the display heading on any status field, and the apply action's label.
- **Field Reverse** (`{colors.live-on}`): The reversed value of a status mark sitting inside a green field, stated by direct rule because green on green is invisible. Also the `::selection` foreground — the browser surfaces we did not draw still belong to the world.
- **Field Reverse Two** (`{colors.live-on-2}`): The meta line on an open green field, one step back from the bright end.

### Secondary
- **Deadline Amber** (`{colors.soon}`): The closing-soon state only. It exists because "closes this week" is a different fact from "open", and a reader must be able to distinguish them without relying on hue — so it always ships with the clock glyph and the word "Closing".
- **Closed Slate** (`{colors.closed}`): The lower register. It fills the closed status field on expired listings and the 404, colours the closed mark, and colours the disabled apply block.
- **Closed Reverse Two** (`{colors.closed-on-2}`): The meta line and the status mark on a closed slate field — the same one-step-back position `{colors.live-on-2}` holds on green.

### Neutral
- **Ink** (`{colors.ink}`): Body text, company names, the strong masthead rule, the skip link's ground.
- **Ink Two** (`{colors.ink-2}`): The demoted register. Closed rows drop their company, role and values to this before they drop out of the page.
- **Ink Three** (`{colors.ink-3}`): Micro-labels, key columns, posted dates, fine print, the advertisement marker, and both masthead lines. This is the lightest ink permitted on text anywhere in the system, on any ground.
- **Ground** (`{colors.ground}`) / **Ground Two** (`{colors.ground-2}`): The page ground, and the quiet band used by the category strip and the footer. Ground Two is the only tinted surface in the system.
- **Hairline** (`{colors.rule}`): Every separation job on the page — row separators, section tops, link underlines, table cells, the ad slot's top edge.
- **Strong Rule** (`{colors.rule-strong}`): The 2px masthead border, and only that.

### Named Rules
**The Region-Scale Rule.** Colour commits at region scale or not at all. Green appears as a full-bleed field or a full-width action; it is never a badge, a tint, a card background, or an accent on a word.

**The Mark-Plus-Word Rule.** Colour never carries meaning alone anywhere in the system. Every status renders a drawn SVG glyph plus its word. On a green field the mark is restated explicitly to the reverse colour, because green on green is invisible.

**The Contrast Guard.** Quiet text stops at Ink Three (`#67717b`), and the binding measurement is **4.59:1 on Ground Two** (`#f4f6f8`) — not the 4.97:1 it reaches on white. Ground Two is the harder ground and the one the category strip and the footer actually use, so a floor checked only against white will pass a value that fails where the label really sits. This matters most in the masthead, whose two lines are separated from the brand by colour alone: lighten the promise line and the trust claim goes with it. This is a floor, not a suggestion.

## Typography

**Display Font:** Archivo (self-hosted)
**Body Font:** Archivo (self-hosted)
**Label/Mono Font:** none — Archivo at `tabular-nums` does the numeric work

**Character:** A single grotesque doing everything. Archivo is wide, plain and legible at small sizes on a cheap panel, which is the whole brief; the variable weight axis (400–700) supplies all the rank the system needs. It ships as two woff2 subsets, 67.6KB total: latin, plus latin-ext carried specifically because ₹ (U+20B9) lives there and salary lines are unreadable without it. The fallback stack ends in `'Noto Sans Devanagari'` so a future Hindi layer does not force a redesign.

### Hierarchy
- **Display** (700, `{typography.display.fontSize}`, 1.15, -0.02em, balanced wrap): The page's one display moment. It appears only as the heading inside a status field. Nothing else on any page uses it.
- **Body** (400, `{typography.body.fontSize}`, 1.45, tabular figures): Everything on a listing surface — row roles, rail values, prose, nav items, the brand mark. This is the one size.
- **Label** (600, same size, 0.08em, uppercase, Ink Three): Micro-labels and key columns. The difference from its own value is case, weight and colour — never scale.
- **Mark** (700, same size, 0.06em, uppercase): The status word beside its glyph. Glyph sized at 0.72em so it optically matches the cap height.
- **Fine** (400, `{typography.fine.fontSize}`, Ink Three): Legal, provenance and the advertisement marker only. Never a listing surface.

### Named Rules
**The One Size Rule.** Every listing surface is set at one size. Rank comes from weight, case, reversal, colour and rule — never from making something bigger. A key and its value are the same size; a label and its content are the same size. Audit test: if a new element needs a third size to read correctly, the hierarchy is wrong, not the scale.

**The Two-Step Reverse Rule.** Type on a status field has exactly two steps: the mark and the display sit at the bright end (`{colors.on-field}`, `{colors.live-on}`), the meta line one step back (`{colors.live-on-2}` on green, `{colors.closed-on-2}` on slate). That gives a reversed field its own internal hierarchy without introducing a second type size — the same device as weight and case elsewhere, applied to a reversed ground. It is the One Size Rule holding under pressure, not being bent. Both back-steps are measured against their own ground rather than white.

**The One Display Moment Rule.** A page gets exactly one display-sized element, and it lives inside the status field. A second display size on a page is a defect, including in the masthead — which is why the promise line is set at body size and ranked by colour instead.

## Layout

A single reading column, `44rem` measure, centred, with a `1.125rem` gutter. Spacing runs on a seven-step scale (`0.25rem` to `3rem`); rows breathe at step 5, sections separate at step 6, and the footer detaches at step 7.

Every key-value rail is a two-column grid with a fixed key column: `minmax(4.5rem, 6.5rem)` then `1fr`. The key column is fixed rather than content-sized on purpose, so the value edge sits in the same place on the homepage, a cluster page and a listing — a long scan never loses its anchor. Row anchors run the same way: the status mark and the posted date sit on a shared baseline rail at the top of every row.

Two breakpoints only. At **46rem** the masthead goes from stacked to a baseline-aligned row, the in-feed ad widens from a 336×100 reservation to 728×90, and the apply block stops being full-width (min 22rem, left-aligned) with its note left-aligning under it. At **64rem** the desktop rail appears: the page becomes a `1fr / 300px` grid at `60rem` max width, and the sticky rail ad's hairline is offset to start level with the first listing rather than above it. Below 64rem the rail is not rendered at all rather than stacked into the reading column.

The category strip scrolls horizontally below 64rem with a right-edge mask fade (so a clipped item reads as "there is more", not as a word cut in half) and wraps with the fade removed above it.

Ad slots reserve fixed heights before the script exists: feed 100px (90px above 46rem), foot 280px, rail 600px, each with a max width matching the eventual unit. Reservations are fixed rather than responsive because `data-full-width-responsive` lets Google choose a height at runtime, which is exactly the shift being designed out. Verified by diffing builds with and without the env vars set: zero layout shift.

### Named Rules
**The Never-Above Rule.** An ad is never placed above the first content block. It interleaves after the first four rows on long lists, sits at the end of content, or lives in the desktop rail. An ad may never be the LCP element or the first thing the visitor meets.

**The Fixed Rail Rule.** The key column is a fixed width, not content-sized. Values must line up across every page type; a rail that resizes to its longest key breaks the scan.

## Elevation & Depth

There are no shadows in this system. Not one `box-shadow` is declared anywhere in the build. Depth is carried entirely by three devices: the 1px hairline, the one tinted band (Ground Two, used by the category strip and the footer), and full-bleed colour fields that read as a layer above the page because they own its whole width. The masthead's 2px strong rule is the single heaviest separation in the world.

### Named Rules
**The Flat Ground Rule.** Surfaces are flat, always. Depth is a rule, a tint band, or a full-bleed field — never a shadow, never a lift, never a border pretending to be one.

**The Hairline Rule.** Separation is one 1px hairline. Rows are separated by it and never boxed by it; the last row in a list drops its border rather than closing the box.

## Shapes

Square. `border-radius` is `0` everywhere in the system with exactly one exception: the focus ring carries a `1px` radius so the 2px green outline does not read as a hard corner artefact at its offset. There are no cards, no pills, no chips, no rounded containers. Form language is the hairline and the filled rectangle: full-bleed status fields, full-width filled actions, hairline-separated rows, hairline-underlined links.

Links are underlined by their `text-decoration-color` at hairline strength and darken to `currentColor` on hover — the underline is always present, only its emphasis changes. Nav items and facet links use a bottom border in place of a text underline so the current item can thicken it to 2px green without shifting the text.

Icons are inline SVG drawn on a 16×16 grid at one stroke weight (2px, square caps). No icon fonts, no glyph characters, no icon library.

## Components

### Status Field
The signature component. A full-bleed band that names the page, its live count and the date checked. Green in the open register, Closed Slate on expired listings and the 404. It carries the page's one display heading at the bright end of the reverse (`{colors.on-field}`) plus a meta row of flex-wrapped facts at body size one step back (`{colors.live-on-2}` on green, `{colors.closed-on-2}` on slate). Padding is `space-5` block; the inner content sits in the standard `.wrap` measure while the background bleeds edge to edge.

### Status Mark
Three authored glyphs on one 16×16 grid at one stroke weight: a filled disc (open), a ring with a clock hand (closing), a ring with a strike (closed). Each renders the glyph plus its word, uppercase, 700, 0.06em, `white-space: nowrap`. On a green or slate field the mark's colour is restated to the field's reverse tone by direct rule.

### Listing Row (Receipt Line)
- **Shape:** No card. A 1px bottom hairline, dropped on the last child. `space-5` block padding.
- **Structure:** A top rail (status mark left, posted date right, shared baseline), then the role line — company at 700, role at 400, both inside one link — then the key-value rail: Batch, Where, Pay, Closes.
- **Closed register:** Company, role and values drop to Ink Two at weight 400. Closed listings stay on the page in a lower register under a "Recently closed" head rather than vanishing; a reader who saw a listing yesterday should learn that it closed, not meet a gap.

### Apply Action
- **Shape:** Square, 3rem min height, full-width on mobile, min 22rem left-aligned above 46rem.
- **Primary:** Green fill, white text, 700, 0.02em, with a 0.8em inline external-link glyph. A fine note under it states where the link goes.
- **Hover:** Fill and border both darken to Press Green (`{colors.live-field-press}`). No transition, no lift.
- **Dead:** Transparent ground, Closed Slate text, hairline border, `aria-disabled="true"`, `not-allowed` cursor. Used for both expired listings and listings that published no application link — each with its own note explaining why.

### Navigation
The category strip sits on Ground Two under a hairline and travels with every page, because most sessions land deep. Built from clusters that actually exist, so it can never point at an empty page; grouped Batch, then Role, then City, separated by a vertical hairline with an uppercase Ink Three group label. Items are 700-weight with a 2px green bottom border when current, transparent otherwise, darkening to Ink on hover. Scrolls with an edge fade below 64rem; wraps with the fade removed above it.

### Ad Slot
A hairline-topped block with a persistent uppercase "Advertisement" marker in fine type at Ink Three — it is small text a reader may specifically need in order to find an ad boundary, so it holds the same contrast floor as every other quiet label rather than fading toward the hairline. The marker stays whether or not the script is live — a reserved box with nothing in it reads as breakage. Height is reserved at the eventual unit's size in all three placements. Manual units only; Auto Ads are ruled out because runtime placement is the instability this component exists to prevent.

### Prose
Body copy at the one size with `space-4` stack rhythm. Section headings inside prose are uppercase 700 at body size with a hairline top rule — they rank by case and rule, not by scale. Tables are borderless except for row hairlines, with the key cell in Ink Three and `nowrap`, and scroll horizontally rather than compressing.

## Do's and Don'ts

### Do:
- **Do** set every listing surface at the one body size (`1rem`) and rank with weight, case, colour, reversal and rule.
- **Do** give each page exactly one display-sized element, inside its status field.
- **Do** ship every status as a drawn glyph plus a word, and restate the mark's colour when it sits on a coloured field.
- **Do** hold quiet text at or above Ink Three (`#67717b`) and check it against Ground Two (4.59:1), not white — including the masthead promise line, which is separated from the line above by colour alone.
- **Do** commit colour at region scale — a full-bleed field or a full-width action.
- **Do** separate with one 1px hairline and drop it on the last item.
- **Do** reserve ad heights at the eventual unit size before the script exists, and keep every ad below the first content block.
- **Do** keep the key column fixed (`6.5rem`) so values line up across page types.
- **Do** draw icons as inline SVG on a 16×16 grid at 2px square-capped stroke.
- **Do** keep the build at zero shipped JavaScript; AdSense is the only third-party script, and only when its env var is set.

### Don't:
- **Don't** introduce a third type size on a listing surface. Fine type is for legal and provenance only.
- **Don't** box a row into a card, and don't add `border-radius` anywhere except the 1px focus ring.
- **Don't** use a shadow. There are none in the system and depth does not need one.
- **Don't** let colour carry a meaning on its own, anywhere, for any state.
- **Don't** place an ad above the first content block, and don't enable Auto Ads or responsive ad heights.
- **Don't** tint green or use it as a badge, chip or accent fill.
- **Don't** hide a closed listing. Demote it to Ink Two at weight 400 and keep its URL.
- **Don't** invent social proof, employer logos, counts or trust badges; none exist to render.

<!-- CEILING: rule weight is an unspent rank axis. `--rule-strong` is declared and used exactly once (the 2px masthead border) while a single 1px hairline does every other separation job. The finish review's judgement was that a graded rule scale is the one thing this world has room for next; it was deliberately not built in this run and is recorded here as headroom, not as a defect. -->
