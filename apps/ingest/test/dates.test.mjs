import test from "node:test";
import assert from "node:assert/strict";
import { parseApplyByDate, toIsoDay } from "../src/lib/dates.mjs";

test("parses the date formats Indian postings actually use", () => {
  const cases = {
    "2026-12-31": "2026-12-31",
    "31/12/2026": "2026-12-31",
    "31-12-2026": "2026-12-31",
    "31.12.2026": "2026-12-31",
    "31 December 2026": "2026-12-31",
    "31st Dec 2026": "2026-12-31",
    "December 31, 2026": "2026-12-31",
    "Last date to apply: 15 Sept 2026": "2026-09-15",
    "1 Jan 2027": "2027-01-01",
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(parseApplyByDate(input), expected, input);
  }
});

test("reads ambiguous numeric dates day-first, the Indian convention", () => {
  assert.equal(parseApplyByDate("03/04/2026"), "2026-04-03");
});

test("falls back to month-first when day-first is impossible", () => {
  // 12/31 cannot be a 31st month, so it was written the American way.
  assert.equal(parseApplyByDate("12/31/2026"), "2026-12-31");
});

test("returns null for the rolling-deadline phrasing the source actually emits", () => {
  // Every one of these appears in, or matches the shape of, live data —
  // not one of the first 8 postings ingested stated a real date.
  for (const input of [
    "ASAP",
    "Rolling Basis (Apply ASAP)",
    "Not specified",
    "Not Mentioned",
    "N/A",
    "NA",
    "None",
    "TBA",
    "Open until filled",
    "Immediate",
    "Ongoing",
  ]) {
    assert.equal(parseApplyByDate(input), null, input);
  }
});

test("returns null rather than guessing", () => {
  for (const input of [null, undefined, "", "   ", "soon", "next month", "apply fast"]) {
    assert.equal(parseApplyByDate(input), null, String(input));
  }
});

test("rejects dates that do not exist in the calendar", () => {
  // Date arithmetic would happily roll 31 Feb forward into March.
  assert.equal(parseApplyByDate("31 February 2026"), null);
  assert.equal(parseApplyByDate("31/02/2026"), null);
  assert.equal(parseApplyByDate("2026-02-30"), null);
  assert.equal(parseApplyByDate("00/01/2026"), null);
});

test("refuses a date with no year instead of inferring one", () => {
  // Guessing the year is how a live posting gets retired twelve months early.
  assert.equal(parseApplyByDate("31 December"), null);
  assert.equal(parseApplyByDate("31/12"), null);
});

test("rejects years outside a plausible range", () => {
  assert.equal(parseApplyByDate("31 December 1999"), null);
  assert.equal(parseApplyByDate("31 December 2200"), null);
});

test("toIsoDay reduces a source timestamp to a calendar day", () => {
  assert.equal(toIsoDay("2026-08-12T10:12:11"), "2026-08-12");
  assert.equal(toIsoDay("2026-08-12"), "2026-08-12");
  assert.equal(toIsoDay(null), null);
  assert.equal(toIsoDay("not a date"), null);
});
