// Deterministic pre-extraction: everything we can pull out of a source posting
// by rule, so the model never has to guess it.
//
// Pure functions only — no network, no env, no disk. `sourceBase` is passed in
// rather than read from the environment so this is testable in isolation.

export const decode = (s = "") =>
  s
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toText = (html = "") =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );

// A real requisition page should beat a bare careers homepage. The source mixes
// both and sometimes leaves search-redirect junk behind.
const ATS =
  /(greenhouse|lever\.co|ashbyhq|myworkdayjobs|workday|eightfold|oraclecloud|taleo|icims|smartrecruiters|successfactors|keka|darwinbox|zohorecruit|peoplestrong)/i;
const DETAIL = /(jobdetail|job[-_/]?id|requisition|\/job\/|\/jobs\/|\/apply|careers?\/.+)/i;
// Share widgets, not destinations. Two patterns because the short forms share
// no substring with the service they belong to — wa.me is WhatsApp and t.me is
// Telegram, and both were slipping through a name-based filter into the apply
// URL candidates.
const SOCIAL_NAMED =
  /(facebook|twitter|linkedin|whatsapp|telegram|instagram|youtube|pinterest|gravatar|reddit|threads|tumblr)\./i;
const SOCIAL_SHORT =
  /^(x\.com|fb\.com|fb\.me|wa\.me|t\.me|youtu\.be|lnkd\.in|bit\.ly|tinyurl\.com|goo\.gl)$/i;

const isSocial = (host) => SOCIAL_NAMED.test(host) || SOCIAL_SHORT.test(host);

export function scoreApplyUrl(u) {
  let s = 0;
  if (ATS.test(u)) s += 100;
  if (DETAIL.test(u)) s += 40;
  if (/careers?\./i.test(u)) s += 20;
  if (/\?|=/.test(u)) s += 5; // query strings usually mean a specific posting
  try {
    if (new URL(u).pathname.replace(/\/$/, "") === "") s -= 60; // bare homepage
  } catch {}
  return s;
}

/** Strip the tracking parameters the source left on outbound links. */
export function cleanUrl(u) {
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|source$)/i.test(k)) url.searchParams.delete(k);
    }
    return url.toString();
  } catch {
    return u;
  }
}

/** Outbound links, minus the source's own domain and social/sharing noise,
 *  cleaned and ranked best-first. */
export function rankApplyUrls(html = "", sourceBase) {
  const host = new URL(sourceBase).hostname.replace(/^www\./, "");

  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1].replace(/&amp;/g, "&").replace(/&#0?38;/g, "&"))
    .filter((u) => /^https?:\/\//i.test(u))
    .filter((u) => {
      try {
        const h = new URL(u).hostname.replace(/^www\./, "");
        return h !== host && !isSocial(h);
      } catch {
        return false;
      }
    });

  return [...new Set(links)]
    .filter((u) => !/google\.[a-z.]+\/search/i.test(u)) // search-redirect junk
    .map(cleanUrl)
    .sort((a, b) => scoreApplyUrl(b) - scoreApplyUrl(a));
}

/** Batch years mentioned anywhere in the posting, deduped and sorted. */
export const batchYearsIn = (text = "") =>
  [...new Set(text.match(/\b20(1[89]|2[0-9])\b/g) || [])].sort();

/**
 * Reduce a source post to the facts we can establish by rule, plus the plain
 * text the extractor needs. `text` is held in memory only — callers must never
 * persist it (see docs/decisions.md D10).
 */
export function preExtract(post, { sourceBase }) {
  const html = post.content?.rendered || "";
  const title = decode(post.title?.rendered || "");
  const ranked = rankApplyUrls(html, sourceBase);
  const text = toText(html);

  return {
    title,
    candidateApplyUrls: ranked.slice(0, 8),
    bestApplyUrl: ranked.length && scoreApplyUrl(ranked[0]) > 0 ? ranked[0] : null,
    batchYears: batchYearsIn(text),
    text: text.slice(0, 6000),
  };
}
