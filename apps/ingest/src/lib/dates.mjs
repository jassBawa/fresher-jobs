// Normalizing the free-text deadline a posting states into a machine date.
//
// The source rarely gives a real date. In practice `lastDateToApply` comes back
// as "ASAP", "Rolling Basis (Apply ASAP)" or null far more often than as
// "31 December 2026" — which is why the site cannot rely on this field alone to
// retire dead listings, and applies a freshness horizon on top of it.
//
// Deliberately conservative: a wrong date is worse than no date in both
// directions — too early retires a live opening, too late leaves a dead link
// indexed. Anything not unambiguously parseable returns null and falls through
// to the horizon rule instead.

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Phrases the source uses to mean "no deadline", not "a date we failed to read".
const ROLLING =
  /^(asap|rolling|immediate|ongoing|continuous|not\s*specified|not\s*mentioned|n\.?\/?a|none|tba|tbd|open\s+until\s+filled)/i;

const pad = (n) => String(n).padStart(2, "0");

/** True only for a date that exists in the calendar — rejects 31 February. */
function isRealDate(y, m, d) {
  if (!(y >= 2000 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

const iso = (y, m, d) => (isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null);

/**
 * Parse a stated deadline into an ISO `YYYY-MM-DD` date, or null when the text
 * carries no unambiguous one.
 *
 * Accepts: 2026-12-31 · 31/12/2026 · 31-12-2026 · 31 December 2026 ·
 *          31st Dec 2026 · December 31, 2026
 *
 * Returns null for: rolling/ASAP phrasing, empty input, and any date without a
 * four-digit year — guessing the year is exactly the kind of error that retires
 * a live posting a year early.
 */
export function parseApplyByDate(raw) {
  if (raw == null) return null;

  const text = String(raw)
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1") // 31st → 31
    .replace(/\s+/g, " ")
    .trim();

  if (!text || ROLLING.test(text) || !/\d/.test(text)) return null;

  // 2026-12-31
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) return iso(+isoMatch[1], +isoMatch[2], +isoMatch[3]);

  // 31/12/2026 — day-first, the Indian convention. If the first number cannot
  // be a day but the second can, it was written month-first; take that instead.
  const numeric = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (numeric) {
    const [, a, b, y] = numeric.map(Number);
    if (a > 12 && b <= 12) return iso(y, b, a);
    if (b > 12 && a <= 12) return iso(y, a, b);
    return iso(y, b, a); // both plausible — day-first
  }

  // 31 december 2026
  const dmy = text.match(/\b(\d{1,2}) ([a-z]{3,9})\.?,? (\d{4})\b/);
  if (dmy && MONTHS[dmy[2]]) return iso(+dmy[3], MONTHS[dmy[2]], +dmy[1]);

  // december 31, 2026
  const mdy = text.match(/\b([a-z]{3,9})\.? (\d{1,2}),? (\d{4})\b/);
  if (mdy && MONTHS[mdy[1]]) return iso(+mdy[3], MONTHS[mdy[1]], +mdy[2]);

  return null;
}

/** The date part of a source timestamp, as ISO `YYYY-MM-DD`. */
export function toIsoDay(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
